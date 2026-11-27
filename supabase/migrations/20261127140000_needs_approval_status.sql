alter table public.trips drop constraint if exists trips_status_check;
update public.trips set status = 'needs_approval' where status = 'pending_approval';
alter table public.trips add constraint trips_status_check
  check (status in ('hold','good_to_book','needs_approval','booked','cancelled'));
