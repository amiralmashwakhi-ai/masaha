-- In a dispute the two sides talk it through in the job chat, fix the problem, and can then close the
-- dispute amicably: once both agree, the job carries on where it stopped and the held money stays held.

alter table disputes add column if not exists customer_settles boolean not null default false;
alter table disputes add column if not exists provider_settles boolean not null default false;

create or replace function public.open_dispute(p_job uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs; pid uuid;
begin
  select * into j from jobs where id = p_job for update;
  if not private.is_job_party(p_job) then raise exception 'not allowed'; end if;
  if j.stage not in ('visitScheduled', 'fieldWork', 'drafting', 'submitted') then raise exception 'nothing to dispute'; end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'reason required'; end if;
  select provider_id into pid from quotes where id = j.accepted_quote_id;
  insert into disputes (job_id, opened_by, reason, prev_stage) values (p_job, auth.uid(), left(btrim(p_reason), 1000), j.stage);
  update jobs set stage = 'disputed' where id = p_job;
  -- The chat opens for both sides so they can explain and fix the problem.
  insert into chats (job_id, customer_id, provider_id, requested_by, status)
  values (p_job, j.customer_id, pid, auth.uid(), 'accepted')
  on conflict (job_id, provider_id) do update set status = 'accepted';
  perform public.log_job_event(p_job, 'stage', 'dispute opened: ' || left(btrim(p_reason), 200));
end $$;

create or replace function public.settle_dispute(p_job uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare j jobs; d disputes;
begin
  select * into j from jobs where id = p_job for update;
  if auth.uid() = j.customer_id then
    update disputes set customer_settles = true where job_id = p_job and closed_at is null returning * into d;
  elsif private.is_job_party(p_job) then
    update disputes set provider_settles = true where job_id = p_job and closed_at is null returning * into d;
  else
    raise exception 'not allowed';
  end if;
  if d.id is null then raise exception 'dispute not open'; end if;
  if not (d.customer_settles and d.provider_settles) then
    perform public.log_job_event(p_job, 'stage', 'settlement proposed');
    return false;
  end if;
  update disputes set resolution = 'amicable', closed_at = now() where id = d.id;
  update jobs set stage = coalesce(d.prev_stage, 'drafting') where id = p_job;
  perform public.log_job_event(p_job, 'stage', 'dispute settled amicably');
  return true;
end $$;

revoke all on function public.settle_dispute(uuid) from public, anon;
grant execute on function public.settle_dispute(uuid) to authenticated;
