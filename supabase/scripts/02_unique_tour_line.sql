-- 02: one tour per line (sort_order). Run after you have deleted the stray tour(s).

-- (a) READ-ONLY pre-check: any sort_order listed here has duplicates and must be fixed first (expect no rows)
SELECT sort_order, count(*) AS tours, array_agg(id) AS tour_ids
FROM tours
WHERE deleted_at IS NULL AND sort_order IS NOT NULL
GROUP BY sort_order
HAVING count(*) > 1;

-- (b) WRITE
CREATE UNIQUE INDEX IF NOT EXISTS tours_line_unique
  ON tours (sort_order)
  WHERE deleted_at IS NULL;
