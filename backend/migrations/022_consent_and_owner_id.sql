-- Sign-up consent to the terms, privacy policy and storage outside Jordan (Jordan PDP law 24/2023), with its time.
alter table profiles add column if not exists data_consent_at timestamptz;

create or replace function public.record_consent() returns void
language sql security definer set search_path = public as $$
  update profiles set data_consent_at = now() where id = auth.uid();
$$;

-- ID or passport of the office owner or authorised signatory. Only operators can read it; it is never shown to customers.
create table if not exists provider_identity (
  provider_id uuid primary key references providers(id) on delete cascade,
  doc_path text not null,
  submitted_at timestamptz not null default now()
);
alter table provider_identity enable row level security;
create policy "identity operator read" on provider_identity for select to authenticated using (private.is_operator());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('identity', 'identity', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;
create policy "identity own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'identity' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "identity operator read" on storage.objects for select to authenticated
  using (bucket_id = 'identity' and private.is_operator());

-- The licence and the owner's ID are submitted together (the two-argument version stays for older app builds).
create or replace function public.submit_license(p_path text, p_license_no text, p_id_path text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if split_part(p_path, '/', 1) <> auth.uid()::text or split_part(p_id_path, '/', 1) <> auth.uid()::text then
    raise exception 'not allowed';
  end if;
  update providers set license_doc_path = p_path, license_no = nullif(btrim(p_license_no), ''),
    verification_status = 'pending', verified = false
  where id = auth.uid();
  if not found then raise exception 'not a provider'; end if;
  insert into provider_identity (provider_id, doc_path) values (auth.uid(), p_id_path)
  on conflict (provider_id) do update set doc_path = excluded.doc_path, submitted_at = now();
  perform private.notify(o.user_id, 'licensePending', null) from operators o;
end $$;

revoke execute on function public.submit_license(text, text, text), public.record_consent() from public, anon;
grant execute on function public.submit_license(text, text, text), public.record_consent() to authenticated;
