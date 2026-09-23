# Tunebox

A simplified Spotify/SoundCloud for a bootcamp demo: users upload songs with cover art, play them, and comment.

## Stack

- **supabase/**: local Supabase (Postgres, Auth, Storage) run in Docker via the Supabase CLI
- **web/**: React + Vite frontend using `@supabase/supabase-js`

## Prerequisites

- Node.js 20+
- Docker Desktop (or another Docker runtime), running

## First-time setup

```bash
npm run setup          # installs the Supabase CLI locally + web dependencies
npm run db:start       # first run downloads Docker images (a few minutes)
```

`db:start` prints the local URLs and keys. Copy the env template and paste in the **API URL** and the **anon** (or **Publishable**) key:

```bash
cp web/.env.example web/.env.local
```

Then start the app:

```bash
npm run dev            # http://127.0.0.1:5173
```

The home page is a stack check: it should show the two demo profiles, 0 songs, three reachable storage buckets, and let you sign in.

## Demo accounts (seeded)

| Email             | Password    |
| ----------------- | ----------- |
| alice@example.com | password123 |
| bob@example.com   | password123 |

## Useful URLs

- Supabase Studio (browse tables, files, users): http://127.0.0.1:54323
- Mailpit (catches auth emails locally): http://127.0.0.1:54324

## Database

- Schema lives in `supabase/migrations/`. Add a change with `npm run db:new-migration <name>`.
- `npm run db:reset` wipes the local database, re-runs every migration, and re-applies `supabase/seed.sql`. Note that reset does not clear uploaded files in Storage; delete those in Studio if needed.

### Tables

| Table      | Purpose                                                        |
| ---------- | -------------------------------------------------------------- |
| `profiles` | One per user, auto-created on sign-up (username, name, bio, avatar) |
| `songs`    | Title, artist, audio file path, cover path, uploader            |
| `comments` | Text comments on a song                                        |

Everyone can read everything. Signed-in users can only create or delete rows they own (enforced by Row Level Security).

### Storage buckets

| Bucket    | Limit  | Accepts                          |
| --------- | ------ | -------------------------------- |
| `audio`   | 50 MiB | mp3, m4a/aac, wav, ogg, webm, flac |
| `covers`  | 5 MiB  | jpeg, png, webp                  |
| `avatars` | 2 MiB  | jpeg, png, webp                  |

Upload files to `<bucket>/<your-user-id>/<filename>`; the policies reject uploads into anyone else's folder.

## Out of scope

Recommendations, artist pages, playlists, direct messages, listener stats.
