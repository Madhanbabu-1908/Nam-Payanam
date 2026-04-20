-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE (Extends Auth)
-- Usually handled by Supabase Auth, but we can create a public profile table if needed.
-- For now, we rely on auth.users and reference IDs.

-- 2. TRIPS TABLE
create table trips (
  id uuid default uuid_generate_v4() primary key,
  organizer_id uuid references auth.users not null,
  name text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  budget numeric default 0,
  mode text check (mode in ('AI', 'MANUAL')) default 'MANUAL',
  status text check (status in ('PLANNING', 'ACTIVE', 'COMPLETED')) default 'PLANNING',
  created_at timestamptz default now()
);

-- 3. TRIP MEMBERS TABLE
create table trip_members (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references trips(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  role text check (role in ('ORGANIZER', 'PARTICIPANT', 'VIEWER')) default 'PARTICIPANT',
  joined_at timestamptz default now(),
  unique(trip_id, user_id)
);

-- 4. ITINERARY ITEMS TABLE
create table itinerary_items (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references trips(id) on delete cascade not null,
  day_number int not null,
  time_slot text,
  location_name text not null,
  description text,
  latitude numeric,
  longitude numeric,
  estimated_cost numeric
);

-- 5. EXPENSES TABLE
create table expenses (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references trips(id) on delete cascade not null,
  amount numeric not null,
  category text default 'OTHER',  description text,
  paid_by_user_id uuid references auth.users not null,
  date date default current_date,
  created_at timestamptz default now()
);

-- 6. EXPENSE SPLITS TABLE
create table expense_splits (
  id uuid default uuid_generate_v4() primary key,
  expense_id uuid references expenses(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  amount_owed numeric not null,
  is_settled boolean default false
);

-- 🔒 ROW LEVEL SECURITY (RLS) POLICIES
alter table trips enable row level security;
alter table trip_members enable row level security;
alter table itinerary_items enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;

-- Policy: Users can see trips they are members of
create policy "Members can view trips" on trips
  for select using (
    id in (select trip_id from trip_members where user_id = auth.uid())
    OR organizer_id = auth.uid()
  );

-- Policy: Organizers can insert/update/delete trips
create policy "Organizers can modify trips" on trips
  for all using (organizer_id = auth.uid());

-- Policy: Members can view itinerary
create policy "Members can view itinerary" on itinerary_items
  for select using (
    trip_id in (select trip_id from trip_members where user_id = auth.uid())
  );

-- Policy: Organizers can modify itinerary (or participants if you allow collaboration)
create policy "Organizers can modify itinerary" on itinerary_items
  for all using (
    trip_id in (select trip_id from trip_members where user_id = auth.uid() and role = 'ORGANIZER')
  );

-- Policy: Members can view expenses
create policy "Members can view expenses" on expenses
  for select using (
    trip_id in (select trip_id from trip_members where user_id = auth.uid())
  );
-- Policy: Any member can add expenses
create policy "Members can add expenses" on expenses
  for insert with check (
    trip_id in (select trip_id from trip_members where user_id = auth.uid())
  );

-- Policy: Members can view splits
create policy "Members can view splits" on expense_splits
  for select using (
    expense_id in (select id from expenses where trip_id in (select trip_id from trip_members where user_id = auth.uid()))
  );

-- ✅ CASCADE DELETE IS HANDLED BY 'on delete cascade' in table definitions above.