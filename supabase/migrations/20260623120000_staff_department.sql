-- Add department column to staff table
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS department text DEFAULT 'uncategorized';

-- Backfill existing rows
UPDATE staff SET department = 'uncategorized' WHERE department IS NULL;
