-- Customers can delete requests that never went ahead; either side can withdraw a signature,
-- but only until 3 minutes after both have signed (and never after payment).

alter table jobs add column if not exists deleted_at timestamptz;

create or replace function public.delete_job(p_job uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs;
begin
  select * into j from jobs where id = p_job for update;
  if j.customer_id is distinct from auth.uid() then raise exception 'only the customer can delete'; end if;
  if j.stage not in ('requested', 'quoted', 'cancelled') then raise exception 'job already under way'; end if;
  update jobs set deleted_at = now(), stage = 'cancelled' where id = p_job and deleted_at is null;
end $$;

create or replace function public.unsign_agreement(p_job uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs; pid uuid; a agreements;
begin
  select * into j from jobs where id = p_job for update;
  select provider_id into pid from quotes where id = j.accepted_quote_id;
  select * into a from agreements where job_id = p_job;
  if j.stage not in ('quoted', 'agreed') or exists (select 1 from escrow_milestones where job_id = p_job and status <> 'pending') then
    raise exception 'already paid';
  end if;
  if a.customer_signed_at is not null and a.provider_signed_at is not null
     and greatest(a.customer_signed_at, a.provider_signed_at) < now() - interval '3 minutes' then
    raise exception 'too late to withdraw';
  end if;
  if auth.uid() = j.customer_id then
    update agreements set customer_signed_at = null where job_id = p_job and customer_signed_at is not null returning * into a;
  elsif auth.uid() = pid then
    update agreements set provider_signed_at = null where job_id = p_job and provider_signed_at is not null returning * into a;
  else
    raise exception 'not a party to this job';
  end if;
  if a.job_id is null then raise exception 'not signed'; end if;
  update jobs set stage = 'quoted' where id = p_job and stage = 'agreed';
  perform public.log_job_event(p_job, 'stage', 'signature withdrawn');
end $$;

revoke all on function public.delete_job(uuid), public.unsign_agreement(uuid) from public, anon;
grant execute on function public.delete_job(uuid), public.unsign_agreement(uuid) to authenticated;
