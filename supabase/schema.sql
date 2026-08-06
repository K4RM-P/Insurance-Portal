-- Run this in the Supabase SQL editor for your project.

create extension if not exists pgcrypto;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  dob date,
  address text,
  phone text,
  email text,
  is_sample boolean default false,
  updated_at timestamptz not null default now()
);

create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  company_name text,
  plan_name text,
  policy_number text,
  assured_amount numeric,
  premium_frequency text,
  premium_amount numeric,
  next_premium_due_date date,
  term integer,
  commencement_date date,
  maturity_date date,
  is_sample boolean default false,
  updated_at timestamptz not null default now()
);

create index if not exists policies_client_id_idx on policies(client_id);
create index if not exists clients_user_id_idx on clients(user_id);
create index if not exists policies_user_id_idx on policies(user_id);

alter table clients enable row level security;
alter table policies enable row level security;

create policy "clients_owner_all" on clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "policies_owner_all" on policies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_set_updated_at
  before update on clients
  for each row execute function set_updated_at();

create trigger policies_set_updated_at
  before update on policies
  for each row execute function set_updated_at();

-- Enable Realtime for live multi-device sync (Database > Replication in the dashboard,
-- or run):
alter publication supabase_realtime add table clients;
alter publication supabase_realtime add table policies;
