-- Local notifications + private Telegram. Additive; historical chat/media retained.
begin;
alter table public.reminders add column reminder_kind text not null default 'calendar'
  check (reminder_kind in ('calendar','attention'));
alter table public.reminders add column acknowledged_by uuid references auth.users(id);
alter table public.reminders add column acknowledged_at timestamptz;
alter table public.reminders add column schedule_version integer not null default 1;

create table public.telegram_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chat_id text not null unique,
  telegram_user_id text not null unique,
  display_name text not null,
  confirmed_at timestamptz,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.telegram_link_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null
);
create table public.telegram_jobs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  source_table text not null,
  entity_id text not null,
  kind text not null,
  revision integer,
  dedupe_key text not null unique,
  due_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 hours',
  state text not null default 'pending' check (state in ('pending','processing','accepted','cancelled','failed','expired')),
  attempts integer not null default 0,
  lease_id uuid,
  lease_until timestamptz,
  telegram_message_id text,
  last_error text,
  created_at timestamptz not null default now()
);
create index telegram_jobs_due on public.telegram_jobs(state,due_at);
create index telegram_jobs_source on public.telegram_jobs(source_table,entity_id);
alter table public.telegram_links enable row level security;
alter table public.telegram_link_codes enable row level security;
alter table public.telegram_jobs enable row level security;
revoke all on public.telegram_links, public.telegram_link_codes, public.telegram_jobs from anon, authenticated;
grant all on public.telegram_links, public.telegram_link_codes, public.telegram_jobs to service_role;

-- Narrow authenticated update grants: acknowledgement is exclusively through RPC.
revoke update on public.reminders from authenticated;
grant update(id,family_id,child_id,title,details,due_at,completed_at,created_by,created_by_name,created_at,updated_at,reminder_kind) on public.reminders to authenticated;
revoke insert on public.reminders from authenticated;
grant insert(id,family_id,child_id,title,details,due_at,completed_at,created_by,created_by_name,created_at,updated_at,reminder_kind) on public.reminders to authenticated;

create function public.guard_reminder_revision() returns trigger language plpgsql set search_path = public as $$
begin
  if new.id <> old.id or new.family_id <> old.family_id or new.created_by <> old.created_by or new.reminder_kind <> old.reminder_kind then
    raise exception 'reminder identity is immutable';
  end if;
  if (new.title,new.details,new.due_at,new.child_id) is distinct from (old.title,old.details,old.due_at,old.child_id) then
    new.schedule_version := old.schedule_version + 1;
    new.acknowledged_by := null; new.acknowledged_at := null;
  end if;
  return new;
end $$;
create trigger reminder_revision before update on public.reminders for each row execute function public.guard_reminder_revision();

create function public.acknowledge_family_reminder(target_id text, actor uuid, expected_revision integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.reminders;
begin
  select * into r from public.reminders where id = target_id for update;
  if not found or actor is null or expected_revision is null or r.created_by = actor or r.completed_at is not null or r.schedule_version <> expected_revision
    or not exists(select 1 from public.family_members where family_id = r.family_id and user_id = actor)
    or not exists(select 1 from public.family_members where family_id = r.family_id and user_id = r.created_by) then
    raise exception 'reminder unavailable or changed';
  end if;
  if r.acknowledged_at is not null then return true; end if;
  update public.reminders set acknowledged_by = actor, acknowledged_at = now() where id = r.id;
  return true;
end $$;
revoke all on function public.acknowledge_family_reminder(text,uuid,integer) from public, anon, authenticated;
grant execute on function public.acknowledge_family_reminder(text,uuid,integer) to service_role;

create function public.enqueue_telegram_event() returns trigger language plpgsql security definer set search_path = public as $$
declare rowdata jsonb := to_jsonb(new); actor uuid; category text; revision integer; event_key text;
begin
  actor := coalesce(auth.uid(), (rowdata->>'author_id')::uuid, (rowdata->>'created_by')::uuid);
  category := tg_table_name;
  if tg_table_name = 'reminders' then
    revision := new.schedule_version;
    if tg_op = 'UPDATE' then
      if new.acknowledged_at is distinct from old.acknowledged_at and new.acknowledged_at is not null then
        category := 'acknowledged'; actor := new.acknowledged_by;
      elsif new.completed_at is distinct from old.completed_at then category := 'completed';
      elsif new.schedule_version <> old.schedule_version then category := 'rescheduled';
      else return new;
      end if;
    else category := case when new.reminder_kind = 'attention' then 'attention' else 'reminder_created' end;
    end if;
    if category in ('completed','rescheduled','acknowledged') then
      update public.telegram_jobs set state = 'cancelled', lease_id = null
      where source_table = 'reminders' and entity_id = new.id and state in ('pending','processing')
        and (category <> 'acknowledged' or kind in ('attention','reminder_created','rescheduled'));
    end if;
  elsif tg_table_name = 'care_entries' then
    if new.deleted_at is not null or new.occurred_at < now() - interval '2 hours' then return new; end if;
    if tg_op = 'UPDATE' then return new; end if;
  end if;
  -- Explicit parentheses avoid json operator/concatenation precedence surprises.
  event_key := tg_table_name || ':' || (rowdata->>'id') || ':' || category || ':' || coalesce(revision::text,'1');
  insert into public.telegram_jobs(family_id,actor_id,recipient_id,source_table,entity_id,kind,revision,dedupe_key,expires_at)
  select (rowdata->>'family_id')::uuid,actor,m.user_id,tg_table_name,rowdata->>'id',category,revision,event_key || ':' || m.user_id,
    now() + case when category = 'attention' then interval '15 minutes' when category = 'care_entries' then interval '2 hours' else interval '12 hours' end
  from public.family_members m join public.telegram_links l on l.user_id = m.user_id and l.enabled and l.confirmed_at is not null
  where m.family_id = (rowdata->>'family_id')::uuid and m.user_id <> actor
    and exists(select 1 from public.family_members a where a.family_id = m.family_id and a.user_id = actor)
  on conflict(dedupe_key) do nothing;
  return new;
end $$;
create trigger telegram_reminder after insert or update on public.reminders for each row execute function public.enqueue_telegram_event();
create trigger telegram_post after insert on public.family_posts for each row execute function public.enqueue_telegram_event();
create trigger telegram_comment after insert on public.post_comments for each row execute function public.enqueue_telegram_event();
create trigger telegram_care after insert on public.care_entries for each row execute function public.enqueue_telegram_event();

-- Daily 21:00 Asia/Ho_Chi_Minh, D-7..D-1. Exact appointment uses local iOS.
-- Skip past days and old imports: no backfill flood. Same-day 21:00 catch-up expires at midnight.
create function public.enqueue_telegram_calendar(clock_at timestamptz default now()) returns void
language plpgsql security definer set search_path = public as $$
declare day_local date := (clock_at at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if (clock_at at time zone 'Asia/Ho_Chi_Minh')::time < time '21:00' then return; end if;
  insert into public.telegram_jobs(family_id,recipient_id,source_table,entity_id,kind,revision,dedupe_key,due_at,expires_at)
  select r.family_id,m.user_id,'reminders',r.id,'calendar',r.schedule_version,
    'calendar:' || r.id || ':' || r.schedule_version || ':' || m.user_id || ':' || day_local,
    clock_at, (day_local + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh'
  from public.reminders r join public.family_members m on m.family_id = r.family_id
  join public.telegram_links l on l.user_id = m.user_id and l.enabled and l.confirmed_at is not null
  where r.completed_at is null and r.reminder_kind = 'calendar' and r.due_at > clock_at
    and (r.due_at at time zone 'Asia/Ho_Chi_Minh')::date - day_local between 1 and 7
  on conflict(dedupe_key) do nothing;
  delete from public.telegram_link_codes where expires_at < clock_at;
  delete from public.telegram_jobs where created_at < clock_at - interval '30 days';
end $$;
revoke all on function public.enqueue_telegram_calendar(timestamptz) from public, anon, authenticated;
grant execute on function public.enqueue_telegram_calendar(timestamptz) to service_role;

create function public.claim_telegram_jobs(target_family uuid default null) returns setof public.telegram_jobs
language plpgsql security definer set search_path = public as $$
begin
  update public.telegram_jobs set state = 'expired', lease_id = null where expires_at <= now() and state in ('pending','processing');
  update public.telegram_jobs set state = 'failed', lease_id = null, last_error = 'AttemptsExhausted'
    where attempts >= 12 and (state = 'pending' or (state = 'processing' and lease_until < now()));
  return query with picked as (
    select id from public.telegram_jobs where (target_family is null or family_id = target_family)
    and due_at <= now() and expires_at > now() and attempts < 12
    and (state = 'pending' or (state = 'processing' and lease_until < now()))
    order by case when kind = 'attention' then 0 else 1 end, due_at for update skip locked limit 5
  ) update public.telegram_jobs j set state = 'processing', lease_id = gen_random_uuid(),
    lease_until = now() + interval '2 minutes', attempts = j.attempts + 1
    from picked where j.id = picked.id returning j.*;
end $$;
revoke all on function public.claim_telegram_jobs(uuid) from public, anon, authenticated;
grant execute on function public.claim_telegram_jobs(uuid) to service_role;

-- Consume a private /start code exactly once, even if Telegram retries concurrently.
create function public.consume_telegram_link(code_digest text, chat text, telegram_user text, telegram_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare target_user uuid;
begin
  delete from public.telegram_link_codes where code_hash = code_digest and expires_at > now() returning user_id into target_user;
  if target_user is null then return false; end if;
  insert into public.telegram_links(user_id,chat_id,telegram_user_id,display_name)
  values(target_user,chat,telegram_user,left(telegram_name,80))
  on conflict(user_id) do update set chat_id = excluded.chat_id, telegram_user_id = excluded.telegram_user_id,
    display_name = excluded.display_name, confirmed_at = null, enabled = false, updated_at = now();
  return true;
end $$;
revoke all on function public.consume_telegram_link(text,text,text,text) from public, anon, authenticated;
grant execute on function public.consume_telegram_link(text,text,text,text) to service_role;

-- Retire automatic APNs chat dispatch and new chat writes; preserve old rows.
create function public.create_attention_reminder(actor uuid, request_id text) returns text
language plpgsql security definer set search_path = public as $$
declare m public.family_members; existing public.reminders;
begin
  if request_id !~ '^attention_[a-zA-Z0-9_-]{8,80}$' then raise exception 'invalid request id'; end if;
  select * into m from public.family_members where user_id = actor;
  if not found then raise exception 'membership required'; end if;
  perform pg_advisory_xact_lock(hashtext(actor::text));
  select * into existing from public.reminders where id = request_id;
  if found then
    if existing.created_by <> actor or existing.family_id <> m.family_id or existing.reminder_kind <> 'attention' then raise exception 'invalid request'; end if;
    return existing.id;
  end if;
  if not exists(select 1 from public.family_members other join public.telegram_links l on l.user_id = other.user_id
    where other.family_id = m.family_id and other.user_id <> actor and l.enabled and l.confirmed_at is not null) then
    raise exception 'partner telegram not linked';
  end if;
  if exists(select 1 from public.reminders where created_by = actor and reminder_kind = 'attention' and created_at > now() - interval '30 seconds') then
    raise exception 'wait 30 seconds';
  end if;
  insert into public.reminders(id,family_id,title,details,due_at,created_by,created_by_name,reminder_kind)
  values(request_id,m.family_id,'Cần bạn hỗ trợ ngay',null,now(),actor,m.display_name,'attention');
  return request_id;
end $$;
revoke all on function public.create_attention_reminder(uuid,text) from public, anon, authenticated;
grant execute on function public.create_attention_reminder(uuid,text) to service_role;

drop policy "members add reminders" on public.reminders;
create policy "members add calendar reminders" on public.reminders for insert to authenticated
with check(public.is_family_member(family_id) and created_by = auth.uid() and reminder_kind = 'calendar');

drop trigger if exists enqueue_chat_push on public.family_messages;
revoke insert, update on public.family_messages from authenticated;
update public.push_tokens set enabled = false;
update public.chat_push_jobs set state = 'failed', last_error = 'Replaced by Telegram reminders' where state in ('pending','processing');
commit;
