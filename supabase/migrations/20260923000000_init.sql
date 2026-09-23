-- ============================================================
-- Tunebox initial schema
-- Tables: profiles, songs, comments
-- Storage buckets: audio, covers, avatars
-- ============================================================

-- ---------- profiles ----------
-- One row per auth user, created automatically by a trigger on sign-up.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text not null unique
                check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name  text not null check (char_length(display_name) between 1 and 60),
  bio           text check (char_length(bio) <= 280),
  avatar_path   text,                         -- object path in the "avatars" bucket
  created_at    timestamptz not null default now()
);

-- ---------- songs ----------
create table public.songs (
  id                uuid primary key default gen_random_uuid(),
  uploader_id       uuid not null references public.profiles (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 120),
  artist            text not null check (char_length(artist) between 1 and 120),
  audio_path        text not null,            -- object path in the "audio" bucket
  cover_path        text,                     -- object path in the "covers" bucket
  duration_seconds  integer check (duration_seconds > 0),
  created_at        timestamptz not null default now()
);

create index songs_created_at_idx  on public.songs (created_at desc);
create index songs_uploader_id_idx on public.songs (uploader_id);

-- ---------- comments ----------
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  song_id     uuid not null references public.songs (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now()
);

create index comments_song_id_created_at_idx on public.comments (song_id, created_at);

-- ============================================================
-- Row Level Security
-- Everyone (even logged-out visitors) can read.
-- Logged-in users can only write rows they own.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.songs    enable row level security;
alter table public.comments enable row level security;

-- profiles
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- songs
create policy "Songs are viewable by everyone"
  on public.songs for select using (true);

create policy "Users can upload songs as themselves"
  on public.songs for insert to authenticated
  with check ((select auth.uid()) = uploader_id);

create policy "Users can delete their own songs"
  on public.songs for delete to authenticated
  using ((select auth.uid()) = uploader_id);

-- comments
create policy "Comments are viewable by everyone"
  on public.comments for select using (true);

create policy "Users can comment as themselves"
  on public.comments for insert to authenticated
  with check ((select auth.uid()) = author_id);

create policy "Users can delete their own comments"
  on public.comments for delete to authenticated
  using ((select auth.uid()) = author_id);

-- ============================================================
-- Auto-create a profile when someone signs up.
-- Reads optional "username" / "display_name" from sign-up metadata:
--   supabase.auth.signUp({ email, password, options: { data: { username, display_name } } })
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
begin
  base_username := lower(coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1)
  ));
  -- keep only allowed characters, pad/trim to 3..30
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');
  if char_length(base_username) < 3 then
    base_username := 'user_' || substr(new.id::text, 1, 8);
  end if;
  base_username := left(base_username, 30);

  -- avoid collisions by appending part of the user id
  if exists (select 1 from public.profiles where username = base_username) then
    base_username := left(base_username, 21) || '_' || substr(new.id::text, 1, 8);
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    base_username,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), base_username)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Storage buckets
-- Files are stored under a folder named after the uploader's user id:
--   audio/<user_id>/<file>   covers/<user_id>/<file>   avatars/<user_id>/<file>
-- Buckets are public-read so the <audio>/<img> tags can use plain URLs.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('audio',   'audio',   true, 52428800,  -- 50 MiB
    array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
          'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/flac']),
  ('covers',  'covers',  true, 5242880,   -- 5 MiB
    array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152,   -- 2 MiB
    array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Anyone can read files in these buckets.
create policy "Public read for media buckets"
  on storage.objects for select
  using (bucket_id in ('audio', 'covers', 'avatars'));

-- Logged-in users can upload only into their own folder.
create policy "Users upload into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('audio', 'covers', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ...and replace (avatars) or delete only their own files.
create policy "Users update their own files"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('audio', 'covers', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete their own files"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('audio', 'covers', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
