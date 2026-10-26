create table if not exists public.menu_availability (
  item_id text primary key,
  is_available boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.menu_availability enable row level security;

grant select on public.menu_availability to anon, authenticated;
grant insert, update on public.menu_availability to authenticated;

drop policy if exists "Anyone can read menu availability" on public.menu_availability;
create policy "Anyone can read menu availability"
  on public.menu_availability
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated staff can update menu availability" on public.menu_availability;
create policy "Authenticated staff can update menu availability"
  on public.menu_availability
  for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'menu_staff')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'menu_staff');

alter table public.menu_availability replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'menu_availability'
  ) then
    alter publication supabase_realtime
      add table public.menu_availability;
  end if;
end
$$;
