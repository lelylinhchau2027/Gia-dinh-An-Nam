-- Additive upgrade: no change to existing text messages or baby profiles.
begin;
alter table public.family_messages add column attachments jsonb not null default '[]'::jsonb;

create function public.valid_message_media(items jsonb, family uuid, author uuid)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 4 then return false; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) <> 'object' or
       coalesce(item->>'type','') not in ('image','video') or
       coalesce(item->>'path','') not like family::text || '/' || author::text || '/%' or
       position('..' in (item->>'path')) > 0 or position(':' in (item->>'path')) > 0 or
       coalesce((item->>'width')::numeric,0) <= 0 or coalesce((item->>'height')::numeric,0) <= 0 or
       coalesce((item->>'size')::numeric,0) <= 0 or
       (item->>'size')::numeric > (case when item->>'type'='image' then 8388608 else 26214400 end) or
       (item->>'type'='image' and coalesce(item->>'mimeType','') <> 'image/jpeg') or
       (item->>'type'='video' and coalesce(item->>'mimeType','') not in ('video/mp4','video/quicktime')) then
      return false;
    end if;
  end loop;
  return true;
exception when others then return false;
end; $$;
alter table public.family_messages add constraint family_message_media_valid
check (public.valid_message_media(attachments, family_id, created_by));

update storage.buckets set file_size_limit=26214400,
  allowed_mime_types=array['image/jpeg','video/mp4','video/quicktime']
where id='family-media';
-- Existing private bucket policies still require family membership and uploader path.

create table public.family_message_reads (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key(family_id,user_id)
);
alter table public.family_message_reads enable row level security;
grant select,insert,update on public.family_message_reads to authenticated;
create policy "family reads message receipts" on public.family_message_reads for select to authenticated
using (public.is_family_member(family_id));
create policy "member marks own messages read" on public.family_message_reads for insert to authenticated
with check (public.is_family_member(family_id) and user_id=auth.uid());
create policy "member updates own read time" on public.family_message_reads for update to authenticated
using (public.is_family_member(family_id) and user_id=auth.uid())
with check (public.is_family_member(family_id) and user_id=auth.uid());

create function public.mark_family_messages_read(p_family_id uuid, p_last_message_id text) returns void
language plpgsql security invoker set search_path='' as $$
declare seen_at timestamptz;
begin
  -- A device opening cached history must not mark unseen server messages read.
  -- Resolve the last displayed incoming message under the caller's RLS policy.
  select created_at into seen_at from public.family_messages
  where id=p_last_message_id and family_id=p_family_id and created_by<>auth.uid();
  if not found then raise exception 'Không tìm thấy tin nhắn đã xem trong gia đình'; end if;
  insert into public.family_message_reads(family_id,user_id,last_read_at)
  values(p_family_id,auth.uid(),seen_at)
  on conflict(family_id,user_id) do update
  set last_read_at=greatest(public.family_message_reads.last_read_at,excluded.last_read_at);
end;
$$;
revoke all on function public.mark_family_messages_read(uuid,text) from public,anon;
grant execute on function public.mark_family_messages_read(uuid,text) to authenticated;
alter publication supabase_realtime add table public.family_message_reads;
commit;
