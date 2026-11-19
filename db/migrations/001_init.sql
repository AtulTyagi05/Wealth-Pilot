-- Wealth Pilot initial schema.
-- Financial data is stored only as AES-256-GCM ciphertext; the database never sees plaintext amounts.

create extension if not exists citext;

create table users (
  id                  uuid primary key default gen_random_uuid(),
  email               citext not null unique,
  password_hash       text not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  password_changed_at timestamptz not null default now()
);

create table sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  -- SHA-256 of the session token; the raw token only ever lives in the user's cookie.
  token_hash   bytea not null unique,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  user_agent   text
);
create index sessions_user_id_idx on sessions(user_id);
create index sessions_expires_at_idx on sessions(expires_at);

create table financial_data (
  user_id     uuid primary key references users(id) on delete cascade,
  -- Incremented on every write; used for optimistic concurrency between devices.
  version     integer not null default 1,
  key_version integer not null,
  iv          bytea not null,
  auth_tag    bytea not null,
  ciphertext  bytea not null,
  updated_at  timestamptz not null default now()
);
