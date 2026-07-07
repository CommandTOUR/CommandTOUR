-- ============================================
-- PHASE 1: Departments, Positions, Tour Positions,
-- and restructured staff assignments
-- ============================================

CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (department_id, title)
);

CREATE TABLE tour_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  quantity_needed int NOT NULL DEFAULT 1 CHECK (quantity_needed >= 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE (tour_id, position_id)
);

-- event_staff dropped: confirmed nothing else FKs into event_staff.id.
-- This is destructive — all current position/status/notes/travel_* data
-- is lost, per the earlier decision to rebuild staffing manually.
DROP TABLE IF EXISTS event_staff;

CREATE TABLE staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_position_id uuid NOT NULL REFERENCES tour_positions(id) ON DELETE CASCADE,
  slot_index int NOT NULL,           -- internal only, never rendered as text
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,  -- NULL = tour-level default; set = event-specific override
  status text DEFAULT 'pending',
  confirmed boolean DEFAULT false,
  notes text,
  travel_in_date date,
  travel_out_date date,
  travel_type text,
  created_at timestamptz DEFAULT now(),
  -- Handles the event-specific override case (event_id IS NOT NULL):
  UNIQUE (tour_position_id, slot_index, event_id)
);

-- Handles the tour-level default case (event_id IS NULL), where the
-- table-level UNIQUE above can't catch duplicates since NULL != NULL:
CREATE UNIQUE INDEX uq_staff_assignments_default_slot
  ON staff_assignments(tour_position_id, slot_index)
  WHERE event_id IS NULL;

CREATE INDEX idx_staff_assignments_tour_position ON staff_assignments(tour_position_id);
CREATE INDEX idx_staff_assignments_event ON staff_assignments(event_id);
CREATE INDEX idx_staff_assignments_staff ON staff_assignments(staff_id);

INSERT INTO departments (name, sort_order) VALUES
  ('Executives', 1),
  ('Operations', 2),
  ('Lighting, Audio & Video', 3),
  ('Hosts', 4),
  ('FMX', 5),
  ('Stuntman Show Productions', 6),
  ('Robot Operators', 7);
