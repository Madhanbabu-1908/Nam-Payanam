-- ============================================================
-- Nam Payanam v8 — DB Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. itinerary_stops ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS itinerary_stops (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id           UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number        INTEGER NOT NULL DEFAULT 1,
  name              TEXT NOT NULL,
  stop_type         TEXT NOT NULL DEFAULT 'STOP'
                    CHECK (stop_type IN ('HOTEL','FOOD','ATTRACTION','VIEWPOINT','FUEL','REST','START','END','STOP','OTHER')),
  time_of_day       TIME,
  duration_minutes  INTEGER DEFAULT 60,
  cost_estimate     NUMERIC(10,2) DEFAULT 0,
  notes             TEXT,
  latitude          NUMERIC(10,7),
  longitude         NUMERIC(10,7),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_itinerary_trip ON itinerary_stops(trip_id, day_number);

-- ── 2. expense_splits ────────────────────────────────────────
-- (May already exist — safe to add columns if missing)
CREATE TABLE IF NOT EXISTS expense_splits (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  expense_id   UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  amount_owed  NUMERIC(10,2) NOT NULL,
  is_settled   BOOLEAN DEFAULT FALSE,
  settled_at   TIMESTAMPTZ,
  settled_by   UUID,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_splits_user    ON expense_splits(user_id);

-- Add split_mode to expenses if not exists
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS split_mode TEXT DEFAULT 'equal'
  CHECK (split_mode IN ('equal','manual'));

-- ── 3. settlement_transactions ───────────────────────────────
CREATE TABLE IF NOT EXISTS settlement_transactions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id        UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_user_id   UUID NOT NULL,
  to_user_id     UUID NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  recorded_by    UUID,
  settled_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_settle_trip ON settlement_transactions(trip_id);

-- ── 4. checkins ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkins (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id        UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL,
  location_name  TEXT NOT NULL,
  latitude       NUMERIC(10,7),
  longitude      NUMERIC(10,7),
  status         TEXT DEFAULT 'PRESENT' CHECK (status IN ('PRESENT','WAITING','DONE')),
  is_active      BOOLEAN DEFAULT TRUE,
  checked_in_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id)   -- one active check-in per user per trip (upsert)
);
CREATE INDEX IF NOT EXISTS idx_checkins_trip ON checkins(trip_id, is_active);

-- ── 5. route_waypoints on trips ──────────────────────────────
-- Store the ordered waypoints used when creating the trip
ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_waypoints JSONB DEFAULT '[]';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_code TEXT;

-- Auto-generate trip_code for existing trips that don't have one
UPDATE trips SET trip_code = upper(substring(replace(gen_random_uuid()::text,'-',''),1,6))
WHERE trip_code IS NULL;

-- ── 6. RLS Policies ──────────────────────────────────────────
ALTER TABLE itinerary_stops      ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins             ENABLE ROW LEVEL SECURITY;

-- Allow trip members to read itinerary
CREATE POLICY IF NOT EXISTS "trip_members_read_itinerary"
  ON itinerary_stops FOR SELECT
  USING (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
    OR trip_id IN (SELECT id FROM trips WHERE organizer_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "organizer_write_itinerary"
  ON itinerary_stops FOR ALL
  USING (trip_id IN (SELECT id FROM trips WHERE organizer_id = auth.uid()));

-- Expense splits: trip members can read, system can write
CREATE POLICY IF NOT EXISTS "members_read_splits"
  ON expense_splits FOR SELECT
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
         OR trip_id IN (SELECT id FROM trips WHERE organizer_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "members_write_splits"
  ON expense_splits FOR ALL
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
         OR trip_id IN (SELECT id FROM trips WHERE organizer_id = auth.uid()));

-- Settlement transactions
CREATE POLICY IF NOT EXISTS "members_manage_settlements"
  ON settlement_transactions FOR ALL
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
         OR trip_id IN (SELECT id FROM trips WHERE organizer_id = auth.uid()));

-- Check-ins
CREATE POLICY IF NOT EXISTS "members_manage_checkins"
  ON checkins FOR ALL
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
         OR trip_id IN (SELECT id FROM trips WHERE organizer_id = auth.uid()));

-- ── 7. Realtime ──────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_splits;
ALTER PUBLICATION supabase_realtime ADD TABLE settlement_transactions;

-- ============================================================
-- Done. Summary of changes:
-- • itinerary_stops    — day-wise trip plan stops (AI + manual)
-- • expense_splits     — per-person expense share tracking
-- • settlement_transactions — payment records
-- • checkins           — member location check-ins (live map pins)
-- • route_waypoints    — ordered lat/lng waypoints per trip
-- • trip_code          — 6-char shareable code per trip
-- ============================================================
