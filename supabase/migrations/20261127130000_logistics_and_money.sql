-- Pass A: logistics and money. Additive, plus a backfill from event_staff_travel.
create table if not exists public.event_travelers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  needs_room boolean not null default false,
  per_diem_eligible boolean not null default false,
  needs_rental boolean not null default false,
  extra_day boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (event_id, staff_id)
);
insert into public.event_travelers (event_id, staff_id, needs_room, per_diem_eligible, needs_rental, extra_day, notes)
select event_id, staff_id, coalesce(needs_hotel,false), coalesce(needs_perdiem,false),
       coalesce(needs_rental,false), coalesce(extra_day,false), notes
from public.event_staff_travel
where event_id is not null and staff_id is not null
on conflict (event_id, staff_id) do nothing;

create table if not exists public.ground_legs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  method text not null check (method in ('hotel_shuttle','rental_car','rideshare','own_vehicle','carpool','other')),
  rental_car_id uuid references public.event_rental_cars(id) on delete set null,
  pickup_time time,
  pickup_location text,
  contact text,
  notes text,
  created_at timestamptz not null default now(),
  unique (event_id, staff_id, direction)
);

alter table public.event_hotel
  add column if not exists phone text,
  add column if not exists onsite_contact text,
  add column if not exists single_rate numeric,
  add column if not exists double_rate numeric,
  add column if not exists suite_rate numeric,
  add column if not exists tax_rate numeric,
  add column if not exists other_fee numeric,
  add column if not exists self_parking_rate numeric,
  add column if not exists valet_parking_rate numeric,
  add column if not exists cutoff_date date,
  add column if not exists reservation_date date,
  add column if not exists rooming_list_sent_on date;

alter table public.event_hotel_rooms
  add column if not exists cost_group text,
  add column if not exists rate_override numeric,
  add column if not exists parking text check (parking in ('self','valet'));

alter table public.event_rental_cars
  add column if not exists estimated_cost numeric,
  add column if not exists actual_cost numeric;

create table if not exists public.trip_costs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null check (category in ('airfare','bags','fuel','mileage','parking','tolls','rideshare','other')),
  miles numeric,
  estimated numeric not null default 0,
  actual numeric,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists trip_costs_trip_idx on public.trip_costs (trip_id);

create table if not exists public.event_budgets (
  event_id uuid primary key references public.events(id) on delete cascade,
  travel_budget numeric,
  notes text,
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['event_travelers','ground_legs','trip_costs','event_budgets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists ops_only on public.%I', t);
    execute format('create policy ops_only on public.%I for all to authenticated using (public.is_ops()) with check (public.is_ops())', t);
  end loop;
end $$;
