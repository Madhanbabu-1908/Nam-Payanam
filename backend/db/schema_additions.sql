-- Nam Payanam Schema Additions (run after schema.sql)
-- Adds: break_stops, route_distances, member_sessions

-- BREAK STOPS table (during active trip)
CREATE TABLE IF NOT EXISTS break_stops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 1,
  added_by_nickname VARCHAR(100) NOT NULL,
  reason TEXT NOT NULL,
  location VARCHAR(255),
  activities TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEMBER SESSIONS table (for trip history)
CREATE TABLE IF NOT EXISTS member_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  member_id UUID,
  member_row_id UUID,
  nickname VARCHAR(100) NOT NULL,
  is_organizer BOOLEAN DEFAULT FALSE,
  trip_code VARCHAR(8) NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, trip_code)
);

-- ROUTE DISTANCES cache
CREATE TABLE IF NOT EXISTS route_distances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  from_location VARCHAR(255),
  to_location VARCHAR(255),
  distance_km DECIMAL(10,2),
  duration_minutes INTEGER,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE break_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_distances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access break_stops" ON break_stops FOR ALL USING (true);
CREATE POLICY "Service role full access member_sessions" ON member_sessions FOR ALL USING (true);
CREATE POLICY "Service role full access route_distances" ON route_distances FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE break_stops;

CREATE INDEX idx_breaks_trip ON break_stops(trip_id);
CREATE INDEX idx_sessions_session_id ON member_sessions(session_id);
