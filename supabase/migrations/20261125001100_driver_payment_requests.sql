begin;

alter table public.company_load_interests
  add column requested_paise integer check (requested_paise between 100 and 1000000000);

drop function public.show_driver_load_interest(uuid);
create function public.show_driver_load_interest(public_load_id uuid, requested_paise integer)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target record;
begin
  if caller_id is null or not exists (
    select 1 from public.driver_profiles as driver where driver.user_id = caller_id
  ) then
    raise exception 'Driver account required' using errcode = '42501';
  end if;

  select load.company_id, load.id, load.expected_min_paise, load.expected_max_paise into target
  from public.company_loads as load
  where load.public_id = public_load_id and load.status = 'open'
    and load.loading_date >= (now() at time zone 'Asia/Kolkata')::date
  for share;

  if not found or target.expected_min_paise is null or target.expected_max_paise is null then
    return 'unavailable';
  end if;
  if requested_paise is null or requested_paise not between target.expected_min_paise and target.expected_max_paise then
    return 'outside-range';
  end if;

  insert into public.company_load_interests as interest (company_id, load_id, driver_id, requested_paise)
  values (target.company_id, target.id, caller_id, requested_paise)
  on conflict (company_id, load_id, driver_id) do update
    set requested_paise = excluded.requested_paise, expressed_at = now()
    where interest.requested_paise is null
      and not exists (
        select 1 from public.company_load_offers as offer
        where offer.company_id = interest.company_id and offer.load_id = interest.load_id
          and offer.driver_id = interest.driver_id
      );

  if found then return 'sent'; end if;
  return 'already-sent';
end;
$$;

drop function public.offer_company_load(uuid, integer);
create function public.offer_company_load(requested_load_id uuid, interest_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  applicant record;
begin
  select interest.company_id, interest.load_id, interest.driver_id, interest.requested_paise into applicant
  from public.company_load_interests as interest
  join public.company_loads as load on load.company_id = interest.company_id and load.id = interest.load_id
  where interest.id = interest_id and interest.load_id = requested_load_id
    and interest.company_id = caller_id and load.status = 'open'
    and load.loading_date >= (now() at time zone 'Asia/Kolkata')::date
    and interest.requested_paise between load.expected_min_paise and load.expected_max_paise
  for update of load;
  if not found then return false; end if;

  insert into public.company_load_offers (company_id, load_id, driver_id, amount_paise)
  values (applicant.company_id, applicant.load_id, applicant.driver_id, applicant.requested_paise)
  on conflict do nothing;
  return found;
end;
$$;

revoke all on function public.show_driver_load_interest(uuid, integer), public.offer_company_load(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.show_driver_load_interest(uuid, integer), public.offer_company_load(uuid, uuid)
to authenticated;

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
  expected_min_paise integer,
  expected_max_paise integer,
  interest_sent boolean,
  requested_paise integer
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
    load.loading_date, load.cargo_type, load.truck_type, load.expected_min_paise, load.expected_max_paise, exists (
      select 1 from public.company_load_interests as interest
      where interest.company_id = load.company_id and interest.load_id = load.id
        and interest.driver_id = caller_id
        and (interest.requested_paise is not null or exists (
          select 1 from public.company_load_offers as offer where offer.company_id = load.company_id
            and offer.load_id = load.id and offer.driver_id = caller_id
        ))
    ), (
      select interest.requested_paise from public.company_load_interests as interest
      where interest.company_id = load.company_id and interest.load_id = load.id and interest.driver_id = caller_id
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

drop function public.list_company_load_interest(uuid, integer);
create function public.list_company_load_interest(requested_load_id uuid, page_offset integer default 0)
returns table (
  driver_name text, expressed_at timestamptz, interest_id uuid, offer_id uuid,
  offer_status text, amount_paise integer, payment_reference text, can_offer boolean, requested_paise integer
)
language sql stable security definer set search_path = ''
as $$
  select driver.full_name, interest.expressed_at, interest.id, offer.id, offer.status,
    offer.amount_paise, offer.payment_reference,
    offer.id is null and interest.requested_paise between load.expected_min_paise and load.expected_max_paise and load.status = 'open'
      and load.loading_date >= (now() at time zone 'Asia/Kolkata')::date
      and not exists (
        select 1 from public.company_load_offers as active
        where active.company_id = interest.company_id and active.load_id = interest.load_id
          and active.status in ('offered', 'accepted', 'payment_recorded')
      ), interest.requested_paise
  from public.company_load_interests as interest
  join public.company_loads as load on load.company_id = interest.company_id and load.id = interest.load_id
  join public.driver_profiles as driver on driver.user_id = interest.driver_id
  left join public.company_load_offers as offer
    on offer.company_id = interest.company_id and offer.load_id = interest.load_id and offer.driver_id = interest.driver_id
  where interest.company_id = (select auth.uid()) and interest.load_id = requested_load_id
  order by interest.expressed_at desc, interest.driver_id
  limit 21 offset least(greatest(coalesce(page_offset, 0), 0), 10000);
$$;

revoke all on function public.list_company_load_interest(uuid, integer) from public, anon, authenticated;
grant execute on function public.list_company_load_interest(uuid, integer) to authenticated;
commit;
