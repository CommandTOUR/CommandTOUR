-- Step 2b: run ONLY after the travel workspace (trips, ground transport, hotel, per diem, costs) is merged and live.
-- Nothing in the app reads or writes any of these any more.
drop table if exists public.event_travel_arrivals;
drop table if exists public.event_travel_departures;

-- Replaced by public.event_travelers (backfilled by 20261127130000).
drop table if exists public.event_staff_travel;

-- Legacy travel columns on staff_assignments. Trips are now the source of travel dates and booking status.
alter table public.staff_assignments
  drop column if exists travel_in_date,
  drop column if exists travel_out_date,
  drop column if exists travel_type,
  drop column if exists good_to_book,
  drop column if exists booked;

-- Unused columns on event_hotel_rooms. Guests are staff_id_1 and staff_id_2; the room size is room_type.
alter table public.event_hotel_rooms
  drop column if exists staff_id,
  drop column if exists hotel_id,
  drop column if exists beds;

-- The per-room rate override was removed from the Hotel tab (the rate comes from the room type).
alter table public.event_hotel_rooms drop column if exists rate_override;
