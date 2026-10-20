-- Signed and stamped deliverables (the reference in disputes), staking visit length, and whole-number amounts in the job log.

-- Staking: how long each visit takes; priced differently.
alter table jobs add column if not exists visit_length text check (visit_length in ('upTo2h', 'upTo4h', 'fullDay'));
-- Staking with or without a written report.
alter table jobs add column if not exists with_report boolean;

-- Deliverables: files the provider uploads, confirmed as officially signed and stamped.
create table if not exists job_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  uploader_id uuid not null references auth.users(id),
  path text not null unique,
  name text not null,
  mime text not null,
  signed_stamped boolean not null check (signed_stamped),
  created_at timestamptz not null default now()
);
create index if not exists job_files_job_idx on job_files (job_id);
alter table job_files enable row level security;
create policy "job files party read" on job_files for select to authenticated
  using (private.is_job_party(job_id) or private.is_operator());
create policy "job files provider insert" on job_files for insert to authenticated
  with check (uploader_id = (select auth.uid())
    and exists (select 1 from jobs j join quotes q on q.id = j.accepted_quote_id
                where j.id = job_files.job_id and q.provider_id = (select auth.uid())
                  and j.stage in ('drafting', 'submitted', 'disputed')));
grant select, insert on job_files to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('deliverables', 'deliverables', false, 20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Path is <job id>/<file>; the job's provider uploads, parties and operators read.
create policy "deliverables provider upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'deliverables' and exists (
    select 1 from public.jobs j join public.quotes q on q.id = j.accepted_quote_id
    where j.id::text = (storage.foldername(name))[1] and q.provider_id = (select auth.uid())));
create policy "deliverables party read" on storage.objects for select to authenticated
  using (bucket_id = 'deliverables' and exists (
    select 1 from public.jobs j where j.id::text = (storage.foldername(name))[1]
      and (private.is_job_party(j.id) or private.is_operator())));

-- Whole JOD amounts print without decimals ("250 JOD", "87.5 JOD").
create or replace function private.jod(fils bigint) returns text language sql immutable as $$
  select trim_scale(round(fils / 1000.0, 3))::text
$$;

create or replace function private.on_quote_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update jobs set stage = 'quoted' where id = new.job_id and stage = 'requested';
  insert into job_events (job_id, actor_id, kind, body)
    values (new.job_id, new.provider_id, 'quote', private.jod(new.price_fils) || ' JOD / ' || new.days || ' days');
  return new;
end $$;

-- Delivery needs at least one signed and stamped file.
create or replace function public.advance_stage(p_job uuid) returns job_stage
language plpgsql security definer set search_path = public as $$
declare j jobs; pid uuid; nxt job_stage;
begin
  select * into j from jobs where id = p_job for update;
  select provider_id into pid from quotes where id = j.accepted_quote_id;
  if auth.uid() is distinct from pid then raise exception 'only the provider can update progress'; end if;
  nxt := case j.stage when 'visitScheduled' then 'fieldWork'::job_stage when 'drafting' then 'submitted'::job_stage end;
  if nxt is null then raise exception 'nothing to advance'; end if;
  -- Staking without a report has no written output; everything else needs a fresh signed file
  -- (after a correction, a newly uploaded one).
  if nxt = 'submitted' and not (j.service = 'staking' and j.with_report is false) and not exists (
    select 1 from job_files f where f.job_id = p_job and f.created_at > coalesce(
      (select max(e.at) from job_events e where e.job_id = p_job and e.body like 'correction requested:%'), '-infinity')) then
    raise exception 'deliverables required';
  end if;
  update jobs set stage = nxt where id = p_job;
  perform public.log_job_event(p_job, 'stage', nxt::text);
  return nxt;
end $$;

create or replace function public.release_milestone(p_job uuid, p_key text) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs; m escrow_milestones;
begin
  select * into j from jobs where id = p_job for update;
  if j.customer_id is distinct from auth.uid() then raise exception 'only the customer can release'; end if;
  update escrow_milestones set status = 'released', updated_at = now()
    where job_id = p_job and key = p_key and status = 'held' returning * into m;
  if m.id is null then raise exception 'milestone is not held'; end if;
  update jobs set stage = case p_key when 'fieldWork' then 'drafting'::job_stage else 'done'::job_stage end where id = p_job;
  perform public.log_job_event(p_job, 'payment', 'released ' || private.jod(m.amount_fils) || ' JOD (' || p_key || ')');
end $$;

-- Disputes can end in a correction: Masaha explains the problem to both sides, and the job goes back
-- to work with the held money still held.
alter table disputes add column if not exists prev_stage job_stage;

create or replace function public.open_dispute(p_job uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs;
begin
  select * into j from jobs where id = p_job for update;
  if not private.is_job_party(p_job) then raise exception 'not allowed'; end if;
  if j.stage not in ('visitScheduled', 'fieldWork', 'drafting', 'submitted') then raise exception 'nothing to dispute'; end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'reason required'; end if;
  insert into disputes (job_id, opened_by, reason, prev_stage) values (p_job, auth.uid(), left(btrim(p_reason), 1000), j.stage);
  update jobs set stage = 'disputed' where id = p_job;
  perform public.log_job_event(p_job, 'stage', 'dispute opened: ' || left(btrim(p_reason), 200));
end $$;

create or replace function public.request_correction(p_dispute uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare d disputes;
begin
  if not private.is_operator() then raise exception 'operators only'; end if;
  if length(btrim(coalesce(p_note, ''))) = 0 then raise exception 'note required'; end if;
  update disputes set resolution = 'correction: ' || left(btrim(p_note), 1000), closed_at = now()
    where id = p_dispute and closed_at is null returning * into d;
  if d.id is null then raise exception 'dispute not open'; end if;
  -- Submitted work goes back to drafting so corrected, signed files are uploaded again.
  update jobs set stage = case when d.prev_stage in ('submitted', 'drafting') or d.prev_stage is null then 'drafting'::job_stage
                               else d.prev_stage end where id = d.job_id;
  perform public.log_job_event(d.job_id, 'stage', 'correction requested: ' || left(btrim(p_note), 1000));
end $$;
revoke all on function public.request_correction(uuid, text) from public, anon;
grant execute on function public.request_correction(uuid, text) to authenticated;

-- Existing log lines: drop the trailing zeros.
update job_events set body = regexp_replace(body, '(\d+)\.(\d*[1-9])?0+ JOD', '\1.\2 JOD', 'g') where body ~ '\d+\.\d*0+ JOD';
update job_events set body = replace(body, '. JOD', ' JOD') where body like '%. JOD%';
