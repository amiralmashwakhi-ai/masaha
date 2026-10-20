-- "Other service": the customer names a service that is not in the list; every surveyor in that
-- governorate hears about it.

alter table jobs add column if not exists custom_service text check (length(btrim(custom_service)) between 1 and 120);
alter table jobs add constraint jobs_other_named check (service <> 'other' or custom_service is not null);

create or replace function private.on_job_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, kind, job_id, service)
  select p.id, 'newJob', new.id, new.service from public.providers p
  where p.id <> new.customer_id
    and (new.service = 'other' or cardinality(p.services) = 0 or new.service = any (p.services::text[]))
    and (cardinality(p.governorates) = 0 or new.governorate = any (p.governorates::text[]));
  return new;
end $$;
