-- ============================================================
-- Delete demo (anonymous) accounts older than 24 hours, every hour.
-- Deleting the auth user cascades to their profile, their copied
-- songs, and every comment they wrote. Shared audio files are
-- untouched because the copies only point at them.
-- ============================================================
create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.cleanup_demo_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from auth.users
  where is_anonymous
    and created_at < now() - interval '24 hours';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke execute on function public.cleanup_demo_accounts() from public, anon, authenticated;

select cron.schedule(
  'cleanup-demo-accounts',
  '0 * * * *',
  $$select public.cleanup_demo_accounts()$$
);
