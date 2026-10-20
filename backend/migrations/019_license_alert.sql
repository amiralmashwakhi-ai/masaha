-- Operators get a bell notification whenever an office uploads a licence for review.
create or replace function public.submit_license(p_path text, p_license_no text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if split_part(p_path, '/', 1) <> auth.uid()::text then raise exception 'not allowed'; end if;
  update providers set license_doc_path = p_path, license_no = nullif(btrim(p_license_no), ''),
    verification_status = 'pending', verified = false
  where id = auth.uid();
  if not found then raise exception 'not a provider'; end if;
  perform private.notify(o.user_id, 'licensePending', null) from operators o;
end $$;
