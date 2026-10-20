-- Chat between a customer and a provider about one job.
-- Either side sends a chat request; messages open once the other side accepts.

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  customer_id uuid not null references profiles(id),
  provider_id uuid not null references profiles(id),
  requested_by uuid not null references profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (job_id, provider_id)
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_chat_idx on chat_messages (chat_id, created_at);

alter table chats enable row level security;
alter table chat_messages enable row level security;

create policy "chats party read" on chats for select to authenticated
  using ((select auth.uid()) in (customer_id, provider_id));

create policy "chat messages party read" on chat_messages for select to authenticated
  using (exists (select 1 from chats c where c.id = chat_id and (select auth.uid()) in (c.customer_id, c.provider_id)));
create policy "chat messages party send" on chat_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (select 1 from chats c where c.id = chat_id and c.status = 'accepted'
                and (select auth.uid()) in (c.customer_id, c.provider_id))
  );

grant select on chats to authenticated;
grant select, insert on chat_messages to authenticated;

-- Customer asks a provider who quoted (or was hired); a provider asks the customer of a job it can see.
create or replace function public.request_chat(p_job uuid, p_provider uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  j jobs;
  cid uuid;
begin
  select * into j from jobs where id = p_job;
  if j.id is null then raise exception 'job not found'; end if;
  if me = j.customer_id then
    if not exists (select 1 from quotes where job_id = p_job and provider_id = p_provider) then
      raise exception 'provider has not quoted on this job';
    end if;
  elsif me = p_provider then
    if not exists (select 1 from providers where id = me) then raise exception 'not a provider'; end if;
    if j.stage not in ('requested', 'quoted') and not exists (
      select 1 from quotes where id = j.accepted_quote_id and provider_id = me) then
      raise exception 'job is not open';
    end if;
  else
    raise exception 'not allowed';
  end if;

  insert into chats (job_id, customer_id, provider_id, requested_by)
  values (p_job, j.customer_id, p_provider, me)
  on conflict (job_id, provider_id) do update
    set status = 'pending', requested_by = excluded.requested_by
    where chats.status = 'declined'
  returning id into cid;
  if cid is null then select id into cid from chats where job_id = p_job and provider_id = p_provider; end if;
  return cid;
end $$;

-- Only the side that did not send the request can accept or decline it.
create or replace function public.respond_chat(p_chat uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update chats set status = case when p_accept then 'accepted' else 'declined' end
  where id = p_chat and status = 'pending' and requested_by <> auth.uid()
    and auth.uid() in (customer_id, provider_id);
  if not found then raise exception 'not allowed'; end if;
end $$;

revoke execute on function public.request_chat(uuid, uuid) from public, anon;
revoke execute on function public.respond_chat(uuid, boolean) from public, anon;
grant execute on function public.request_chat(uuid, uuid) to authenticated;
grant execute on function public.respond_chat(uuid, boolean) to authenticated;

-- Ameer's rule: no numbers in chat, so contact details can't be swapped to skip escrow.
create or replace function private.strip_chat_digits() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Western, Arabic-Indic and Persian digits are all removed so contact numbers can't be shared.
  new.body := btrim(regexp_replace(regexp_replace(new.body, '[0-9٠-٩۰-۹]', '', 'g'), '[ \t]{2,}', ' ', 'g'));
  if new.body = '' then raise exception 'message is empty after removing numbers'; end if;
  return new;
end $$;
create or replace trigger chat_messages_strip_digits before insert or update on public.chat_messages
  for each row execute function private.strip_chat_digits();
