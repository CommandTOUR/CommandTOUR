-- Staff page department taxonomy (separate from staffing grid departments)
CREATE TABLE staff_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_access_staff_departments"
  ON staff_departments FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO staff_departments (name, sort_order) VALUES
  ('Executives', 1),
  ('Operations', 2),
  ('Lighting, Audio & Video', 3),
  ('Hosts', 4),
  ('FMX', 5),
  ('Stuntmanshow Productions', 6),
  ('Robot Operators', 7);

ALTER TABLE staff ADD COLUMN staff_department_id uuid
  REFERENCES staff_departments(id) ON DELETE SET NULL;
