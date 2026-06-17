CREATE TABLE IF NOT EXISTS staffing_grid_settings (
  id text PRIMARY KEY DEFAULT 'global',
  position_order jsonb NOT NULL DEFAULT '{}'
);

INSERT INTO staffing_grid_settings (id, position_order)
VALUES ('global', '{}')
ON CONFLICT (id) DO NOTHING;
