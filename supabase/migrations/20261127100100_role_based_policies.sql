-- Step 1b: replace "any signed-in user" with role checks. Run ONLY after 1a is verified in the app.
-- The table list must match the live tables; the six tables dropped in 20261127090000 are intentionally absent.
do $$
declare t text;
begin
  foreach t in array array[
    'bullpen_events','departments','event_hotel','event_hotel_rooms','event_notes',
    'event_perdiem_meals','event_perdiem_rates','event_rental_cars','event_schedule_days',
    'event_staff_travel','event_tasks','event_travel_arrivals','event_travel_departures','events',
    'positions','schedule_items','show_list','staff','staff_airlines','staff_airports',
    'staff_assignments','staff_departments','staffing_grid_settings','task_templates','tour_positions','tours',
    'venue_contacts','venues'
  ] loop
    execute format('drop policy if exists signed_in_only on public.%I', t);
    execute format('drop policy if exists ops_only on public.%I', t);
    execute format('create policy ops_only on public.%I for all to authenticated using (public.is_ops()) with check (public.is_ops())', t);
  end loop;
end $$;

drop policy if exists signed_in_only on public.app_settings;
drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings for select to authenticated using (public.is_ops());
drop policy if exists settings_write on public.app_settings;
create policy settings_write on public.app_settings for all to authenticated
  using (public.is_manager()) with check (public.is_manager());
