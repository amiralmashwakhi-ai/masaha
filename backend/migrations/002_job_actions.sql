-- Job state changes go through these functions so each side can only do its own steps.
-- They are SECURITY DEFINER and check the caller themselves.

create table if not exists app_settings (key text primary key, value text not null);
alter table app_settings enable row level security;
insert into app_settings values ('payments_mode', 'mock') on conflict do nothing;

-- Customers may no longer change jobs directly (policy kept but disabled).
alter policy "jobs customer update" on jobs using (false);

create or replace function public.log_job_event(j uuid, k text, b text) returns void
language sql security definer set search_path = public as $$
  insert into job_events (job_id, actor_id, kind, body) values (j, auth.uid(), k, b);
$$;
revoke all on function public.log_job_event(uuid, text, text) from public, anon, authenticated;

-- A first quote moves the job to "quoted".
create or replace function private.on_quote_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update jobs set stage = 'quoted' where id = new.job_id and stage = 'requested';
  insert into job_events (job_id, actor_id, kind, body)
    values (new.job_id, new.provider_id, 'quote', (new.price_fils / 1000.0)::text || ' JOD / ' || new.days || ' days');
  return new;
end $$;
create or replace trigger quote_inserted after insert on quotes for each row execute function private.on_quote_insert();

create or replace function public.accept_quote(p_quote uuid) returns void
language plpgsql security definer set search_path = public as $$
declare q quotes; j jobs; rate numeric := 0.1;
begin
  select * into q from quotes where id = p_quote;
  select * into j from jobs where id = q.job_id for update;
  if j.customer_id is distinct from auth.uid() then raise exception 'not your job'; end if;
  if j.stage not in ('requested','quoted') or j.accepted_quote_id is not null then raise exception 'quote already accepted'; end if;
  update jobs set accepted_quote_id = q.id where id = j.id;
  insert into agreements (job_id, quote_id, terms, commission_rate)
    values (j.id, q.id, jsonb_build_object('price_fils', q.price_fils, 'days', q.days, 'scope', q.scope,
      'call_out_fee_fils', q.call_out_fee_fils, 'service', j.service), rate);
  insert into escrow_milestones (job_id, key, share, amount_fils) values
    (j.id, 'fieldWork', 0.3, round(q.price_fils * 0.3)),
    (j.id, 'delivery', 0.7, q.price_fils - round(q.price_fils * 0.3));
  perform public.log_job_event(j.id, 'stage', 'quote accepted');
end $$;

create or replace function public.sign_agreement(p_job uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs; pid uuid; a agreements;
begin
  select * into j from jobs where id = p_job for update;
  select provider_id into pid from quotes where id = j.accepted_quote_id;
  if auth.uid() = j.customer_id then
    update agreements set customer_signed_at = coalesce(customer_signed_at, now()) where job_id = p_job returning * into a;
  elsif auth.uid() = pid then
    update agreements set provider_signed_at = coalesce(provider_signed_at, now()) where job_id = p_job returning * into a;
  else
    raise exception 'not a party to this job';
  end if;
  perform public.log_job_event(p_job, 'stage', 'agreement signed');
  if a.customer_signed_at is not null and a.provider_signed_at is not null then
    update jobs set stage = 'agreed' where id = p_job;
  end if;
end $$;

-- Placeholder until the HyperPay webhook exists; only works while payments_mode = 'mock'.
create or replace function public.mock_pay_escrow(p_job uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs;
begin
  if (select value from app_settings where key = 'payments_mode') <> 'mock' then raise exception 'mock payments are off'; end if;
  select * into j from jobs where id = p_job for update;
  if j.customer_id is distinct from auth.uid() or j.stage <> 'agreed' then raise exception 'cannot pay now'; end if;
  update escrow_milestones set status = 'held', gateway_ref = 'MOCK', updated_at = now() where job_id = p_job and status = 'pending';
  update jobs set stage = 'visitScheduled' where id = p_job;
  perform public.log_job_event(p_job, 'payment', 'paid into escrow (mock)');
end $$;

-- Provider reports progress in order.
create or replace function public.advance_stage(p_job uuid) returns job_stage
language plpgsql security definer set search_path = public as $$
declare j jobs; pid uuid; nxt job_stage;
begin
  select * into j from jobs where id = p_job for update;
  select provider_id into pid from quotes where id = j.accepted_quote_id;
  if auth.uid() is distinct from pid then raise exception 'only the provider can update progress'; end if;
  nxt := case j.stage when 'visitScheduled' then 'fieldWork'::job_stage when 'drafting' then 'submitted'::job_stage end;
  if nxt is null then raise exception 'nothing to advance'; end if;
  update jobs set stage = nxt where id = p_job;
  perform public.log_job_event(p_job, 'stage', nxt::text);
  return nxt;
end $$;

-- Customer releases a held milestone; payout itself happens in the payment provider.
create or replace function public.release_milestone(p_job uuid, p_key text) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs; m escrow_milestones;
begin
  select * into j from jobs where id = p_job for update;
  if j.customer_id is distinct from auth.uid() then raise exception 'only the customer can release'; end if;
  update escrow_milestones set status = 'released', updated_at = now()
    where job_id = p_job and key = p_key and status = 'held' returning * into m;
  if m.id is null then raise exception 'milestone is not held'; end if;
  update jobs set stage = case p_key when 'fieldWork' then 'drafting'::job_stage else 'done'::job_stage end where id = p_job;
  perform public.log_job_event(p_job, 'payment', 'released ' || (m.amount_fils / 1000.0)::text || ' JOD (' || p_key || ')');
end $$;

revoke all on function public.accept_quote(uuid), public.sign_agreement(uuid), public.mock_pay_escrow(uuid),
  public.advance_stage(uuid), public.release_milestone(uuid, text) from public, anon;
grant execute on function public.accept_quote(uuid), public.sign_agreement(uuid), public.mock_pay_escrow(uuid),
  public.advance_stage(uuid), public.release_milestone(uuid, text) to authenticated;
