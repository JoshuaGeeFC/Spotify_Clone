-- ============================================================
-- Playlists
-- A playlist belongs to one user and holds an ordered list of songs.
-- Public playlists can be viewed by anyone with the link;
-- private ones only by their owner.
-- ============================================================

create table public.playlists (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  description  text check (char_length(description) <= 280),
  is_public    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index playlists_owner_id_idx on public.playlists (owner_id, created_at desc);

create table public.playlist_songs (
  playlist_id  uuid not null references public.playlists (id) on delete cascade,
  song_id      uuid not null references public.songs (id) on delete cascade,
  position     integer not null default 0,
  added_at     timestamptz not null default now(),
  primary key (playlist_id, song_id)          -- a song appears once per playlist
);

create index playlist_songs_order_idx on public.playlist_songs (playlist_id, position);

-- New songs go to the end of the playlist.
create or replace function public.playlist_songs_set_position()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select coalesce(max(position) + 1, 0) into new.position
  from public.playlist_songs
  where playlist_id = new.playlist_id;
  return new;
end;
$$;

create trigger playlist_songs_append
  before insert on public.playlist_songs
  for each row execute function public.playlist_songs_set_position();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.playlists      enable row level security;
alter table public.playlist_songs enable row level security;

-- playlists
create policy "Public playlists, and your own, are viewable"
  on public.playlists for select
  using (is_public or (select auth.uid()) = owner_id);

create policy "Users create playlists as themselves"
  on public.playlists for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users edit their own playlists"
  on public.playlists for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users delete their own playlists"
  on public.playlists for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- playlist_songs: visible when the playlist is, editable by its owner
create policy "Playlist songs follow the playlist's visibility"
  on public.playlist_songs for select
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_id
      and (p.is_public or p.owner_id = (select auth.uid()))
  ));

create policy "Owners add songs to their playlists"
  on public.playlist_songs for insert to authenticated
  with check (exists (
    select 1 from public.playlists p
    where p.id = playlist_id and p.owner_id = (select auth.uid())
  ));

create policy "Owners reorder their playlists"
  on public.playlist_songs for update to authenticated
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_id and p.owner_id = (select auth.uid())
  ));

create policy "Owners remove songs from their playlists"
  on public.playlist_songs for delete to authenticated
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_id and p.owner_id = (select auth.uid())
  ));

-- ============================================================
-- Demo accounts now also start with a private sample playlist.
-- (Same as before, plus the playlist at the end.)
-- Demo playlists are removed with the account after 24 hours.
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
  demo_playlist uuid;
begin
  if caller is null or not public.is_demo_user() then
    raise exception 'start_demo() is only for demo accounts';
  end if;

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

    insert into public.playlists (owner_id, name, description, is_public)
    values (caller, 'Late night mix', 'A sample playlist. Try adding or removing songs.', false)
    returning id into demo_playlist;

    -- one row at a time so the position trigger numbers them in order
    insert into public.playlist_songs (playlist_id, song_id)
    select demo_playlist, s.id
    from public.songs s
    where s.uploader_id = caller
    order by s.created_at desc;
  end if;

  return copied;
end;
$$;

revoke execute on function public.start_demo() from public, anon;
grant execute on function public.start_demo() to authenticated;
