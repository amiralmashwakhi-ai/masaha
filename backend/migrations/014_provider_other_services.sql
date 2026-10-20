-- Surveyors can list services that are not in the app's list, in their own words.
alter table providers add column if not exists other_services text check (length(other_services) <= 300);
grant update (other_services) on providers to authenticated;
