-- Masaha database schema for Supabase. Applied to project "masaha" as migration init_masaha_schema.
-- Money is stored in fils (1 JOD = 1000 fils) to avoid rounding errors.

create type user_role as enum ('customer', 'provider', 'admin');
create type provider_kind as enum ('individual', 'office');
create type job_stage as enum ('requested','quoted','agreed','visitScheduled','fieldWork','drafting','submitted','done','cancelled','disputed');
create type milestone_status as enum ('pending','held','released','refunded');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  full_name text not null,
  phone text,                          -- only visible to its owner; shared with the other side by the app after signing
  national_id_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table providers (
  id uuid primary key references profiles(id) on delete cascade,
  kind provider_kind not null,
  display_name text not null,
  license_no text,
  verified boolean not null default false,   -- set by Masaha admins only
  experience_years int not null default 0,
  cv_education text,
  cv_experience text[] not null default '{}',
  cv_equipment text[] not null default '{}',
  cv_file_path text,
  services text[] not null default '{}',
  governorates text[] not null default '{}'
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id),
  service text not null,
  governorate text not null,
  directorate text,
  village text,
  basin text,
  plot_number text,
  area_m2 numeric,
  notes text,
  stage job_stage not null default 'requested',
  accepted_quote_id uuid,
  created_at timestamptz not null default now()
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  provider_id uuid not null references providers(id),
  price_fils bigint not null check (price_fils > 0),
  days int not null check (days > 0),
  scope text not null,
  call_out_fee_fils bigint not null default 0,
  valid_until date,
  created_at timestamptz not null default now(),
  unique (job_id, provider_id)
);

alter table jobs add constraint jobs_accepted_quote_fk foreign key (accepted_quote_id) references quotes(id);

create table agreements (
  job_id uuid primary key references jobs(id) on delete cascade,
  quote_id uuid not null references quotes(id),
  terms jsonb not null,
  commission_rate numeric(5,4) not null default 0.1,
  customer_signed_at timestamptz,
  provider_signed_at timestamptz
);

create table change_orders (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  description text not null,
  extra_fils bigint not null default 0,
  approved_by_customer_at timestamptz,
  created_at timestamptz not null default now()
);

-- Written only by the server (payment webhook) with the service role.
create table escrow_milestones (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  key text not null check (key in ('fieldWork','delivery')),
  share numeric(4,3) not null,
  amount_fils bigint not null,
  status milestone_status not null default 'pending',
  gateway_ref text,
  updated_at timestamptz not null default now(),
  unique (job_id, key)
);

-- Append-only log of everything that happened on a job; the evidence for disputes.
create table job_events (
  id bigserial primary key,
  job_id uuid not null references jobs(id) on delete cascade,
  actor_id uuid not null references profiles(id),
  kind text not null check (kind in ('message','quote','changeOrder','stage','file','payment')),
  body text not null,
  file_path text,
  at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  author_id uuid not null references profiles(id),
  subject_id uuid not null references profiles(id),
  stars int not null check (stars between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  unique (job_id, author_id)
);

create table disputes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  opened_by uuid not null references profiles(id),
  reason text not null,
  resolution text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create index on jobs (customer_id);
create index on jobs (stage, governorate);
create index on quotes (job_id);
create index on quotes (provider_id);
create index on job_events (job_id, at);
create index on reviews (subject_id);
create index on disputes (job_id);
create index on change_orders (job_id);

-- True when the current user is the job's customer or the provider whose quote was accepted.
create function public.is_job_party(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from jobs
    left join quotes q on q.id = jobs.accepted_quote_id
    where jobs.id = j and (jobs.customer_id = auth.uid() or q.provider_id = auth.uid())
  );
$$;

alter table profiles enable row level security;
alter table providers enable row level security;
alter table jobs enable row level security;
alter table quotes enable row level security;
alter table agreements enable row level security;
alter table change_orders enable row level security;
alter table escrow_milestones enable row level security;
alter table job_events enable row level security;
alter table reviews enable row level security;
alter table disputes enable row level security;

create policy "own profile read" on profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile insert" on profiles for insert to authenticated with check (id = (select auth.uid()) and role <> 'admin' and not national_id_verified);
create policy "own profile update" on profiles for update to authenticated using (id = (select auth.uid()));
revoke update (role, national_id_verified) on profiles from authenticated;

create policy "providers public read" on providers for select to authenticated using (true);
create policy "own provider insert" on providers for insert to authenticated with check (id = (select auth.uid()) and not verified);
create policy "own provider update" on providers for update to authenticated using (id = (select auth.uid()));
revoke update (verified) on providers from authenticated;

create policy "jobs customer read" on jobs for select to authenticated using (customer_id = (select auth.uid()));
create policy "jobs open feed" on jobs for select to authenticated
  using (stage in ('requested','quoted') and exists (select 1 from providers p where p.id = (select auth.uid())));
create policy "jobs party read" on jobs for select to authenticated using (public.is_job_party(id));
create policy "jobs customer insert" on jobs for insert to authenticated
  with check (customer_id = (select auth.uid()) and stage = 'requested' and accepted_quote_id is null);
create policy "jobs customer update" on jobs for update to authenticated using (customer_id = (select auth.uid()));

create policy "quotes read" on quotes for select to authenticated
  using (provider_id = (select auth.uid()) or exists (select 1 from jobs where jobs.id = job_id and jobs.customer_id = (select auth.uid())));
create policy "quotes provider insert" on quotes for insert to authenticated
  with check (provider_id = (select auth.uid()) and exists (select 1 from jobs where jobs.id = job_id and jobs.stage in ('requested','quoted')));

create policy "agreements party read" on agreements for select to authenticated using (public.is_job_party(job_id));
create policy "change orders party read" on change_orders for select to authenticated using (public.is_job_party(job_id));
create policy "change orders party insert" on change_orders for insert to authenticated
  with check (public.is_job_party(job_id) and approved_by_customer_at is null);
create policy "milestones party read" on escrow_milestones for select to authenticated using (public.is_job_party(job_id));

create policy "events party read" on job_events for select to authenticated using (public.is_job_party(job_id));
create policy "events party insert" on job_events for insert to authenticated
  with check (actor_id = (select auth.uid()) and public.is_job_party(job_id));

create policy "reviews public read" on reviews for select to authenticated using (true);
create policy "reviews party insert" on reviews for insert to authenticated
  with check (author_id = (select auth.uid()) and subject_id <> author_id and public.is_job_party(job_id)
    and exists (select 1 from jobs where jobs.id = job_id and jobs.stage = 'done'));

create policy "disputes party read" on disputes for select to authenticated using (public.is_job_party(job_id));
create policy "disputes party insert" on disputes for insert to authenticated
  with check (opened_by = (select auth.uid()) and public.is_job_party(job_id));
