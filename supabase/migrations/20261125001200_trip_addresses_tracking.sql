begin;

alter table public.company_loads
  add column pickup_address text check (char_length(btrim(pickup_address)) between 10 and 350),
  add column delivery_address text check (char_length(btrim(delivery_address)) between 10 and 350);

create function public.require_load_addresses()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.pickup_address is null or new.delivery_address is null then
    raise exception 'Pickup and delivery addresses are required' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.require_load_addresses() from public, anon, authenticated;

create trigger require_load_addresses
before insert on public.company_loads
for each row execute function public.require_load_addresses();

grant insert (pickup_address, delivery_address) on public.company_loads to authenticated;

create table public.load_trip_tracking (
  offer_id uuid primary key references public.company_load_offers(id) on delete cascade,
  dispatched_at timestamptz not null default now(),
  delivered_at timestamptz,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  accuracy_m double precision check (accuracy_m between 0 and 100000),
  location_at timestamptz
);

alter table public.load_trip_tracking enable row level security;
revoke all on public.load_trip_tracking from public, anon, authenticated;

create function public.dispatch_driver_trip(trip_offer_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.load_trip_tracking (offer_id)
  select offer.id from public.company_load_offers as offer
  where offer.id = trip_offer_id and offer.driver_id = (select auth.uid())
    and offer.status in ('accepted', 'payment_recorded')
  on conflict (offer_id) do nothing;
  if found then return true; end if;
  return exists (
    select 1 from public.load_trip_tracking as trip
    join public.company_load_offers as offer on offer.id = trip.offer_id
    where offer.id = trip_offer_id and offer.driver_id = (select auth.uid()) and trip.delivered_at is null
  );
end;
$$;

create function public.deliver_driver_trip(trip_offer_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  update public.load_trip_tracking as trip
  set delivered_at = now(), latitude = null, longitude = null, accuracy_m = null, location_at = null
  from public.company_load_offers as offer
  where trip.offer_id = trip_offer_id and offer.id = trip.offer_id
    and offer.driver_id = (select auth.uid()) and trip.delivered_at is null;
  if found then return true; end if;
  return exists (
    select 1 from public.load_trip_tracking as trip
    join public.company_load_offers as offer on offer.id = trip.offer_id
    where offer.id = trip_offer_id and offer.driver_id = (select auth.uid()) and trip.delivered_at is not null
  );
end;
$$;

create function public.update_driver_trip_location(
  trip_offer_id uuid, latitude_value double precision, longitude_value double precision, accuracy_value double precision
)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if latitude_value is null or latitude_value not between -90 and 90
    or longitude_value is null or longitude_value not between -180 and 180
    or accuracy_value is null or accuracy_value not between 0 and 100000
  then return false; end if;

  update public.load_trip_tracking as trip
  set latitude = latitude_value, longitude = longitude_value, accuracy_m = accuracy_value, location_at = now()
  from public.company_load_offers as offer
  where trip.offer_id = trip_offer_id and offer.id = trip.offer_id
    and offer.driver_id = (select auth.uid()) and trip.delivered_at is null
    and (trip.location_at is null or trip.location_at <= now() - interval '15 seconds');

  if found then return true; end if;
  return exists (
    select 1 from public.load_trip_tracking as trip
    join public.company_load_offers as offer on offer.id = trip.offer_id
    where offer.id = trip_offer_id and offer.driver_id = (select auth.uid()) and trip.delivered_at is null
  );
end;
$$;

create function public.list_account_trips(view_as text, page_offset integer default 0)
returns table (
  offer_id uuid, company_name text, driver_name text, pickup_city text, destination_city text,
  pickup_address text, delivery_address text, loading_date date, amount_paise integer,
  status text, dispatched_at timestamptz, delivered_at timestamptz, location_at timestamptz,
  latitude double precision, longitude double precision, accuracy_m double precision
)
language sql stable security definer set search_path = ''
as $$
  select offer.id, company.company_name, driver.full_name, load.pickup_city, load.destination_city,
    load.pickup_address, load.delivery_address, load.loading_date, offer.amount_paise,
    case when trip.delivered_at is not null then 'delivered'
         when trip.dispatched_at is not null then 'dispatched'
         else 'assigned' end,
    trip.dispatched_at, trip.delivered_at,
    case when view_as = 'company' and trip.delivered_at is null then trip.location_at end,
    case when view_as = 'company' and trip.delivered_at is null then trip.latitude end,
    case when view_as = 'company' and trip.delivered_at is null then trip.longitude end,
    case when view_as = 'company' and trip.delivered_at is null then trip.accuracy_m end
  from public.company_load_offers as offer
  join public.company_loads as load on load.company_id = offer.company_id and load.id = offer.load_id
  join public.company_profiles as company on company.user_id = offer.company_id
  join public.driver_profiles as driver on driver.user_id = offer.driver_id
  left join public.load_trip_tracking as trip on trip.offer_id = offer.id
  where offer.status in ('accepted', 'payment_recorded')
    and (
      (view_as = 'company' and offer.company_id = (select auth.uid()))
      or (view_as = 'driver' and offer.driver_id = (select auth.uid()))
    )
  order by (trip.delivered_at is not null), coalesce(trip.dispatched_at, offer.responded_at, offer.offered_at) desc, offer.id
  limit 21 offset least(greatest(coalesce(page_offset, 0), 0), 10000);
$$;

revoke all on function public.dispatch_driver_trip(uuid), public.deliver_driver_trip(uuid),
  public.update_driver_trip_location(uuid, double precision, double precision, double precision),
  public.list_account_trips(text, integer) from public, anon, authenticated;
grant execute on function public.dispatch_driver_trip(uuid), public.deliver_driver_trip(uuid),
  public.update_driver_trip_location(uuid, double precision, double precision, double precision),
  public.list_account_trips(text, integer) to authenticated;

commit;
