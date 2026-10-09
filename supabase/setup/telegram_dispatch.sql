-- Run separately AFTER 0005, Functions and Vault secrets are configured.
-- Enable pg_cron/pg_net/Supabase Vault through Dashboard first.
-- Vault names: an_nam_project_url, an_nam_telegram_worker_secret.
-- Never replace placeholders with secrets in a committed file.
begin;
do $$ begin
  if not exists(select 1 from vault.decrypted_secrets where name='an_nam_project_url')
     or not exists(select 1 from vault.decrypted_secrets where name='an_nam_telegram_worker_secret') then
    raise exception 'Create the two An Nam Vault secrets before running this file';
  end if;
end $$;

create or replace function public.wake_an_nam_telegram() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- INSERT ... ON CONFLICT DO NOTHING can affect zero rows but still fires a
  -- statement trigger. Without this guard calendar polling would wake itself.
  if not exists(select 1 from inserted_telegram_jobs) then return null; end if;
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='an_nam_project_url') || '/functions/v1/telegram-worker',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-telegram-worker-secret',(select decrypted_secret from vault.decrypted_secrets where name='an_nam_telegram_worker_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  return null;
exception when others then
  -- Durable outbox already committed by the transaction; Cron recovers.
  -- Do not make a network-queue outage fail the family data write.
  return null;
end $$;
revoke all on function public.wake_an_nam_telegram() from public,anon,authenticated;
drop trigger if exists wake_an_nam_telegram on public.telegram_jobs;
create trigger wake_an_nam_telegram after insert on public.telegram_jobs
referencing new table as inserted_telegram_jobs
for each statement execute function public.wake_an_nam_telegram();

-- Replace this application's named job only, never other projects' Cron jobs.
select cron.unschedule(jobid) from cron.job where jobname='an-nam-telegram-minute';
select cron.schedule('an-nam-telegram-minute','* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='an_nam_project_url') || '/functions/v1/telegram-worker',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-telegram-worker-secret',(select decrypted_secret from vault.decrypted_secrets where name='an_nam_telegram_worker_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);
commit;
