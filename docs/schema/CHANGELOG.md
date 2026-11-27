# Schema Changelog

Migrations after the 2026-11-26 snapshot, in order. Each file is in `supabase/migrations/` and is run by hand in the Supabase SQL editor.

1. `20261127090000_drop_unused_tables.sql`: dropped six unused empty tables (hotels, hotel_rooms, travel, event_staffing, event_ground_transport, event_perdiem_staff).
2. `20261127100000_roles_and_settings.sql`: roles and profiles, role helper functions, company settings, tour approvers.
3. `20261127100100_role_based_policies.sql`: replaced "any signed-in user" policies with role checks (rollback in `supabase/rollbacks/`).
4. `20261127110000_trips_and_segments.sql`: new `trips` and `trip_segments` tables, one trip per person per direction per event with any number of segments.
5. `20261127110100_drop_old_travel_tables.sql`: drops `event_travel_arrivals` and `event_travel_departures`; run only after the Travelers tab is live.
