-- Several services requested together for the same plot share one project id.
-- Each service stays its own job (own quotes, agreement and escrow).
alter table jobs add column if not exists project_id uuid;
create index if not exists jobs_project_idx on jobs (project_id) where project_id is not null;
