# Live Schema Snapshot, 2026-11-26

Reference only. Not a migration; never run it. The live database is the source of truth.

Types are as reported at snapshot time. Columns with no default and no NN are nullable with no default. The primary key `id` columns without a stated default have no default recorded in the snapshot.

The tables `hotels`, `hotel_rooms`, `travel`, `event_staffing`, `event_ground_transport`, and `event_perdiem_staff` were dropped by migration `20261127090000` and are intentionally not listed.

Security state at snapshot (before the roles migration): all public tables have row level security on, each with one policy `signed_in_only` (ALL, true). One login exists. No roles table.

## Tables

### app_settings

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | gen_random_uuid() |
| key | text | No |  |
| value | jsonb | Yes |  |
| updated_at | timestamptz | Yes | now() |

### tours

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No |  |
| created_at | timestamptz | Yes |  |
| name | text | No |  |
| year | int | Yes |  |
| region | text | Yes |  |
| type | text | Yes |  |
| color | text | Yes |  |
| status | text | Yes |  |
| director_id | uuid | Yes |  |
| notes | text | Yes |  |
| director_name | text | Yes |  |
| tour_type | text | Yes |  |
| tour_category | text | Yes |  |
| logo_url | text | Yes |  |
| deleted_at | timestamptz | Yes |  |
| sort_order | int | Yes |  |

### events

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No |  |
| created_at | timestamptz | Yes |  |
| tour_id | uuid | Yes |  |
| city | text | No |  |
| country | text | Yes |  |
| venue_name | text | Yes |  |
| status | text | Yes |  |
| load_in_date | date | Yes |  |
| load_out_date | date | Yes |  |
| num_shows | int | Yes |  |
| notes | text | Yes |  |
| venue_id | uuid | Yes |  |
| event_type | text | Yes |  |
| hidden_positions | jsonb | Yes |  |
| unlocked_positions | jsonb | Yes |  |
| state | text | Yes |  |
| booking_note | text | Yes |  |
| saturday_date | date | Yes |  |
| sunday_date | date | Yes |  |
| show_dates | array | Yes |  |
| order_index | int | Yes |  |
| booker | text | Yes |  |
| deleted_at | timestamptz | Yes |  |

### staff

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No |  |
| created_at | timestamptz | Yes |  |
| first_name | text | No |  |
| last_name | text | No |  |
| email | text | Yes |  |
| phone | text | Yes |  |
| home_airport | text | Yes |  |
| passport_number | text | Yes |  |
| passport_expiry | date | Yes |  |
| dob | date | Yes |  |
| address | text | Yes |  |
| allergies | text | Yes |  |
| airlines | text | Yes |  |
| ff_numbers | text | Yes |  |
| notes | text | Yes |  |
| status | text | Yes |  |
| middle_name | text | Yes |  |
| suffix | text | Yes |  |
| mailing_address | text | Yes |  |
| city | text | Yes |  |
| state | text | Yes |  |
| zip | text | Yes |  |
| passport_nationality | text | Yes |  |
| attention_flag | bool | Yes |  |
| attention_note | text | Yes |  |
| country | text | Yes |  |
| employee_type | text | Yes |  |
| department | text | Yes |  |
| display_name | text | Yes |  |
| staff_department_id | uuid | Yes |  |
| tsa_precheck | text | Yes |  |
| global_entry | text | Yes |  |
| known_traveler_number | text | Yes |  |
| passport_image_url | text | Yes |  |
| passport_headshot_url | text | Yes |  |
| passport_name | text | Yes |  |
| passport_surname | text | Yes |  |
| passport_given_names | text | Yes |  |
| place_of_birth | text | Yes |  |
| date_of_issue | date | Yes |  |
| tshirt_size | text | Yes |  |
| emergency_contact_name | text | Yes |  |
| emergency_contact_phone | text | Yes |  |
| seat_preference | text | Yes |  |

### staff_airlines

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No |  |
| created_at | timestamptz | Yes |  |
| staff_id | uuid | Yes |  |
| airline | text | Yes |  |
| frequent_flyer_number | text | Yes |  |
| preferred | bool | Yes |  |

### staff_airports

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No |  |
| staff_id | uuid | No |  |
| iata_code | text | No |  |
| city | text | Yes |  |
| state | text | Yes |  |
| airport_name | text | Yes |  |
| is_primary | bool | Yes |  |
| sort_order | int | Yes |  |
| created_at | timestamptz | Yes |  |

### staff_assignments

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No |  |
| tour_position_id | uuid | No |  |
| slot_index | int | No |  |
| staff_id | uuid | Yes |  |
| event_id | uuid | Yes |  |
| status | text | Yes |  |
| confirmed | bool | Yes |  |
| notes | text | Yes |  |
| travel_in_date | date | Yes |  |
| travel_out_date | date | Yes |  |
| travel_type | text | Yes |  |
| created_at | timestamptz | Yes |  |
| deleted_at | timestamptz | Yes |  |
| good_to_book | bool | Yes |  |
| booked | bool | Yes |  |
| locked | bool | No |  |

### event_staff_travel

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No |  |
| event_id | uuid | Yes |  |
| staff_id | uuid | Yes |  |
| staff_assignment_id | uuid | Yes |  |
| travel_in_date | date | Yes |  |
| travel_out_date | date | Yes |  |
| travel_type | text | Yes | 'flight' |
| needs_hotel | bool | Yes | false |
| needs_perdiem | bool | Yes | false |
| needs_rental | bool | Yes | false |
| notes | text | Yes |  |
| created_at | timestamptz | Yes |  |
| arrival_mode | text | Yes |  |
| departure_mode | text | Yes |  |
| extra_day | bool | Yes | false |

### event_travel_arrivals

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No |  |
| created_at | timestamptz | Yes |  |
| event_id | uuid | Yes |  |
| staff_id | uuid | Yes |  |
| travel_date | date | Yes |  |
| flight_number | text | Yes |  |
| arrival_time | time | Yes |  |
| notes | text | Yes |  |
| flagged | bool | Yes | false |
| transport | text | Yes |  |
| airport | text | Yes |  |
| travel_type | text | Yes | 'flight' |
| airline | text | Yes |  |
| needs_rework | bool | No | false |
| rework_note | text | Yes |  |

No unique key.

### event_travel_departures

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No |  |
| created_at | timestamptz | Yes |  |
| event_id | uuid | Yes |  |
| staff_id | uuid | Yes |  |
| travel_date | date | Yes |  |
| flight_number | text | Yes |  |
| departure_time | time | Yes |  |
| notes | text | Yes |  |
| flagged | bool | Yes | false |
| transport | text | Yes |  |
| airport | text | Yes |  |
| travel_type | text | Yes | 'flight' |
| airline | text | Yes |  |
| needs_rework | bool | No | false |
| rework_note | text | Yes |  |

No unique key. Same as event_travel_arrivals except departure_time replaces arrival_time.

### event_hotel

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No |  |
| created_at | timestamptz | Yes |  |
| event_id | uuid | Yes |  |
| hotel_name | text | Yes |  |
| address | text | Yes |  |
| check_in_date | date | Yes |  |
| check_out_date | date | Yes |  |
| notes | text | Yes |  |

### event_hotel_rooms

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No |  |
| created_at | timestamptz | Yes |  |
| hotel_id | uuid | Yes |  |
| staff_id | uuid | Yes |  |
| room_number | text | Yes |  |
| room_type | text | Yes |  |
| notes | text | Yes |  |
| staff_id_1 | uuid | Yes |  |
| staff_id_2 | uuid | Yes |  |
| check_in_date | date | Yes |  |
| check_out_date | date | Yes |  |
| event_id | uuid | Yes |  |
| beds | int | Yes | 1 |
| early_check_in | bool | Yes | false |
| confirmation_number | text | Yes |  |

### event_rental_cars

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No |  |
| event_id | uuid | Yes |  |
| staff_id | uuid | Yes |  |
| pickup_date | date | Yes |  |
| return_date | date | Yes |  |
| pickup_location | text | Yes |  |
| return_location | text | Yes |  |
| car_class | text | Yes |  |
| confirmation_number | text | Yes |  |
| vendor | text | Yes |  |
| notes | text | Yes |  |
| created_at | timestamptz | Yes |  |

### event_perdiem_rates

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No |  |
| event_id | uuid | Yes |  |
| breakfast_rate | numeric | No | 0 |
| lunch_rate | numeric | No | 0 |
| dinner_rate | numeric | No | 0 |
| created_at | timestamptz | Yes |  |

### event_perdiem_meals

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No |  |
| event_id | uuid | Yes |  |
| meal_date | date | No |  |
| breakfast_provided | bool | No | false |
| lunch_provided | bool | No | false |
| dinner_provided | bool | No | false |

### staffing_grid_settings

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | text | Yes |  |
| position_order | jsonb | Yes |  |

One row.

## Keys And Links

- `app_settings.id` is the primary key
- `app_settings.key` is unique
- `tours.id` is the primary key
- `events.id` is the primary key
- `staff.id` is the primary key
- `staff.staff_department_id` -> `staff_departments` (on delete set null)
- `staff_airlines.id` is the primary key
- `staff_airlines.staff_id` has NO foreign key
- `staff_airports.id` is the primary key
- `staff_airports.staff_id` -> `staff` (on delete cascade)
- `staff_assignments.id` is the primary key
- `staff_assignments.tour_position_id` -> `tour_positions` (on delete cascade)
- `staff_assignments.staff_id` -> `staff` (on delete set null)
- `staff_assignments.event_id` -> `events` (on delete cascade)
- `staff_assignments` unique (tour_position_id, slot_index, event_id)
- `event_staff_travel.id` is the primary key
- `event_staff_travel.event_id` -> `events` (on delete cascade)
- `event_staff_travel.staff_id` -> `staff` (on delete cascade)
- `event_staff_travel.staff_assignment_id` -> `staff_assignments` (on delete set null)
- `event_staff_travel` unique (event_id, staff_id)
- `event_travel_arrivals.id` is the primary key
- `event_travel_arrivals.event_id` -> `events` (on delete cascade)
- `event_travel_arrivals.staff_id` -> `staff` (on delete cascade)
- `event_travel_departures.id` is the primary key
- `event_travel_departures.event_id` -> `events` (on delete cascade)
- `event_travel_departures.staff_id` -> `staff` (on delete cascade)
- `event_hotel.id` is the primary key
- `event_hotel.event_id` -> `events` (on delete cascade)
- `event_hotel_rooms.id` is the primary key
- `event_hotel_rooms.hotel_id` has NO foreign key
- `event_hotel_rooms.staff_id` has NO foreign key
- `event_hotel_rooms.staff_id_1` -> `staff` (on delete set null)
- `event_hotel_rooms.staff_id_2` -> `staff` (on delete set null)
- `event_hotel_rooms.event_id` -> `events` (on delete cascade)
- `event_rental_cars.id` is the primary key
- `event_rental_cars.event_id` -> `events` (on delete cascade)
- `event_rental_cars.staff_id` -> `staff` (on delete set null)
- `event_perdiem_rates.id` is the primary key
- `event_perdiem_rates.event_id` -> `events` (on delete cascade)
- `event_perdiem_rates.event_id` is unique
- `event_perdiem_meals.id` is the primary key
- `event_perdiem_meals.event_id` -> `events` (on delete cascade)
- `event_perdiem_meals` unique (event_id, meal_date)

## Known Gaps

- Arrivals and departures hold one row per person per direction by convention only (no unique key); most rows are empty placeholders (1,491 rows each; only 24 arrivals and 0 departures hold real data; 3 duplicate event/staff pairs in each).
- No link between a login (auth user) and a staff record; roles are only in the browser.
- staff mixes contact info with passport numbers, dob and allergies, readable by every signed-in user.
- staff_airlines.staff_id has no foreign key; event_hotel_rooms.hotel_id and legacy staff_id have no foreign keys.
- event_hotel has no rates, phone, contact, cut-off date, or rooming-list-sent fields.
- staff has city/state/zip but no coordinates.
- No cost, receipt, segment, approval, or flight-request tables; per diem defaults live in browser storage.
