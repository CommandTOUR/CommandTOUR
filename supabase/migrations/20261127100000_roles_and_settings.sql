-- Step 1a: roles, profiles, settings, tour approvers. Additive only.
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null,
  role text not null default 'crew' check (role in ('admin','manager','coordinator','finance','crew')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists user_profiles_staff_id_key on public.user_profiles (staff_id) where staff_id is not null;
alter table public.user_profiles enable row level security;

create or replace function public.my_role() returns text language sql stable security definer set search_path = public as $$
  select role from public.user_profiles where user_id = auth.uid()
$$;
create or replace function public.my_staff_id() returns uuid language sql stable security definer set search_path = public as $$
  select staff_id from public.user_profiles where user_id = auth.uid()
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;
create or replace function public.is_manager() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin','manager'), false)
$$;
create or replace function public.is_ops() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin','manager','coordinator','finance'), false)
$$;

drop policy if exists profiles_read on public.user_profiles;
create policy profiles_read on public.user_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists profiles_admin_write on public.user_profiles;
create policy profiles_admin_write on public.user_profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.user_profiles (user_id, role)
values ('4321de23-88d2-4a4a-b030-d401cfd5e990', 'admin')
on conflict (user_id) do update set role = 'admin', updated_at = now();

create or replace function public.admin_list_users()
returns table (user_id uuid, email text, created_at timestamptz, role text, staff_id uuid)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text, u.created_at, p.role, p.staff_id
  from auth.users u left join public.user_profiles p on p.user_id = u.id
  where public.is_admin()
  order by u.created_at
$$;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

create table if not exists public.tour_approvers (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tour_id, staff_id)
);
alter table public.tour_approvers enable row level security;
drop policy if exists tour_approvers_read on public.tour_approvers;
create policy tour_approvers_read on public.tour_approvers for select to authenticated using (public.is_ops());
drop policy if exists tour_approvers_write on public.tour_approvers;
create policy tour_approvers_write on public.tour_approvers for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

insert into public.app_settings (key, value) values
  ('mileage_rate', '{"rate":0.76,"unit":"mile"}'::jsonb),
  ('flight_approval_limits', '{"one_way":300,"round_trip":450,"multi_city":550}'::jsonb),
  ('per_diem_defaults', '{"breakfast":10,"lunch":20,"dinner":30,"meal_times":{"breakfast":"07:00","lunch":"12:00","dinner":"18:00"}}'::jsonb),
  ('hotel_cost_groups', '["Production","Merchandise","FOH","Pay On Own"]'::jsonb)
on conflict (key) do nothing;
