-- ============================================================
-- Local-only seed data. Runs on `supabase db reset`.
-- Creates two demo accounts (password for both: password123)
--   alice@example.com   bob@example.com
-- Their profiles are created automatically by the on_auth_user_created trigger.
-- ============================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'alice@example.com',
   extensions.crypt('password123', extensions.gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}',
   '{"username":"alice","display_name":"Alice"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'bob@example.com',
   extensions.crypt('password123', extensions.gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}',
   '{"username":"bob","display_name":"Bob"}',
   now(), now(), '', '', '', '');

-- Email identities so the accounts can sign in with email + password.
insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.email in ('alice@example.com', 'bob@example.com');

update public.profiles set bio = 'Bedroom producer. Mostly lo-fi.'
  where username = 'alice';
update public.profiles set bio = 'Guitar covers, badly recorded.'
  where username = 'bob';
