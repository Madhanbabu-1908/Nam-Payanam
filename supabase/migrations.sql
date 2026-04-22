-- ================================================================
-- NAM PAYANAM — Schema Migrations
-- Run this in Supabase SQL Editor AFTER the existing schema.sql
-- ================================================================

-- Add missing columns to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS start_location TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_lat NUMERIC;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_lng NUMERIC;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS start_lat NUMERIC;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS start_lng NUMERIC;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS route JSONB; -- Stores {type: "LineString", coordinates: [[lng,lat],...]}
ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_code TEXT UNIQUE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to itinerary_items
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Live tracking table (GPS positions)
CREATE TABLE IF NOT EXISTS trip_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  speed NUMERIC DEFAULT 0,
  heading NUMERIC DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Chat history per trip
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT CHECK (role IN ('user','assistant')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  preferred_lang TEXT DEFAULT 'en',
  dark_mode BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generate trip_code for existing trips that don't have one
UPDATE trips SET trip_code = UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 6))
WHERE trip_code IS NULL;

-- RLS for new tables
ALTER TABLE trip_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tracking" ON trip_tracking
  FOR SELECT USING (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
    OR trip_id IN (SELECT id FROM trips WHERE organizer_id = auth.uid())
  );

CREATE POLICY "User can insert own location" ON trip_tracking
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "User can view own chat" ON ai_chat_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "User can insert own chat" ON ai_chat_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "User can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "User can update own profile" ON profiles
  FOR ALL USING (id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tracking_trip ON trip_tracking(trip_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_trip ON ai_chat_history(trip_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trips_code ON trips(trip_code);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trip_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_history;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
