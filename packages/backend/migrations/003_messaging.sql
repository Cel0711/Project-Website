-- Up Migration
-- Chat between a client and the team, plus in-app notifications.

create table conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references users (id) on delete cascade,
  -- null = the client's "General" thread; otherwise the thread that belongs to one quote request
  quote_id uuid references quote_requests (id) on delete cascade,
  subject text not null default '',
  last_message_at timestamptz,
  last_message_preview text not null default '',
  created_at timestamptz not null default now()
);
create unique index conversations_quote_key on conversations (quote_id) where quote_id is not null;
create unique index conversations_general_key on conversations (client_id) where quote_id is null;
create index conversations_last_idx on conversations (last_message_at desc nulls last);

create table messages (
  id integer generated always as identity primary key,
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid references users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  system boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_conv_idx on messages (conversation_id, id);

-- How far each person has read in each thread: drives unread counts and "Seen".
create table conversation_reads (
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  last_read_message_id integer not null default 0,
  primary key (conversation_id, user_id)
);

create table notifications (
  id integer generated always as identity primary key,
  user_id uuid not null references users (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  link text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, id desc);

-- Down Migration
drop table if exists notifications;
drop table if exists conversation_reads;
drop table if exists messages;
drop table if exists conversations;
