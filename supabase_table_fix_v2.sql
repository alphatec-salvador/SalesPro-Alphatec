-- ═══════════════════════════════════════════════════════════════
-- SalesOps Pro — Table Structure Fix v2
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

drop table if exists products cascade;
create table products (
  id integer primary key,
  code text,
  "desc" text,
  type text,
  unit text,
  "group" text,
  selling_price numeric(12,2) default 0,
  unit_cost numeric(12,2) default 0,
  qty_in numeric(10,2) default 0,
  qty_ord numeric(10,2) default 0,
  qty_alloc numeric(10,2) default 0,
  reorder numeric(10,2) default 0,
  created_at timestamptz default now()
);
alter table products enable row level security;
create policy "Allow all" on products for all using (true);

drop table if exists leads cascade;
create table leads (
  id integer primary key,
  name text,
  company text,
  stage text,
  value numeric(14,2) default 0,
  owner text,
  last_contact text,
  next_action text,
  status text default 'Active',
  created_at timestamptz default now()
);
alter table leads enable row level security;
create policy "Allow all" on leads for all using (true);

drop table if exists client_pos cascade;
create table client_pos (
  id integer primary key,
  po_number text,
  client_name text,
  date text,
  status text,
  terms text,
  delivery text,
  prod_total numeric(14,2) default 0,
  svc_total numeric(14,2) default 0,
  total_amount numeric(14,2) default 0,
  created_at timestamptz default now()
);
alter table client_pos enable row level security;
create policy "Allow all" on client_pos for all using (true);

drop table if exists supplier_pos cascade;
create table supplier_pos (
  id integer primary key,
  po_number text,
  supplier_name text,
  linked_cpo text,
  date text,
  delivery text,
  status text,
  lines jsonb,
  total_amount numeric(14,2) default 0,
  paid numeric(14,2) default 0,
  balance numeric(14,2) default 0,
  created_at timestamptz default now()
);
alter table supplier_pos enable row level security;
create policy "Allow all" on supplier_pos for all using (true);

drop table if exists invoices cascade;
create table invoices (
  id integer primary key,
  invoice_number text,
  client_name text,
  po_ref text,
  date text,
  due_date text,
  terms text,
  total_amount numeric(14,2) default 0,
  amount_paid numeric(14,2) default 0,
  status text,
  created_at timestamptz default now()
);
alter table invoices enable row level security;
create policy "Allow all" on invoices for all using (true);

drop table if exists expenses cascade;
create table expenses (
  id integer primary key,
  ref text,
  date text,
  month text,
  category text,
  description text,
  payee text,
  amount numeric(12,2) default 0,
  payment_mode text,
  status text,
  created_at timestamptz default now()
);
alter table expenses enable row level security;
create policy "Allow all" on expenses for all using (true);

drop table if exists accounts_receivable;
drop table if exists accounts_payable;
