-- Durable chat notifications: committed in the same transaction as the message.
-- Deploy dispatch-push and configure the webhook/cron described in PUSH_NOTIFICATIONS.md.
begin;
create table public.chat_push_jobs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  message_id text unique references public.family_messages(id) on delete cascade,
  kind text not null default 'message' check (kind in ('message','test')),
  state text not null default 'pending' check (state in ('pending','processing','submitted','failed','expired')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  lease_id uuid,
  last_error text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index chat_push_pending on public.chat_push_jobs(next_attempt_at) where state in ('pending','processing');
create table public.chat_push_deliveries (
  job_id uuid not null references public.chat_push_jobs(id) on delete cascade,
  token_id uuid not null references public.push_tokens(id) on delete cascade,
  state text not null check (state in ('ticket','provider_accepted','retry','failed')),
  ticket_id text,
  last_error text,
  submitted_at timestamptz,
  checked_at timestamptz,
  primary key(job_id,token_id)
);
alter table public.chat_push_jobs enable row level security;
alter table public.chat_push_deliveries enable row level security;
revoke all on public.chat_push_jobs,public.chat_push_deliveries from anon,authenticated;
grant all on public.chat_push_jobs,public.chat_push_deliveries to service_role;

create function public.enqueue_chat_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.chat_push_jobs(family_id,sender_id,message_id)
  values(new.family_id,new.created_by,new.id) on conflict(message_id) do nothing;
  return new;
end; $$;
revoke all on function public.enqueue_chat_push() from public,anon,authenticated;
create trigger enqueue_chat_push after insert on public.family_messages
for each row execute function public.enqueue_chat_push();

create function public.claim_chat_push(p_family_id uuid default null, p_limit integer default 10)
returns setof public.chat_push_jobs language plpgsql security definer set search_path='' as $$
begin
  update public.chat_push_jobs set state='expired',last_error='Expired'
  where state in ('pending','processing') and expires_at <= now();
  return query
  with candidates as (
    select id from public.chat_push_jobs
    where (p_family_id is null or family_id=p_family_id) and expires_at>now()
      and ((state='pending' and next_attempt_at<=now()) or (state='processing' and lease_until<now()))
    order by created_at for update skip locked limit greatest(1,least(p_limit,10))
  )
  update public.chat_push_jobs j set state='processing',attempts=j.attempts+1,
    lease_until=now()+interval '5 minutes',lease_id=gen_random_uuid()
  from candidates c where j.id=c.id returning j.*;
end; $$;
revoke all on function public.claim_chat_push(uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_chat_push(uuid,integer) to service_role;

-- Only aggregate status is exposed. Never expose the partner's push token.
create function public.family_push_health(p_family_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not public.is_family_member(p_family_id) then raise exception 'Không thuộc gia đình này'; end if;
  select jsonb_build_object(
    'own_devices',(select count(*) from public.push_tokens where family_id=p_family_id and user_id=auth.uid() and enabled),
    'partner_devices',(select count(*) from public.push_tokens where family_id=p_family_id and user_id<>auth.uid() and enabled),
    'pending',(select count(*) from public.chat_push_jobs where family_id=p_family_id and state in ('pending','processing')),
    'failed',(select count(*) from public.chat_push_jobs where family_id=p_family_id and state in ('failed','expired') and created_at>now()-interval '1 day'),
    'last_error',(select last_error from public.chat_push_jobs where family_id=p_family_id and last_error is not null order by created_at desc limit 1),
    'last_provider_status',(select d.state from public.chat_push_deliveries d join public.chat_push_jobs j on j.id=d.job_id where j.family_id=p_family_id order by d.submitted_at desc limit 1)
  ) into result;
  return result;
end; $$;
revoke all on function public.family_push_health(uuid) from public,anon;
grant execute on function public.family_push_health(uuid) to authenticated;
commit;
