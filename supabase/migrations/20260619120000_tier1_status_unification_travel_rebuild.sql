-- Tier 1: Status unification + Travel column additions

-- Fix 1: Unify staffing statuses
UPDATE event_staff SET status = 'pending' WHERE status = 'scheduled' OR status IS NULL;
UPDATE event_staff SET status = 'needs_attention' WHERE status = 'attention';

-- Fix 3: Add travel_type and airline columns to travel tables
ALTER TABLE event_travel_arrivals ADD COLUMN IF NOT EXISTS travel_type text DEFAULT 'flight';
ALTER TABLE event_travel_arrivals ADD COLUMN IF NOT EXISTS airline text;
ALTER TABLE event_travel_departures ADD COLUMN IF NOT EXISTS travel_type text DEFAULT 'flight';
ALTER TABLE event_travel_departures ADD COLUMN IF NOT EXISTS airline text;
