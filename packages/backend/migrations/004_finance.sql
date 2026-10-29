-- Up Migration
-- Invoices and payments. Every invoice carries its own currency; nothing is ever summed across currencies.
-- "paid", "partial" and "overdue" are derived from payments and the due date, never stored.

create sequence invoice_seq start 1;

create table invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  client_id uuid not null references users (id) on delete restrict,
  quote_id uuid references quote_requests (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'void')),
  currency text not null check (char_length(currency) = 3),
  subtotal numeric(14, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 0,
  tax numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  issued_on date,
  due_on date not null,
  notes text not null default '',
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  voided_at timestamptz
);
create index invoices_client_idx on invoices (client_id, created_at desc);
create index invoices_status_idx on invoices (status, due_on);

create table invoice_items (
  id integer generated always as identity primary key,
  invoice_id uuid not null references invoices (id) on delete cascade,
  position integer not null,
  description text not null,
  qty numeric(12, 2) not null,
  unit_price numeric(14, 2) not null,
  amount numeric(14, 2) not null
);
create index invoice_items_invoice_idx on invoice_items (invoice_id, position);

create table payments (
  id integer generated always as identity primary key,
  invoice_id uuid not null references invoices (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  method text not null check (method in ('bank_transfer', 'cash', 'cheque', 'card', 'e_wallet', 'other')),
  reference text not null default '',
  paid_on date not null,
  note text not null default '',
  recorded_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index payments_invoice_idx on payments (invoice_id);
create index payments_paid_on_idx on payments (paid_on);

-- Down Migration
drop table if exists payments;
drop table if exists invoice_items;
drop table if exists invoices;
drop sequence if exists invoice_seq;
