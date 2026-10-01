-- ============================================================
-- Demo login
-- Each "Try the demo" click creates a temporary anonymous account
-- and fills it with copies of the songs listed in demo_template_songs.
-- Visitors can only affect their own copy; demo accounts are
-- removed after 24 hours (see the next migration).
-- ============================================================

-- True when the current request comes from an anonymous (demo) account.
create or replace function public.is_demo_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

-- ---------- profiles ----------
alter table public.profiles add column is_demo boolean not null default false;

-- Users may edit their name, bio and avatar, but not the is_demo flag.
revoke update on public.profiles from authenticated, anon;
grant update (username, display_name, bio, avatar_path) on public.profiles to authenticated;

-- Profile trigger, now handling anonymous accounts (which have no email).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
begin
  if new.is_anonymous then
    insert into public.profiles (id, username, display_name, bio, is_demo)
    values (
      new.id,
      'demo_' || right(replace(new.id::text, '-', ''), 25),
      'Demo listener',
      'A temporary demo account. It disappears after 24 hours.',
      true
    );
    return new;
  end if;

  base_username := lower(coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1),
    ''
  ));
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');
  if char_length(base_username) < 3 then
    base_username := 'user_' || substr(new.id::text, 1, 8);
  end if;
  base_username := left(base_username, 30);

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

-- ---------- songs ----------
-- Demo copies are hidden from the public song list.
alter table public.songs add column is_demo boolean not null default false;
create index songs_public_feed_idx on public.songs (created_at desc) where not is_demo;

-- ---------- which songs every demo account starts with ----------
-- Add rows here (Table Editor -> demo_template_songs) with the ids of
-- songs you uploaded. RLS is on with no policies, so only you
-- (through the dashboard) can change this list.
create table public.demo_template_songs (
  song_id   uuid primary key references public.songs (id) on delete cascade,
  position  integer not null default 0
);
alter table public.demo_template_songs enable row level security;

-- ============================================================
-- Restrictive policies: these are AND-ed with the normal ones,
-- so they take away abilities from demo accounts only.
-- ============================================================

-- Demo accounts get songs only through start_demo(), never by inserting.
create policy "Demo accounts cannot add songs directly"
  on public.songs as restrictive for insert to authenticated
  with check (not (select public.is_demo_user()));

-- Demo accounts cannot touch any file: no uploads (protects your storage
-- quota) and no deletes (protects the shared demo audio).
create policy "Demo accounts cannot upload files"
  on storage.objects as restrictive for insert to authenticated
  with check (not (select public.is_demo_user()));

create policy "Demo accounts cannot change files"
  on storage.objects as restrictive for update to authenticated
  using (not (select public.is_demo_user()));

create policy "Demo accounts cannot delete files"
  on storage.objects as restrictive for delete to authenticated
  using (not (select public.is_demo_user()));

-- ============================================================
-- start_demo(): called right after an anonymous sign-in.
-- Copies the template songs into the caller's account and adds a
-- starter comment. Returns how many songs were copied.
-- ============================================================
create or replace function public.start_demo()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  copied integer;
  first_song uuid;
begin
  if caller is null or not public.is_demo_user() then
    raise exception 'start_demo() is only for demo accounts';
  end if;

  -- Already set up (e.g. the button was clicked twice): do nothing.
  if exists (select 1 from public.songs where uploader_id = caller) then
    return 0;
  end if;

  insert into public.songs
    (uploader_id, title, artist, audio_path, cover_path, duration_seconds, is_demo, created_at)
  select
    caller, s.title, s.artist, s.audio_path, s.cover_path, s.duration_seconds, true,
    now() - make_interval(mins => t.position)
  from public.demo_template_songs t
  join public.songs s on s.id = t.song_id
  order by t.position;
  get diagnostics copied = row_count;

  select id into first_song
  from public.songs
  where uploader_id = caller
  order by created_at desc
  limit 1;

  if first_song is not null then
    insert into public.comments (song_id, author_id, body)
    values (first_song, caller, 'Uploaded this one last week. Let me know what you think!');
  end if;

  return copied;
end;
$$;

revoke execute on function public.start_demo() from public, anon;
grant execute on function public.start_demo() to authenticated;
