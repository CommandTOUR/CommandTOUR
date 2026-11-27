-- Travel rows that were booked for a person who has since been moved, swapped, pulled or removed from the event.
-- The staffing grid never deletes booked travel; it flags it so someone can rework it.
-- (event_travel_*.flagged already exists but means "person is not confirmed", so it is not reused.)
alter table public.event_travel_arrivals   add column if not exists needs_rework boolean not null default false;
alter table public.event_travel_arrivals   add column if not exists rework_note  text;
alter table public.event_travel_departures add column if not exists needs_rework boolean not null default false;
alter table public.event_travel_departures add column if not exists rework_note  text;
