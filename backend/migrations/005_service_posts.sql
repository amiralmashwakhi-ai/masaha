-- Service offer posts by providers, with photos and documents, shown on their profile.

create table if not exists service_posts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  service text not null,
  title text not null check (length(btrim(title)) between 1 and 120),
  body text not null default '' check (length(body) <= 2000),
  price_from_fils int check (price_from_fils >= 0),
  governorate text,
  -- [{ "url": ..., "name": ..., "kind": "image" | "document" }]
  attachments jsonb not null default '[]' check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 10),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists service_posts_provider_idx on service_posts (provider_id, created_at desc);
create index if not exists service_posts_feed_idx on service_posts (created_at desc) where active;

alter table service_posts enable row level security;
create policy "posts read" on service_posts for select to authenticated
  using (active or provider_id = (select auth.uid()));
create policy "posts own insert" on service_posts for insert to authenticated
  with check (provider_id = (select auth.uid()));
create policy "posts own update" on service_posts for update to authenticated
  using (provider_id = (select auth.uid())) with check (provider_id = (select auth.uid()));
create policy "posts own delete" on service_posts for delete to authenticated
  using (provider_id = (select auth.uid()));
grant select, insert, update, delete on service_posts to authenticated;

-- Same rule as chat: no numbers in post text, so contact details stay inside Masaha. Prices use their own field.
create or replace function private.strip_post_digits() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.title := btrim(regexp_replace(regexp_replace(new.title, '[0-9٠-٩۰-۹]', '', 'g'), '[ \t]{2,}', ' ', 'g'));
  new.body := btrim(regexp_replace(regexp_replace(new.body, '[0-9٠-٩۰-۹]', '', 'g'), '[ \t]{2,}', ' ', 'g'));
  if new.title = '' then raise exception 'title is empty after removing numbers'; end if;
  return new;
end $$;
create or replace trigger service_posts_strip_digits before insert or update on public.service_posts
  for each row execute function private.strip_post_digits();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', true, 10485760, array[
  'image/jpeg','image/png','image/webp','application/pdf',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

-- Each provider writes only inside their own folder: posts/<user id>/...
create policy "posts files own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "posts files own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- History: a provider can still see jobs they quoted on, even if another provider was chosen.
-- Security definer so the jobs and quotes policies don't call each other in a loop.
create or replace function private.has_quoted(j uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.quotes q where q.job_id = j and q.provider_id = auth.uid());
$$;
create policy "jobs quoted read" on jobs for select to authenticated using (private.has_quoted(id));
grant execute on function private.has_quoted(uuid) to authenticated;
