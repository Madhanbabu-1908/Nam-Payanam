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

-- ── V3 ADDITIONS ──────────────────────────────────────────────────────────────

-- Live GPS tracking table (organiser broadcasts, everyone reads)
CREATE TABLE IF NOT EXISTS live_locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  accuracy DECIMAL(10,2),
  heading DECIMAL(6,2),
  speed DECIMAL(8,2),
  altitude DECIMAL(10,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Completed path segments (green line on map)
CREATE TABLE IF NOT EXISTS travel_path (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public tracking tokens (for external observers)
CREATE TABLE IF NOT EXISTS tracking_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  token VARCHAR(32) UNIQUE NOT NULL,
  label VARCHAR(100),
  created_by_nickname VARCHAR(100),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Break stops: add lat/lng columns if not present
ALTER TABLE break_stops ADD COLUMN IF NOT EXISTS lat DECIMAL(10,7);
ALTER TABLE break_stops ADD COLUMN IF NOT EXISTS lng DECIMAL(10,7);

-- Trip: add detailed planning fields
ALTER TABLE trips ADD COLUMN IF NOT EXISTS transport_type VARCHAR(20) DEFAULT 'own_vehicle';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20) DEFAULT 'car';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(12,2);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS stay_preferences JSONB DEFAULT '[]';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS day_assignments JSONB DEFAULT '{}';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS planning_answers JSONB DEFAULT '{}';

ALTER TABLE live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_path ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All access live_locations" ON live_locations FOR ALL USING (true);
CREATE POLICY "All access travel_path" ON travel_path FOR ALL USING (true);
CREATE POLICY "All access tracking_tokens" ON tracking_tokens FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE live_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE travel_path;
ALTER PUBLICATION supabase_realtime ADD TABLE tracking_tokens;

CREATE INDEX idx_live_loc_trip ON live_locations(trip_id);
CREATE INDEX idx_path_trip ON travel_path(trip_id, recorded_at);
CREATE INDEX idx_token ON tracking_tokens(token);
