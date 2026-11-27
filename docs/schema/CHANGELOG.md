# Schema Changelog

Migrations after the 2026-11-26 snapshot, in order. Each file is in `supabase/migrations/` and is run by hand in the Supabase SQL editor.

1. `20261127090000_drop_unused_tables.sql`: dropped six unused empty tables (hotels, hotel_rooms, travel, event_staffing, event_ground_transport, event_perdiem_staff).
2. `20261127100000_roles_and_settings.sql`: roles and profiles, role helper functions, company settings, tour approvers.
3. `20261127100100_role_based_policies.sql`: replaced "any signed-in user" policies with role checks (rollback in `supabase/rollbacks/`).
4. `20261127110000_trips_and_segments.sql`: new `trips` and `trip_segments` tables, one trip per person per direction per event with any number of segments.
5. `20261127120000_trip_hold_and_room_types.sql`: trip status `not_started` becomes `hold` (new default), and room types `Single` and `Double` become `1 Bed` and `2 Bed`.
6. `20261127130000_logistics_and_money.sql`: new `event_travelers` (room, per diem, rental and extra-day flags, backfilled from `event_staff_travel`), `ground_legs`, `trip_costs` and `event_budgets`; hotel rates, contacts and dates on `event_hotel`; cost group, rate override and parking on `event_hotel_rooms`; estimated and actual cost on `event_rental_cars`.
7. `20261127140000_needs_approval_status.sql`: trip status `pending_approval` is renamed `needs_approval` (check constraint updated).
8. `20261127110100_drop_old_travel_tables.sql`: run last, only after the travel workspace is merged and live. Drops `event_travel_arrivals`, `event_travel_departures`, `event_staff_travel`, the legacy `staff_assignments` travel columns and booking flags, and unused `event_hotel_rooms` columns (`staff_id`, `hotel_id`, `beds`, and `rate_override`, which the Hotel tab no longer uses).
