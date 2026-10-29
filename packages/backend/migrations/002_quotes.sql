-- Up Migration
-- Quote requests and the timeline the client follows as progress.

create sequence quote_ref_seq start 1;

create table quote_requests (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  client_id uuid not null references users (id) on delete restrict,
  status text not null default 'submitted'
    check (status in ('submitted', 'reviewing', 'quoted', 'accepted', 'building', 'delivered', 'declined', 'cancelled')),
  progress smallint not null default 0 check (progress between 0 and 100),
  currency text not null default 'USD' check (char_length(currency) = 3),
  plan_id text,
  plan_name text,
  kinds text[] not null default '{}',
  budget text not null default '',
  timeline text not null default '',
  notes text not null default '',
  -- who to contact for this request (can differ from the account holder)
  contact jsonb not null default '{}'::jsonb,
  design jsonb,
  element_count integer not null default 0,
  assigned_to uuid references users (id) on delete set null,
  offer_amount numeric(14, 2),
  offer_currency text,
  offer_summary text,
  offer_valid_until date,
  offer_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index quote_requests_client_idx on quote_requests (client_id, created_at desc);
create index quote_requests_status_idx on quote_requests (status, created_at desc);

create table quote_events (
  id integer generated always as identity primary key,
  quote_id uuid not null references quote_requests (id) on delete cascade,
  actor_id uuid references users (id) on delete set null,
  kind text not null check (kind in ('status', 'progress', 'note', 'offer', 'system')),
  from_status text,
  to_status text,
  progress smallint,
  body text not null default '',
  -- internal team notes set this to false and never reach the client
  visible_to_client boolean not null default true,
  created_at timestamptz not null default now()
);
create index quote_events_quote_idx on quote_events (quote_id, id);

-- Down Migration
drop table if exists quote_events;
drop table if exists quote_requests;
drop sequence if exists quote_ref_seq;
