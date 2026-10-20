-- Cover photos, and saved payment methods (no card numbers are stored: cards will be tokenised by HyperPay).

alter table profiles add column if not exists cover_url text;
alter table providers add column if not exists cover_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Each user writes only inside their own folder: covers/<user id>/...
create policy "covers own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "covers own update" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text);

create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('cliq','visa','mastercard')),
  cliq_alias text,                 -- CliQ alias or mobile number, for paying or receiving payouts
  last4 text,                      -- cards only, filled from the gateway, never typed by the user
  gateway_token text,              -- HyperPay registration id, never the card number
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  check (kind <> 'cliq' or cliq_alias is not null)
);
create index if not exists payment_methods_user on payment_methods (user_id);
alter table payment_methods enable row level security;
create policy "own methods read" on payment_methods for select to authenticated using (user_id = (select auth.uid()));
create policy "own cliq insert" on payment_methods for insert to authenticated
  with check (user_id = (select auth.uid()) and kind = 'cliq' and gateway_token is null and last4 is null);
create policy "own methods update" on payment_methods for update to authenticated using (user_id = (select auth.uid()));
create policy "own methods remove" on payment_methods for delete to authenticated using (user_id = (select auth.uid()));
create policy "own methods delete" on payment_methods for delete to authenticated using (user_id = (select auth.uid()));

-- Column-level revokes do nothing while a table-level UPDATE grant exists, so grant only the editable columns.
revoke update on payment_methods from authenticated;
grant update (cliq_alias, is_default) on payment_methods to authenticated;
revoke update on profiles from authenticated;
grant update (full_name, phone, cover_url) on profiles to authenticated;
revoke update on providers from authenticated;
grant update (display_name, kind, license_no, experience_years, cv_education, cv_experience, cv_equipment,
  cv_file_path, services, governorates, cover_url) on providers to authenticated;
