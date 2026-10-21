-- Names of other members for request and offer cards. Profiles stay private (phone etc.);
-- this exposes only the name and join date to signed-in users.
create or replace function public.public_profiles(p_ids uuid[]) returns table (id uuid, full_name text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.created_at from public.profiles p
  where p.id = any (p_ids) and p.deleted_at is null and auth.uid() is not null;
$$;
revoke execute on function public.public_profiles(uuid[]) from public, anon;
grant execute on function public.public_profiles(uuid[]) to authenticated;
