create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique check (invite_code ~ '^[A-Z0-9]{8}$'),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  role text not null default 'parent' check (role in ('owner', 'parent')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create unique index if not exists family_members_one_family_per_user
  on public.family_members(user_id);

create table if not exists public.children (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  nickname text,
  birthday date,
  due_date date,
  gender text check (gender is null or gender in ('female', 'male', 'other', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.care_entries (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  child_id text not null references public.children(id) on delete cascade,
  kind text not null check (kind in (
    'milk', 'sleep', 'diaper', 'weaning', 'temperature', 'medicine', 'activity', 'growth'
  )),
  amount numeric,
  unit text,
  note text,
  occurred_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists care_entries_child_time
  on public.care_entries(child_id, occurred_at desc);

create table if not exists public.family_messages (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_by uuid not null references auth.users(id),
  created_by_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists family_messages_family_time
  on public.family_messages(family_id, created_at desc);

create table if not exists public.reminders (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  child_id text references public.children(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  details text,
  due_at timestamptz not null,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_family_due
  on public.reminders(family_id, due_at);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android')),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_id),
  unique (expo_push_token)
);

create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_family_member(uuid) from public;
grant execute on function public.is_family_member(uuid) to authenticated;

create or replace function public.make_family_invite_code()
returns text
language sql
volatile
set search_path = public
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create or replace function public.create_family(
  family_name text,
  member_display_name text
)
returns table (id uuid, name text, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family public.families;
  next_code text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'account already belongs to a family';
  end if;

  loop
    next_code := public.make_family_invite_code();
    exit when not exists (select 1 from public.families where families.invite_code = next_code);
  end loop;

  insert into public.families (name, invite_code, owner_id)
  values (trim(family_name), next_code, auth.uid())
  returning * into new_family;

  insert into public.family_members (family_id, user_id, display_name, role)
  values (new_family.id, auth.uid(), trim(member_display_name), 'owner');

  return query select new_family.id, new_family.name, new_family.invite_code;
end;
$$;

create or replace function public.join_family(
  requested_invite_code text,
  member_display_name text
)
returns table (id uuid, name text, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_family public.families;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'account already belongs to a family';
  end if;

  select * into selected_family
  from public.families
  where families.invite_code = upper(trim(requested_invite_code))
  for update;

  if not found then
    raise exception 'invite code not found';
  end if;
  if (select count(*) from public.family_members where family_id = selected_family.id) >= 2 then
    raise exception 'family already has two members';
  end if;

  insert into public.family_members (family_id, user_id, display_name, role)
  values (selected_family.id, auth.uid(), trim(member_display_name), 'parent');

  return query select selected_family.id, selected_family.name, selected_family.invite_code;
end;
$$;

revoke all on function public.create_family(text, text) from public;
revoke all on function public.join_family(text, text) from public;
grant execute on function public.create_family(text, text) to authenticated;
grant execute on function public.join_family(text, text) to authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
drop trigger if exists families_touch_updated_at on public.families;
create trigger families_touch_updated_at before update on public.families
for each row execute function public.touch_updated_at();
drop trigger if exists children_touch_updated_at on public.children;
create trigger children_touch_updated_at before update on public.children
for each row execute function public.touch_updated_at();
drop trigger if exists care_entries_touch_updated_at on public.care_entries;
create trigger care_entries_touch_updated_at before update on public.care_entries
for each row execute function public.touch_updated_at();
drop trigger if exists reminders_touch_updated_at on public.reminders;
create trigger reminders_touch_updated_at before update on public.reminders
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.children enable row level security;
alter table public.care_entries enable row level security;
alter table public.family_messages enable row level security;
alter table public.reminders enable row level security;
alter table public.push_tokens enable row level security;

create policy "profile is private" on public.profiles
for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "members read their family" on public.families
for select to authenticated using (public.is_family_member(id));
create policy "owner updates family" on public.families
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "members read each other" on public.family_members
for select to authenticated using (public.is_family_member(family_id));

create policy "members manage children" on public.children
for all to authenticated using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));
create policy "members read care entries" on public.care_entries
for select to authenticated using (public.is_family_member(family_id));
create policy "members add care entries" on public.care_entries
for insert to authenticated with check (
  public.is_family_member(family_id) and created_by = auth.uid()
);
create policy "members update care entries" on public.care_entries
for update to authenticated using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));
create policy "members delete care entries" on public.care_entries
for delete to authenticated using (public.is_family_member(family_id));

create policy "members read messages" on public.family_messages
for select to authenticated using (public.is_family_member(family_id));
create policy "members add messages" on public.family_messages
for insert to authenticated with check (
  public.is_family_member(family_id) and created_by = auth.uid()
);
create policy "authors retry message writes" on public.family_messages
for update to authenticated using (
  public.is_family_member(family_id) and created_by = auth.uid()
)
with check (
  public.is_family_member(family_id) and created_by = auth.uid()
);

create policy "members read reminders" on public.reminders
for select to authenticated using (public.is_family_member(family_id));
create policy "members add reminders" on public.reminders
for insert to authenticated with check (
  public.is_family_member(family_id) and created_by = auth.uid()
);
create policy "members update reminders" on public.reminders
for update to authenticated using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));
create policy "members delete reminders" on public.reminders
for delete to authenticated using (public.is_family_member(family_id));
create policy "users manage their push tokens" on public.push_tokens
for all to authenticated using (user_id = auth.uid())
with check (user_id = auth.uid() and public.is_family_member(family_id));

do $$
begin
  alter publication supabase_realtime add table
    public.children,
    public.care_entries,
    public.family_messages,
    public.reminders;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
