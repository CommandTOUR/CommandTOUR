-- Session 3B: Schedule, Tasks, Notes tabs

-- Schedule tab: per-event schedule rows, grouped by day
CREATE TABLE IF NOT EXISTS schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  day_date date NOT NULL,
  day_type text,
  time_start text,
  time_end text,
  what text,
  who text,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS schedule_items_event_id_idx ON schedule_items(event_id);

-- Schedule tab: per-day "Show Day" / "Day Off" toggle for days between load-in and load-out
CREATE TABLE IF NOT EXISTS event_schedule_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  day_date date NOT NULL,
  day_type text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (event_id, day_date)
);

-- Tasks tab: master checklist templates per tour type
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_type text NOT NULL,
  bucket text NOT NULL,
  task_name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Tasks tab: per-event task instances (seeded from task_templates)
CREATE TABLE IF NOT EXISTS event_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  bucket text NOT NULL,
  task_name text NOT NULL,
  completed boolean DEFAULT false,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_tasks_event_id_idx ON event_tasks(event_id);

-- Notes tab: one rich-text note per event
CREATE TABLE IF NOT EXISTS event_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE,
  content text,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Seed task templates: Hot Wheels Stunt Show (hwss)
INSERT INTO task_templates (tour_type, bucket, task_name, sort_order) VALUES
('hwss', '12 Weeks Out', 'LAV Send Over One Sheet of Needed Elements', 0),
('hwss', '12 Weeks Out', 'Labor Spreadsheet', 1),

('hwss', '6 Weeks Out', 'Management Flights - Tour Director', 0),
('hwss', '6 Weeks Out', 'Management Flights - Event Manager', 1),
('hwss', '6 Weeks Out', 'Management Flights - Front of House Manager', 2),
('hwss', '6 Weeks Out', 'LAV Flights', 3),
('hwss', '6 Weeks Out', 'Staff Flights', 4),
('hwss', '6 Weeks Out', 'Hotel Sheet Created', 5),
('hwss', '6 Weeks Out', 'Have Building Contact', 6),
('hwss', '6 Weeks Out', 'Sent Rider', 7),
('hwss', '6 Weeks Out', 'Advance Call', 8),
('hwss', '6 Weeks Out', 'Soft Load-In', 9),
('hwss', '6 Weeks Out', 'Container Grounding', 10),
('hwss', '6 Weeks Out', 'Passport Manifest', 11),
('hwss', '6 Weeks Out', 'EMT Quote', 12),
('hwss', '6 Weeks Out', 'Catering Menus & Quote', 13),

('hwss', '5 Weeks Out', 'LAV Review Post Event Notes LTP', 0),
('hwss', '5 Weeks Out', 'Operations Review Post Event Notes LTP', 1),
('hwss', '5 Weeks Out', 'Confirm Methanol Numbers', 2),
('hwss', '5 Weeks Out', 'Nitrogen', 3),
('hwss', '5 Weeks Out', 'Top Lube', 4),
('hwss', '5 Weeks Out', 'Purchase Cleaning Supplies', 5),
('hwss', '5 Weeks Out', 'Check Consumable Inventory', 6),
('hwss', '5 Weeks Out', 'Confirm Crush Car & Tire Numbers', 7),

('hwss', '1 Month Out', 'Inside Tracker Costs Updated', 0),
('hwss', '1 Month Out', 'Transportation Grid Shared', 1),
('hwss', '1 Month Out', 'Confirm Runner Schedule', 2),

('hwss', '2 Weeks Out', 'Send Tech Show Packet', 0),
('hwss', '2 Weeks Out', 'Track Map Created', 1),
('hwss', '2 Weeks Out', 'PreSettlement Received', 2),
('hwss', '2 Weeks Out', 'Outside Tracker Costs Updated', 3),

('hwss', 'Week Of', 'Confirm Logistics', 0),
('hwss', 'Week Of', 'Confirm Catering', 1),
('hwss', 'Week Of', 'Payroll', 2),
('hwss', 'Week Of', 'Order Consumables', 3),
('hwss', 'Week Of', 'Credential Board', 4),
('hwss', 'Week Of', 'Confirm Drinks & Snacks', 5),

('hwss', 'Load-In', 'Measure Track', 0),
('hwss', 'Load-In', 'Building Meeting Prep', 1),
('hwss', 'Load-In', 'Credential Board', 2),
('hwss', 'Load-In', 'VIP Credential', 3),
('hwss', 'Load-In', 'Announcer Meeting Prep', 4),
('hwss', 'Load-In', 'Performer Meeting Prep', 5),

('hwss', 'During Shows', 'Body Damage Pics', 0),
('hwss', 'During Shows', 'Send Departure Pickups', 1),
('hwss', 'During Shows', 'Travel Flying/Driving', 2),

('hwss', 'Post Show', 'Email Toy Inventory', 0),
('hwss', 'Post Show', 'Email Ops Consumables Inventory', 1),
('hwss', 'Post Show', 'Email VIP Inventory', 2),
('hwss', 'Post Show', 'Expenses', 3),
('hwss', 'Post Show', 'Post Event Report', 4),
('hwss', 'Post Show', 'Ops Notes', 5);

-- Seed task templates: Hot Wheels Monster Trucks Live (hwmt)
INSERT INTO task_templates (tour_type, bucket, task_name, sort_order) VALUES
('hwmt', '12 Weeks Out', 'LAV Send Over One Sheet of Needed Elements', 0),
('hwmt', '12 Weeks Out', 'Labor Spreadsheet', 1),

('hwmt', '6 Weeks Out', 'Management Flights - Tour Director', 0),
('hwmt', '6 Weeks Out', 'Management Flights - Event Manager', 1),
('hwmt', '6 Weeks Out', 'Management Flights - Front of House Manager', 2),
('hwmt', '6 Weeks Out', 'LAV Flights', 3),
('hwmt', '6 Weeks Out', 'Staff Flights', 4),
('hwmt', '6 Weeks Out', 'Truck Team Flights', 5),
('hwmt', '6 Weeks Out', 'Hotel Sheet Created', 6),
('hwmt', '6 Weeks Out', 'Hotel - Solo Room', 7),
('hwmt', '6 Weeks Out', 'Have Building Contact', 8),
('hwmt', '6 Weeks Out', 'Sent Rider', 9),
('hwmt', '6 Weeks Out', 'Advance Call', 10),
('hwmt', '6 Weeks Out', 'Soft Load-In', 11),
('hwmt', '6 Weeks Out', 'Container Grounding', 12),
('hwmt', '6 Weeks Out', 'Henx Rep', 13),
('hwmt', '6 Weeks Out', 'Crush Car Arrival', 14),
('hwmt', '6 Weeks Out', 'Passport Manifest', 15),
('hwmt', '6 Weeks Out', 'Telehandler Arrival', 16),
('hwmt', '6 Weeks Out', 'EMT Quote', 17),
('hwmt', '6 Weeks Out', 'Catering Menus & Quote', 18),

('hwmt', '5 Weeks Out', 'LAV Review Post Event Notes LTP', 0),
('hwmt', '5 Weeks Out', 'Operations Review Post Event Notes LTP', 1),
('hwmt', '5 Weeks Out', 'Confirm Methanol Numbers', 2),
('hwmt', '5 Weeks Out', 'Nitrogen', 3),
('hwmt', '5 Weeks Out', 'Top Lube', 4),
('hwmt', '5 Weeks Out', 'Purchase Cleaning Supplies', 5),
('hwmt', '5 Weeks Out', 'Check Consumable Inventory', 6),
('hwmt', '5 Weeks Out', 'Confirm Crush Car & Tire Numbers', 7),

('hwmt', '1 Month Out', 'Inside Tracker Costs Updated', 0),
('hwmt', '1 Month Out', 'Transportation Grid Shared with Leticia', 1),
('hwmt', '1 Month Out', 'Confirm Runner Schedule', 2),

('hwmt', '2 Weeks Out', 'Send Tech Show Packet', 0),
('hwmt', '2 Weeks Out', 'Track Map Created', 1),
('hwmt', '2 Weeks Out', 'PreSettlement Received', 2),
('hwmt', '2 Weeks Out', 'Outside Tracker Costs Updated', 3),

('hwmt', 'Week Of', 'Confirm Logistics', 0),
('hwmt', 'Week Of', 'Confirm Catering', 1),
('hwmt', 'Week Of', 'Payroll', 2),
('hwmt', 'Week Of', 'Order Consumables', 3),
('hwmt', 'Week Of', 'Credential Board', 4),
('hwmt', 'Week Of', 'Confirm Drinks & Snacks', 5),
('hwmt', 'Week Of', 'Airport Grid', 6),

('hwmt', 'Load-In', 'Measure Track', 0),
('hwmt', 'Load-In', 'Building Meeting Prep', 1),
('hwmt', 'Load-In', 'Credential Board', 2),
('hwmt', 'Load-In', 'VIP Credential', 3),
('hwmt', 'Load-In', 'Announcer Meeting Prep', 4),
('hwmt', 'Load-In', 'Performer Meeting Prep', 5),

('hwmt', 'During Shows', 'Body Damage Pics', 0),
('hwmt', 'During Shows', 'Send Departure Pickups', 1),
('hwmt', 'During Shows', 'Travel Flying/Driving', 2),

('hwmt', 'Post Show', 'Email Toy Inventory', 0),
('hwmt', 'Post Show', 'Email Ops Consumables Inventory', 1),
('hwmt', 'Post Show', 'Email VIP Inventory', 2),
('hwmt', 'Post Show', 'Expenses', 3),
('hwmt', 'Post Show', 'Post Event Report', 4),
('hwmt', 'Post Show', 'Ops Notes', 5);
