-- Trust and safety before a public launch: operator role, provider licence checks, notifications,
-- report and block, cancel and dispute, terms consent, and account deletion.

-- Operators (Ameer's office) review licences, reports and disputes.
create table if not exists operators (user_id uuid primary key references auth.users(id) on delete cascade);
alter table operators enable row level security;
create policy "operators see themselves" on operators for select to authenticated using (user_id = (select auth.uid()));
grant select on operators to authenticated;

create or replace function private.is_operator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.operators where user_id = auth.uid());
$$;
grant execute on function private.is_operator() to authenticated;

-- Terms consent and account deletion markers.
alter table profiles add column if not exists terms_accepted_at timestamptz;
alter table profiles add column if not exists deleted_at timestamptz;
grant update (terms_accepted_at) on profiles to authenticated;

-- Licence verification: the provider uploads a document to the private "licenses" bucket, the operator reviews it.
alter table providers add column if not exists license_doc_path text;
alter table providers add column if not exists verification_status text not null default 'none'
  check (verification_status in ('none', 'pending', 'verified', 'rejected'));
update providers set verification_status = 'verified' where verified and verification_status = 'none';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('licenses', 'licenses', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;
create policy "licenses own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'licenses' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "licenses own or operator read" on storage.objects for select to authenticated
  using (bucket_id = 'licenses' and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_operator()));

-- Notifications shown in the app's bell. Written only by the server.
create table if not exists notifications (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  job_id uuid references jobs(id) on delete cascade,
  service text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
alter table notifications enable row level security;
create policy "own notifications read" on notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "own notifications mark read" on notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select on notifications to authenticated;
grant update (read_at) on notifications to authenticated;

create or replace function private.notify(p_user uuid, p_kind text, p_job uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, job_id, service)
  select p_user, p_kind, p_job, (select service from public.jobs where id = p_job)
  where p_user is not null and p_user is distinct from auth.uid();
$$;

-- Every logged job event tells the other side.
create or replace function private.on_job_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare j public.jobs; pid uuid;
begin
  select * into j from public.jobs where id = new.job_id;
  select provider_id into pid from public.quotes where id = j.accepted_quote_id;
  if new.kind = 'quote' then
    perform private.notify(j.customer_id, 'newQuote', j.id);
  elsif new.actor_id = j.customer_id then
    perform private.notify(pid, 'jobUpdate', j.id);
  elsif new.actor_id = pid then
    perform private.notify(j.customer_id, 'jobUpdate', j.id);
  else
    -- The operator acted (e.g. resolved a dispute): tell both sides.
    perform private.notify(j.customer_id, 'jobUpdate', j.id);
    perform private.notify(pid, 'jobUpdate', j.id);
  end if;
  return new;
end $$;
create or replace trigger job_event_notify after insert on job_events for each row execute function private.on_job_event();

-- New requests reach providers who offer that service in that governorate (or did not limit them).
create or replace function private.on_job_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, kind, job_id, service)
  select p.id, 'newJob', new.id, new.service from public.providers p
  where p.id <> new.customer_id
    and (cardinality(p.services) = 0 or new.service = any (p.services::text[]))
    and (cardinality(p.governorates) = 0 or new.governorate = any (p.governorates::text[]));
  return new;
end $$;
create or replace trigger job_insert_notify after insert on jobs for each row execute function private.on_job_insert();

create or replace function private.on_chat_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status = 'pending' then
    perform private.notify(case when new.requested_by = new.customer_id then new.provider_id else new.customer_id end, 'chatRequest', new.job_id);
  elsif new.status = 'accepted' and old.status <> 'accepted' then
    perform private.notify(new.requested_by, 'chatAccepted', new.job_id);
  end if;
  return new;
end $$;
create or replace trigger chat_notify after insert or update of status on chats for each row execute function private.on_chat_change();

-- One unread "new messages" note per chat at a time, so a long conversation doesn't flood the bell.
create or replace function private.on_chat_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.chats; other uuid;
begin
  select * into c from public.chats where id = new.chat_id;
  other := case when new.sender_id = c.customer_id then c.provider_id else c.customer_id end;
  if not exists (select 1 from public.notifications n where n.user_id = other and n.kind = 'chatMessage'
                 and n.job_id = c.job_id and n.read_at is null) then
    perform private.notify(other, 'chatMessage', c.job_id);
  end if;
  return new;
end $$;
create or replace trigger chat_message_notify after insert on chat_messages for each row execute function private.on_chat_message();

-- Block: blocked users can't send chat requests or messages to the blocker, and the blocker stops seeing their posts.
create table if not exists blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table blocks enable row level security;
create policy "own blocks" on blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy "own blocks add" on blocks for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "own blocks remove" on blocks for delete to authenticated using (blocker_id = (select auth.uid()));
grant select, insert, delete on blocks to authenticated;

create or replace function private.blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;
grant execute on function private.blocked_between(uuid, uuid) to authenticated;

alter policy "chat messages party send" on chat_messages
  with check (
    sender_id = (select auth.uid())
    and exists (select 1 from chats c where c.id = chat_id and c.status = 'accepted'
                and (select auth.uid()) in (c.customer_id, c.provider_id)
                and not private.blocked_between(c.customer_id, c.provider_id))
  );

-- Reports of posts, chats or people go to the operator.
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_user uuid references auth.users(id) on delete set null,
  post_id uuid references service_posts(id) on delete set null,
  chat_id uuid references chats(id) on delete set null,
  reason text not null check (length(btrim(reason)) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
alter table reports enable row level security;
create policy "reports own insert" on reports for insert to authenticated with check (reporter_id = (select auth.uid()) and status = 'open');
create policy "reports own or operator read" on reports for select to authenticated
  using (reporter_id = (select auth.uid()) or private.is_operator());
grant select, insert on reports to authenticated;

-- Operator actions: review licences, close reports, hide posts.
create or replace function public.submit_license(p_path text, p_license_no text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if split_part(p_path, '/', 1) <> auth.uid()::text then raise exception 'not allowed'; end if;
  update providers set license_doc_path = p_path, license_no = nullif(btrim(p_license_no), ''),
    verification_status = 'pending', verified = false
  where id = auth.uid();
  if not found then raise exception 'not a provider'; end if;
end $$;

create or replace function public.review_provider(p_provider uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.is_operator() then raise exception 'operators only'; end if;
  update providers set verified = p_approve, verification_status = case when p_approve then 'verified' else 'rejected' end
  where id = p_provider;
  insert into notifications (user_id, kind) values (p_provider, case when p_approve then 'verified' else 'rejected' end);
end $$;

create or replace function public.close_report(p_report uuid, p_hide_post boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r reports;
begin
  if not private.is_operator() then raise exception 'operators only'; end if;
  update reports set status = 'closed' where id = p_report returning * into r;
  if p_hide_post and r.post_id is not null then update service_posts set active = false where id = r.post_id; end if;
end $$;

-- Cancel before payment; after payment the money stays in escrow and a dispute goes to the operator.
create or replace function public.cancel_job(p_job uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs;
begin
  select * into j from jobs where id = p_job for update;
  if j.customer_id is distinct from auth.uid() then raise exception 'only the customer can cancel'; end if;
  if j.stage not in ('requested', 'quoted', 'agreed') then raise exception 'cannot cancel after payment, open a dispute'; end if;
  update jobs set stage = 'cancelled' where id = p_job;
  perform public.log_job_event(p_job, 'stage', 'cancelled');
end $$;

alter policy "disputes party insert" on disputes with check (false);
create policy "disputes operator read" on disputes for select to authenticated using (private.is_operator());

create or replace function public.open_dispute(p_job uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs;
begin
  select * into j from jobs where id = p_job for update;
  if not private.is_job_party(p_job) then raise exception 'not allowed'; end if;
  if j.stage not in ('visitScheduled', 'fieldWork', 'drafting', 'submitted') then raise exception 'nothing to dispute'; end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'reason required'; end if;
  insert into disputes (job_id, opened_by, reason) values (p_job, auth.uid(), left(btrim(p_reason), 1000));
  update jobs set stage = 'disputed' where id = p_job;
  perform public.log_job_event(p_job, 'stage', 'dispute opened: ' || left(btrim(p_reason), 200));
end $$;

-- The operator decides: refund the customer what is still held, or release it to the provider.
create or replace function public.resolve_dispute(p_dispute uuid, p_refund boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare d disputes;
begin
  if not private.is_operator() then raise exception 'operators only'; end if;
  update disputes set resolution = coalesce(nullif(btrim(p_note), ''), case when p_refund then 'refunded' else 'released' end),
    closed_at = now() where id = p_dispute and closed_at is null returning * into d;
  if d.id is null then raise exception 'dispute not open'; end if;
  update escrow_milestones set status = case when p_refund then 'refunded'::milestone_status else 'released'::milestone_status end,
    updated_at = now() where job_id = d.job_id and status = 'held';
  update jobs set stage = case when p_refund then 'cancelled'::job_stage else 'done'::job_stage end where id = d.job_id;
  perform public.log_job_event(d.job_id, 'stage', 'dispute resolved: ' || case when p_refund then 'refunded' else 'released' end);
end $$;

-- Operators can read disputed jobs and their records to decide fairly.
create policy "jobs operator read" on jobs for select to authenticated using (private.is_operator());
create policy "events operator read" on job_events for select to authenticated using (private.is_operator());
create policy "quotes operator read" on quotes for select to authenticated using (private.is_operator());

-- Account deletion (required by Google Play). Personal details are erased and sign-in is blocked;
-- job and payment records stay because escrow and disputes need them.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  if exists (select 1 from jobs j left join quotes q on q.id = j.accepted_quote_id
             where (j.customer_id = me or q.provider_id = me)
               and j.stage in ('agreed', 'visitScheduled', 'fieldWork', 'drafting', 'submitted', 'disputed')) then
    raise exception 'active jobs';
  end if;
  update jobs set stage = 'cancelled' where customer_id = me and stage in ('requested', 'quoted');
  update profiles set full_name = 'Deleted user', phone = null, cover_url = null, deleted_at = now() where id = me;
  update providers set display_name = 'Deleted user', license_no = null, license_doc_path = null, cv_education = null,
    cv_experience = '{}', cv_equipment = '{}', cover_url = null, verified = false where id = me;
  -- Content is blanked rather than removed, so job records and disputes keep their shape.
  update service_posts set active = false, title = 'Deleted', body = '', attachments = '[]' where provider_id = me;
  update payment_methods set cliq_alias = null, last4 = null, gateway_token = null, is_default = false where user_id = me;
  update chat_messages set body = 'Deleted' where sender_id = me;
  update auth.users set email = 'deleted+' || me::text || '@masaha.invalid', phone = null,
    raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity' where id = me;
  update auth.identities set identity_data = jsonb_build_object('sub', identity_data->>'sub') where user_id = me;
end $$;

revoke execute on function public.submit_license(text, text), public.review_provider(uuid, boolean),
  public.close_report(uuid, boolean), public.cancel_job(uuid), public.open_dispute(uuid, text),
  public.resolve_dispute(uuid, boolean, text), public.delete_my_account() from public, anon;
grant execute on function public.submit_license(text, text), public.review_provider(uuid, boolean),
  public.close_report(uuid, boolean), public.cancel_job(uuid), public.open_dispute(uuid, text),
  public.resolve_dispute(uuid, boolean, text), public.delete_my_account() to authenticated;

-- Ameer's account is the first operator.
insert into operators (user_id) select id from auth.users where email = 'ameer.msm94@gmail.com' on conflict do nothing;
