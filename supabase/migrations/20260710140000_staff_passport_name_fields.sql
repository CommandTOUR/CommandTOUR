ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS middle_name text,
  ADD COLUMN IF NOT EXISTS suffix text,
  ADD COLUMN IF NOT EXISTS passport_surname text,
  ADD COLUMN IF NOT EXISTS passport_given_names text,
  ADD COLUMN IF NOT EXISTS place_of_birth text,
  ADD COLUMN IF NOT EXISTS date_of_issue date;
