-- 01: READ-ONLY. All non-deleted tours with their event and position counts.
SELECT t.id, t.name, t.year, t.sort_order, t.color,
       (SELECT count(*) FROM events e WHERE e.tour_id = t.id AND e.deleted_at IS NULL) AS events,
       (SELECT count(*) FROM tour_positions p WHERE p.tour_id = t.id AND p.deleted_at IS NULL) AS tour_positions
FROM tours t
WHERE t.deleted_at IS NULL
ORDER BY t.sort_order NULLS LAST, t.year, t.name;
