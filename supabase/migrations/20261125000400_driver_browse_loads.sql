begin;

create index company_loads_open_dates
  on public.company_loads (loading_date, created_at desc, company_id, id)
  where status = 'open';

-- Return only the details drivers need to evaluate an open load.
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
  truck_type text
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
  select load.id, company.company_name, load.pickup_city, load.destination_city,
    load.loading_date, load.cargo_type, load.truck_type
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
