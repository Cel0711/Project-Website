-- Up Migration
-- Accounts, login sessions, one-time email links and the audit trail.
-- Needs no extensions: gen_random_uuid() is built in from PostgreSQL 13.

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  username text,
  full_name text not null,
  company text not null default '',
  phone text not null default '',
  role text not null check (role in ('admin', 'finance', 'client')),
  -- pending = invited staff member who has not chosen a password yet
  status text not null default 'active' check (status in ('active', 'pending', 'disabled')),
  password_hash text not null,
  currency text not null default 'USD' check (char_length(currency) = 3),
  email_verified_at timestamptz,
  must_change_password boolean not null default false,
  failed_logins integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index users_email_key on users (lower(email));
create unique index users_username_key on users (lower(username)) where username is not null;
create index users_role_idx on users (role, status);

-- Only the SHA-256 hash of the cookie token is stored, so a copy of this table cannot be used to sign in.
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  token_hash text not null unique,
  user_agent text not null default '',
  ip text not null default '',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user_idx on sessions (user_id);
create index sessions_expires_idx on sessions (expires_at);

create table email_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  purpose text not null check (purpose in ('verify', 'reset', 'invite')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index email_tokens_user_idx on email_tokens (user_id, purpose);

create table audit_log (
  id integer generated always as identity primary key,
  actor_id uuid references users (id) on delete set null,
  action text not null,
  entity text not null default '',
  entity_id text not null default '',
  meta jsonb not null default '{}'::jsonb,
  ip text not null default '',
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on audit_log (created_at desc);

-- Down Migration
drop table if exists audit_log;
drop table if exists email_tokens;
drop table if exists sessions;
drop table if exists users;
