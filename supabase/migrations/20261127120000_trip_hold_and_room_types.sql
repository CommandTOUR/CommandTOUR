alter table public.trips drop constraint if exists trips_status_check;
update public.trips set status = 'hold' where status = 'not_started';
alter table public.trips alter column status set default 'hold';
alter table public.trips add constraint trips_status_check
  check (status in ('hold','good_to_book','pending_approval','booked','cancelled'));

update public.event_hotel_rooms set room_type = '1 Bed' where lower(trim(room_type)) = 'single';
update public.event_hotel_rooms set room_type = '2 Bed' where lower(trim(room_type)) = 'double';
