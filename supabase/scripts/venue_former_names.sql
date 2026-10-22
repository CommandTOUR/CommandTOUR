-- Former/alternate venue names, so renamed venues are still found by their old name
-- and the duplicate guard can recognise them. Review, then paste into the Supabase SQL editor.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS former_names text[] DEFAULT '{}';
