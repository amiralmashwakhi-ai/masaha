-- Daily question counter for the AI assistant, written only by the assistant server function.
create table if not exists assistant_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, day)
);
alter table assistant_usage enable row level security;

-- Returns the new count, or null when the user has reached today's limit.
create or replace function public.use_assistant_quota(p_user uuid, p_limit int) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into assistant_usage (user_id, day, count) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = assistant_usage.count + 1
    where assistant_usage.count < p_limit
  returning count into n;
  return n;
end $$;
revoke execute on function public.use_assistant_quota(uuid, int) from public, anon, authenticated;
grant execute on function public.use_assistant_quota(uuid, int) to service_role;
