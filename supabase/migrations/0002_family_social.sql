-- Additive upgrade: preserves every existing family, child and care record.
begin;
alter table public.children add column avatar_path text;
alter table public.children add column cover_path text;
alter table public.care_entries add column details jsonb not null default '{}'::jsonb;
alter table public.care_entries add column deleted_at timestamptz;
-- Prevent linking records to a child in another family through a guessed ID.
alter table public.children add constraint children_id_family_unique unique (id, family_id);
alter table public.care_entries add constraint care_child_same_family foreign key (child_id, family_id) references public.children(id, family_id) on delete cascade;
alter table public.reminders add constraint reminder_child_same_family foreign key (child_id, family_id) references public.children(id, family_id) on delete cascade;

create table public.push_receipts (
  ticket_id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  expo_push_token text not null,
  created_at timestamptz not null default now(),
  checked_at timestamptz,
  status text not null default 'pending',
  error text
);
alter table public.push_receipts enable row level security;
-- No client policy: APNs/Expo receipt processing is restricted to the Edge Function.
revoke all on public.push_receipts from anon, authenticated;

create table public.family_posts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null default '' check (char_length(body) <= 5000),
  image_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  check (char_length(trim(body)) > 0 or cardinality(image_paths) > 0),
  check (cardinality(image_paths) <= 6),
  unique (id, family_id)
);
create index family_posts_time on public.family_posts(family_id, created_at desc);
create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  post_id uuid not null,
  author_id uuid not null references auth.users(id),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key (post_id, family_id) references public.family_posts(id, family_id) on delete cascade
);
create index post_comments_time on public.post_comments(post_id, created_at);
create table public.post_likes (
  family_id uuid not null references public.families(id) on delete cascade,
  post_id uuid not null,
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id),
  foreign key (post_id, family_id) references public.family_posts(id, family_id) on delete cascade
);

alter table public.family_posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_likes enable row level security;
grant select, insert, delete on public.family_posts, public.post_comments, public.post_likes to authenticated;
create policy "family reads posts" on public.family_posts for select to authenticated
using (public.is_family_member(family_id));
create policy "member creates post" on public.family_posts for insert to authenticated
with check (public.is_family_member(family_id) and author_id = auth.uid());
create policy "author deletes post" on public.family_posts for delete to authenticated
using (public.is_family_member(family_id) and author_id = auth.uid());
create policy "family reads comments" on public.post_comments for select to authenticated
using (public.is_family_member(family_id));
create policy "member comments" on public.post_comments for insert to authenticated
with check (public.is_family_member(family_id) and author_id = auth.uid());
create policy "author deletes comment" on public.post_comments for delete to authenticated
using (public.is_family_member(family_id) and author_id = auth.uid());
create policy "family reads likes" on public.post_likes for select to authenticated
using (public.is_family_member(family_id));
create policy "member likes" on public.post_likes for insert to authenticated
with check (public.is_family_member(family_id) and user_id = auth.uid());
create policy "member unlikes" on public.post_likes for delete to authenticated
using (public.is_family_member(family_id) and user_id = auth.uid());

-- Photos are private; paths are family UUID / uploader UUID / unique JPEG.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-media', 'family-media', false, 8388608, array['image/jpeg'])
on conflict (id) do nothing;
create policy "family reads media" on storage.objects for select to authenticated
using (bucket_id = 'family-media' and exists (
  select 1 from public.family_members m
  where m.user_id = auth.uid() and m.family_id::text = (storage.foldername(name))[1]
));
create policy "member uploads media" on storage.objects for insert to authenticated
with check (bucket_id = 'family-media' and (storage.foldername(name))[2] = auth.uid()::text
  and exists (select 1 from public.family_members m
    where m.user_id = auth.uid() and m.family_id::text = (storage.foldername(name))[1]));
create policy "uploader removes media" on storage.objects for delete to authenticated
using (bucket_id = 'family-media' and (storage.foldername(name))[2] = auth.uid()::text
  and exists (select 1 from public.family_members m
    where m.user_id = auth.uid() and m.family_id::text = (storage.foldername(name))[1]));

alter publication supabase_realtime add table public.family_posts, public.post_comments, public.post_likes;
commit;
