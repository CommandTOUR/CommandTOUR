CREATE TABLE IF NOT EXISTS staff_airports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  iata_code text NOT NULL,
  city text,
  state text,
  airport_name text,
  is_primary boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_airports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_access_staff_airports"
  ON staff_airports FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
