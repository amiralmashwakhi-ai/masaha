-- A customer can request a service straight from a surveyor's page: only that surveyor sees,
-- is notified about and can quote on the request.

alter table jobs add column if not exists invited_provider_id uuid references providers(id);

alter policy "jobs open feed" on jobs using (
  stage = any (array['requested'::job_stage, 'quoted'::job_stage])
  and exists (select 1 from providers p where p.id = (select auth.uid()))
  and (invited_provider_id is null or invited_provider_id = (select auth.uid())));

alter policy "quotes provider insert" on quotes with check (
  provider_id = (select auth.uid())
  and exists (select 1 from jobs where jobs.id = quotes.job_id
              and jobs.stage = any (array['requested'::job_stage, 'quoted'::job_stage])
              and (jobs.invited_provider_id is null or jobs.invited_provider_id = (select auth.uid()))));

create or replace function private.on_job_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.invited_provider_id is not null then
    perform private.notify(new.invited_provider_id, 'directRequest', new.id);
    return new;
  end if;
  insert into public.notifications (user_id, kind, job_id, service)
  select p.id, 'newJob', new.id, new.service from public.providers p
  where p.id <> new.customer_id
    and (new.service = 'other' or cardinality(p.services) = 0 or new.service = any (p.services::text[]))
    and (cardinality(p.governorates) = 0 or new.governorate = any (p.governorates::text[]));
  return new;
end $$;
