-- ============================================================
-- Nam Payanam (நம் பயணம்) — Complete Database Schema v2
-- Run this in Supabase SQL Editor (replaces previous schema)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USER SESSIONS (anonymous, device-based) ──────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id VARCHAR(36) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRIPS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_code VARCHAR(8) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  organizer_id UUID NOT NULL,
  organizer_name VARCHAR(100) NOT NULL,
  start_location VARCHAR(255) NOT NULL,
  start_lat DECIMAL(10,7),
  start_lng DECIMAL(10,7),
  end_location VARCHAR(255) NOT NULL,
  end_lat DECIMAL(10,7),
  end_lng DECIMAL(10,7),
  stops JSONB DEFAULT '[]',
  route_data JSONB DEFAULT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  group_size INTEGER NOT NULL DEFAULT 4,
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning','active','completed','deleted')),
  plan_mode VARCHAR(20) DEFAULT 'ai' CHECK (plan_mode IN ('ai','manual')),
  ai_plan JSONB DEFAULT NULL,
  selected_plan_index INTEGER DEFAULT 0,
  preferences JSONB DEFAULT '{}',
  fuel_data JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SESSION ↔ TRIP LINK ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_trips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  member_id UUID,
  nickname VARCHAR(100) NOT NULL,
  is_organizer BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, trip_id)
);

-- ── TRIP MEMBERS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  member_id UUID DEFAULT uuid_generate_v4(),
  nickname VARCHAR(100) NOT NULL,
  is_organizer BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, nickname)
);

-- ── TRIP DAYS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_days (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE,
  title VARCHAR(255),
  stops JSONB DEFAULT '[]',
  notes TEXT,
  is_reached BOOLEAN DEFAULT FALSE,
  weather_data JSONB DEFAULT NULL,
  UNIQUE(trip_id, day_number)
);

-- ── BREAK ENTRIES (new) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_breaks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 0,
  added_by_nickname VARCHAR(100) NOT NULL,
  stop_name VARCHAR(255) NOT NULL,
  break_type VARCHAR(50) DEFAULT 'rest',
  custom_type VARCHAR(100),
  description TEXT,
  location_name VARCHAR(255),
  location_lat DECIMAL(10,7),
  location_lng DECIMAL(10,7),
  checkin_time TIMESTAMPTZ,
  checkout_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── EXPENSES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 0,
  break_id UUID REFERENCES trip_breaks(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) DEFAULT 'other',
  paid_by_member_id UUID REFERENCES trip_members(id) ON DELETE SET NULL,
  paid_by_nickname VARCHAR(100) NOT NULL,
  split_type VARCHAR(20) DEFAULT 'equal' CHECK (split_type IN ('equal','manual')),
  splits JSONB DEFAULT '[]',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRIP PROGRESS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  current_stop_index INTEGER DEFAULT 0,
  current_lat DECIMAL(10,7),
  current_lng DECIMAL(10,7),
  current_speed DECIMAL(6,2) DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ANNOUNCEMENTS (new) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  posted_by VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info','warning','alert','milestone')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── PUSH SUBSCRIPTIONS (new) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  member_nickname VARCHAR(100) NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, member_nickname)
);

-- ── RLS POLICIES ─────────────────────────────────────────────
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all_trips" ON trips FOR ALL USING (true);
CREATE POLICY "service_all_members" ON trip_members FOR ALL USING (true);
CREATE POLICY "service_all_days" ON trip_days FOR ALL USING (true);
CREATE POLICY "service_all_expenses" ON expenses FOR ALL USING (true);
CREATE POLICY "service_all_progress" ON trip_progress FOR ALL USING (true);
CREATE POLICY "service_all_breaks" ON trip_breaks FOR ALL USING (true);
CREATE POLICY "service_all_announcements" ON trip_announcements FOR ALL USING (true);
CREATE POLICY "service_all_push" ON push_subscriptions FOR ALL USING (true);
CREATE POLICY "service_all_sessions" ON user_sessions FOR ALL USING (true);
CREATE POLICY "service_all_session_trips" ON session_trips FOR ALL USING (true);

-- ── REALTIME ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE trip_members;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_days;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_breaks;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_announcements;

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trips_code ON trips(trip_code);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_members_trip ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_day ON expenses(trip_id, day_number);
CREATE INDEX IF NOT EXISTS idx_days_trip ON trip_days(trip_id);
CREATE INDEX IF NOT EXISTS idx_breaks_trip ON trip_breaks(trip_id);
CREATE INDEX IF NOT EXISTS idx_announcements_trip ON trip_announcements(trip_id);
CREATE INDEX IF NOT EXISTS idx_session_trips ON session_trips(session_id);
