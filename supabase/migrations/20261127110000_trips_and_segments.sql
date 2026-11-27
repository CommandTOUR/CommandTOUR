-- Step 2a: trips and segments. Additive only.
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  mode text not null default 'flying' check (mode in ('flying','driving','carpool','books_own','rail','other')),
  trip_type text check (trip_type in ('round_trip','one_way_in','one_way_out','multi_city')),
  status text not null default 'not_started' check (status in ('not_started','good_to_book','pending_approval','booked','cancelled')),
  confirmation text,
  notes text,
  flagged boolean not null default false,
  needs_rework boolean not null default false,
  rework_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, staff_id, direction)
);
create index if not exists trips_event_idx on public.trips (event_id);
create index if not exists trips_staff_idx on public.trips (staff_id);

create table if not exists public.trip_segments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  seq int not null default 1,
  mode text not null default 'flight' check (mode in ('flight','rail','drive','other')),
  airline text,
  flight_number text,
  from_airport text,
  to_airport text,
  depart_date date,
  depart_time time,
  arrive_date date,
  arrive_time time,
  confirmation text,
  notes text,
  created_at timestamptz not null default now(),
  unique (trip_id, seq)
);
create index if not exists trip_segments_trip_idx on public.trip_segments (trip_id);

alter table public.trips enable row level security;
drop policy if exists ops_only on public.trips;
create policy ops_only on public.trips for all to authenticated
  using (public.is_ops()) with check (public.is_ops());

alter table public.trip_segments enable row level security;
drop policy if exists ops_only on public.trip_segments;
create policy ops_only on public.trip_segments for all to authenticated
  using (public.is_ops()) with check (public.is_ops());
