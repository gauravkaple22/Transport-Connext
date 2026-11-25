begin;

alter table public.company_loads
  add column public_id uuid not null default gen_random_uuid() unique;

create table public.company_load_interests (
  company_id uuid not null,
  load_id uuid not null,
  driver_id uuid not null references public.driver_profiles(user_id) on delete cascade,
  expressed_at timestamptz not null default now(),
  primary key (company_id, load_id, driver_id),
  foreign key (company_id, load_id) references public.company_loads(company_id, id) on delete cascade
);

create index company_load_interests_recent
  on public.company_load_interests (company_id, load_id, expressed_at desc, driver_id);
create index company_load_interests_driver
  on public.company_load_interests (driver_id);

alter table public.company_load_interests enable row level security;
revoke all on public.company_load_interests from public, anon, authenticated;

-- The row lock makes an interest submission and closing the same load serialize.
create function public.show_driver_load_interest(public_load_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  owner_id uuid;
  internal_load_id uuid;
begin
  if caller_id is null or not exists (
    select 1 from public.driver_profiles as driver where driver.user_id = caller_id
  ) then
    raise exception 'Driver account required' using errcode = '42501';
  end if;

  select load.company_id, load.id into owner_id, internal_load_id
  from public.company_loads as load
  where load.public_id = public_load_id
    and load.status = 'open'
    and load.loading_date >= (now() at time zone 'Asia/Kolkata')::date
  for share;

  if not found then return false; end if;

  insert into public.company_load_interests (company_id, load_id, driver_id)
  values (owner_id, internal_load_id, caller_id)
  on conflict (company_id, load_id, driver_id) do nothing;

  return true;
end;
$$;

create function public.list_company_load_interest(requested_load_id uuid, page_offset integer default 0)
returns table (driver_name text, expressed_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select driver.full_name, interest.expressed_at
  from public.company_load_interests as interest
  join public.driver_profiles as driver on driver.user_id = interest.driver_id
  where interest.company_id = (select auth.uid())
    and interest.load_id = requested_load_id
  order by interest.expressed_at desc, interest.driver_id
  limit 21
  offset least(greatest(coalesce(page_offset, 0), 0), 10000);
$$;

revoke all on function public.show_driver_load_interest(uuid) from public, anon, authenticated;
revoke all on function public.list_company_load_interest(uuid, integer) from public, anon, authenticated;
grant execute on function public.show_driver_load_interest(uuid) to authenticated;
grant execute on function public.list_company_load_interest(uuid, integer) to authenticated;

drop function public.browse_driver_loads(text, date, text, integer);

create function public.browse_driver_loads(
  pickup_filter text default null,
  date_filter date default null,
  truck_filter text default null,
  page_offset integer default 0
)
returns table (
  load_id uuid,
  company_name text,
  pickup_city text,
  destination_city text,
  loading_date date,
  cargo_type text,
  truck_type text,
  interest_sent boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  today_in_india date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if caller_id is null or not exists (
    select 1 from public.driver_profiles as driver where driver.user_id = caller_id
  ) then
    raise exception 'Driver account required' using errcode = '42501';
  end if;

  return query
  select load.public_id, company.company_name, load.pickup_city, load.destination_city,
    load.loading_date, load.cargo_type, load.truck_type, exists (
      select 1 from public.company_load_interests as interest
      where interest.company_id = load.company_id and interest.load_id = load.id
        and interest.driver_id = caller_id
    )
  from public.company_loads as load
  join public.company_profiles as company on company.user_id = load.company_id
  where load.status = 'open'
    and load.loading_date >= today_in_india
    and (date_filter is null or load.loading_date = date_filter)
    and (truck_filter is null or load.truck_type = truck_filter)
    and (
      pickup_filter is null
      or starts_with(lower(load.pickup_city), lower(left(btrim(pickup_filter), 80)))
    )
  order by load.loading_date, load.created_at desc, load.company_id, load.id
  limit 21
  offset least(greatest(coalesce(page_offset, 0), 0), 10000);
end;
$$;

revoke all on function public.browse_driver_loads(text, date, text, integer) from public, anon, authenticated;
grant execute on function public.browse_driver_loads(text, date, text, integer) to authenticated;

commit;
