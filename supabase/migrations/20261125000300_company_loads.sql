begin;

create table public.company_loads (
  company_id uuid not null references public.company_profiles(user_id) on delete cascade,
  id uuid not null,
  pickup_city text not null check (char_length(btrim(pickup_city)) between 2 and 80),
  destination_city text not null check (char_length(btrim(destination_city)) between 2 and 80),
  loading_date date not null,
  cargo_type text not null check (char_length(btrim(cargo_type)) between 2 and 100),
  truck_type text not null check (truck_type in ('mini', 'open', 'closed', 'container', 'trailer', 'other')),
  notes text check (char_length(notes) <= 500),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  primary key (company_id, id)
);

create index company_loads_recent
  on public.company_loads (company_id, created_at desc, id desc);

alter table public.company_loads enable row level security;
revoke all on public.company_loads from public, anon, authenticated;
grant select on public.company_loads to authenticated;
grant insert (company_id, id, pickup_city, destination_city, loading_date, cargo_type, truck_type, notes)
  on public.company_loads to authenticated;
grant update (status) on public.company_loads to authenticated;

create policy "Companies can read their own loads"
on public.company_loads for select to authenticated
using ((select auth.uid()) = company_id);

create policy "Companies can post their own loads"
on public.company_loads for insert to authenticated
with check (
  (select auth.uid()) = company_id
  and status = 'open'
  and loading_date >= (now() at time zone 'Asia/Kolkata')::date
);

create policy "Companies can close their own open loads"
on public.company_loads for update to authenticated
using ((select auth.uid()) = company_id and status = 'open')
with check ((select auth.uid()) = company_id and status = 'closed');

commit;
