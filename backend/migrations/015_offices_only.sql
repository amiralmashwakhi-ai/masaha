-- Only licensed surveying offices offer services (Ameer, 2026-10-20): the licence requires an office.
update providers set kind = 'office' where kind <> 'office';
alter table providers alter column kind set default 'office';
