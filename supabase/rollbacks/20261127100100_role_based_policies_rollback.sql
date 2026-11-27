-- Rollback for 20261127100100_role_based_policies.sql: puts back "any signed-in user" access.
-- Run manually in the Supabase SQL editor.
do $$
declare t text;
begin
  foreach t in array array[
    'bullpen_events','departments','event_hotel','event_hotel_rooms','event_notes',
    'event_perdiem_meals','event_perdiem_rates','event_rental_cars','event_schedule_days',
    'event_staff_travel','event_tasks','event_travel_arrivals','event_travel_departures','events',
    'positions','schedule_items','show_list','staff','staff_airlines','staff_airports',
    'staff_assignments','staff_departments','staffing_grid_settings','task_templates','tour_positions','tours',
    'venue_contacts','venues','app_settings'
  ] loop
    execute format('drop policy if exists ops_only on public.%I', t);
    execute format('drop policy if exists settings_read on public.%I', t);
    execute format('drop policy if exists settings_write on public.%I', t);
    execute format('drop policy if exists signed_in_only on public.%I', t);
    execute format('create policy signed_in_only on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
