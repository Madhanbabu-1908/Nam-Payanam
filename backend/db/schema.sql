-- Nam Payanam Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TRIPS table
CREATE TABLE trips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_code VARCHAR(8) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  organizer_id UUID NOT NULL,
  organizer_name VARCHAR(100) NOT NULL,
  start_location VARCHAR(255) NOT NULL,
  end_location VARCHAR(255) NOT NULL,
  stops JSONB DEFAULT '[]',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  group_size INTEGER NOT NULL DEFAULT 4,
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning','active','completed')),
  ai_plan JSONB DEFAULT NULL,
  selected_plan_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIP MEMBERS table
CREATE TABLE trip_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  member_id UUID DEFAULT uuid_generate_v4(),
  nickname VARCHAR(100) NOT NULL,
  is_organizer BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, nickname)
);

-- TRIP DAYS table (itinerary)
CREATE TABLE trip_days (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE,
  title VARCHAR(255),
  stops JSONB DEFAULT '[]',
  notes TEXT,
  is_reached BOOLEAN DEFAULT FALSE,
  UNIQUE(trip_id, day_number)
);

-- EXPENSES table
CREATE TABLE expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 0,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) DEFAULT 'other' CHECK (category IN ('food','transport','stay','activity','shopping','other')),
  paid_by_member_id UUID REFERENCES trip_members(id) ON DELETE SET NULL,
  paid_by_nickname VARCHAR(100) NOT NULL,
  split_type VARCHAR(20) DEFAULT 'equal' CHECK (split_type IN ('equal','manual')),
  splits JSONB DEFAULT '[]',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIP PROGRESS table
CREATE TABLE trip_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  current_stop_index INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) - Permissive for trip-code based access
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_progress ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all via service role key (backend handles auth logic)
CREATE POLICY "Service role full access trips" ON trips FOR ALL USING (true);
CREATE POLICY "Service role full access members" ON trip_members FOR ALL USING (true);
CREATE POLICY "Service role full access days" ON trip_days FOR ALL USING (true);
CREATE POLICY "Service role full access expenses" ON expenses FOR ALL USING (true);
CREATE POLICY "Service role full access progress" ON trip_progress FOR ALL USING (true);

-- Real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE trip_members;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_days;

-- Indexes for performance
CREATE INDEX idx_trips_code ON trips(trip_code);
CREATE INDEX idx_members_trip ON trip_members(trip_id);
CREATE INDEX idx_expenses_trip ON expenses(trip_id);
CREATE INDEX idx_expenses_day ON expenses(trip_id, day_number);
CREATE INDEX idx_days_trip ON trip_days(trip_id);
