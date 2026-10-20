-- Ameer's decisions (2026-10-20): phone numbers show to both sides once the money is held, and the
-- final payment releases itself 5 days after delivery if the customer neither releases nor disputes.

-- Both sides' phone numbers, only for a party and only once payment is held in escrow.
create or replace function public.job_contacts(p_job uuid)
returns table (customer_phone text, provider_phone text)
language plpgsql security definer set search_path = public as $$
declare j jobs; pid uuid;
begin
  select * into j from jobs where id = p_job;
  if not private.is_job_party(p_job) then raise exception 'not allowed'; end if;
  if j.stage in ('requested', 'quoted', 'agreed', 'cancelled')
     or not exists (select 1 from escrow_milestones where job_id = p_job and status in ('held', 'released')) then
    raise exception 'not paid yet';
  end if;
  select provider_id into pid from quotes where id = j.accepted_quote_id;
  return query select (select phone from profiles where id = j.customer_id), (select phone from profiles where id = pid);
end $$;
revoke all on function public.job_contacts(uuid) from public, anon;
grant execute on function public.job_contacts(uuid) to authenticated;

-- Final payment releases itself 5 days after delivery, unless a dispute is open.
create or replace function private.auto_release() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  for r in
    select j.id, m.amount_fils from jobs j
    join escrow_milestones m on m.job_id = j.id and m.key = 'delivery' and m.status = 'held'
    where j.stage = 'submitted'
      and not exists (select 1 from disputes d where d.job_id = j.id and d.closed_at is null)
      and (select max(e.at) from job_events e where e.job_id = j.id and e.body = 'submitted') < now() - interval '5 days'
  loop
    update escrow_milestones set status = 'released', updated_at = now() where job_id = r.id and key = 'delivery' and status = 'held';
    update jobs set stage = 'done' where id = r.id;
    insert into job_events (job_id, actor_id, kind, body)
      -- Logged as Masaha's office (actor_id is required).
      values (r.id, (select user_id from operators limit 1), 'payment', 'auto released ' || private.jod(r.amount_fils) || ' JOD after 5 days');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function private.auto_release() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('masaha-auto-release', '17 * * * *', 'select private.auto_release()');
