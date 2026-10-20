-- An office can show services or quote only after Masaha verifies its licence (Ameer, 2026-10-20).
create or replace function private.is_verified_provider(p_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select verified from public.providers where id = p_id), false)
$$;
grant execute on function private.is_verified_provider(uuid) to authenticated;

alter policy "jobs open feed" on jobs using (
  stage = any (array['requested'::job_stage, 'quoted'::job_stage])
  and (select private.is_verified_provider())
  and (invited_provider_id is null or invited_provider_id = (select auth.uid())));

alter policy "jobs customer insert" on jobs with check (
  customer_id = (select auth.uid()) and stage = 'requested'::job_stage and accepted_quote_id is null
  and (invited_provider_id is null or private.is_verified_provider(invited_provider_id)));

alter policy "quotes provider insert" on quotes with check (
  provider_id = (select auth.uid())
  and (select private.is_verified_provider())
  and exists (select 1 from jobs where jobs.id = quotes.job_id
              and jobs.stage = any (array['requested'::job_stage, 'quoted'::job_stage])
              and (jobs.invited_provider_id is null or jobs.invited_provider_id = (select auth.uid()))));

alter policy "posts own insert" on service_posts with check (
  provider_id = (select auth.uid()) and (select private.is_verified_provider()));
alter policy "posts own update" on service_posts
  using (provider_id = (select auth.uid()))
  with check (provider_id = (select auth.uid()) and (select private.is_verified_provider()));
alter policy "posts read" on service_posts using (
  provider_id = (select auth.uid()) or (active and private.is_verified_provider(provider_id)));

create or replace function private.on_job_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.invited_provider_id is not null then
    perform private.notify(new.invited_provider_id, 'directRequest', new.id);
    return new;
  end if;
  insert into public.notifications (user_id, kind, job_id, service)
  select p.id, 'newJob', new.id, new.service from public.providers p
  where p.id <> new.customer_id and p.verified
    and (new.service = 'other' or cardinality(p.services) = 0 or new.service = any (p.services::text[]))
    and (cardinality(p.governorates) = 0 or new.governorate = any (p.governorates::text[]));
  return new;
end $$;
