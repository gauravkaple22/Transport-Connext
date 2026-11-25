begin;

create table public.driver_booking_advances (
  offer_id uuid primary key references public.company_load_offers(id) on delete cascade,
  amount_paise integer not null check (amount_paise > 0),
  payment_reference text not null check (char_length(btrim(payment_reference)) between 3 and 80),
  recorded_at timestamptz not null default now()
);

alter table public.driver_booking_advances enable row level security;
revoke all on public.driver_booking_advances from public, anon, authenticated;

create function public.record_driver_booking_advance(booking_id uuid, reference_text text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  reference_value text := btrim(reference_text);
begin
  if reference_value is null or char_length(reference_value) not between 3 and 80 then return false; end if;

  insert into public.driver_booking_advances (offer_id, amount_paise, payment_reference)
  select offer.id, ((offer.amount_paise::bigint * 70 + 99) / 100)::integer, reference_value
  from public.company_load_offers as offer
  where offer.id = booking_id and offer.company_id = (select auth.uid()) and offer.status = 'accepted'
  on conflict (offer_id) do nothing;

  if found then return true; end if;
  return exists (
    select 1 from public.driver_booking_advances as advance
    join public.company_load_offers as offer on offer.id = advance.offer_id
    where offer.id = booking_id and offer.company_id = (select auth.uid()) and advance.payment_reference = reference_value
  );
end;
$$;

revoke all on function public.record_driver_booking_advance(uuid, text) from public, anon, authenticated;
grant execute on function public.record_driver_booking_advance(uuid, text) to authenticated;

create or replace function public.record_company_load_payment(offer_id uuid, reference_text text default null)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  reference_value text := nullif(btrim(reference_text), '');
begin
  if char_length(reference_value) > 80 then return false; end if;

  update public.company_load_offers as offer
  set status = 'payment_recorded', payment_recorded_at = now(), payment_reference = reference_value
  where offer.id = $1 and offer.company_id = caller_id and offer.status = 'accepted'
    and exists (
      select 1 from public.driver_booking_advances as advance
      where advance.offer_id = offer.id
        and lower(advance.payment_reference) is distinct from lower(reference_value)
    );
  if found then return true; end if;

  return exists (
    select 1 from public.company_load_offers as offer
    where offer.id = $1 and offer.company_id = caller_id and offer.status = 'payment_recorded'
      and offer.payment_reference is not distinct from reference_value
  );
end;
$$;

create or replace function public.dispatch_company_trip(trip_offer_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.load_trip_tracking (offer_id)
  select offer.id from public.company_load_offers as offer
  where offer.id = trip_offer_id and offer.company_id = (select auth.uid())
    and (offer.status = 'payment_recorded' or (offer.status = 'accepted'
      and exists (select 1 from public.driver_booking_advances as advance where advance.offer_id = offer.id)))
  on conflict (offer_id) do nothing;

  if found then return true; end if;
  return exists (
    select 1 from public.load_trip_tracking as trip
    join public.company_load_offers as offer on offer.id = trip.offer_id
    where offer.id = trip_offer_id and offer.company_id = (select auth.uid())
      and offer.status in ('accepted', 'payment_recorded') and trip.delivered_at is null
  );
end;
$$;

drop function public.list_company_load_interest(uuid, integer);
create function public.list_company_load_interest(requested_load_id uuid, page_offset integer default 0)
returns table (
  driver_name text, expressed_at timestamptz, interest_id uuid, offer_id uuid,
  offer_status text, amount_paise integer, payment_reference text, can_offer boolean, requested_paise integer, advance_paise integer, advance_reference text
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
      ), interest.requested_paise, advance.amount_paise, advance.payment_reference
  from public.company_load_interests as interest
  join public.company_loads as load on load.company_id = interest.company_id and load.id = interest.load_id
  join public.driver_profiles as driver on driver.user_id = interest.driver_id
  left join public.company_load_offers as offer
    on offer.company_id = interest.company_id and offer.load_id = interest.load_id and offer.driver_id = interest.driver_id
  left join public.driver_booking_advances as advance on advance.offer_id = offer.id
  where interest.company_id = (select auth.uid()) and interest.load_id = requested_load_id
  order by interest.expressed_at desc, interest.driver_id
  limit 21 offset least(greatest(coalesce(page_offset, 0), 0), 10000);
$$;

drop function public.list_company_payments(boolean, integer);
create function public.list_company_payments(recorded boolean default false, page_offset integer default 0)
returns table (
  offer_id uuid, load_id uuid, driver_name text, pickup_city text, destination_city text,
  loading_date date, amount_paise integer, payment_reference text, payment_recorded_at timestamptz, commission_paise integer, total_paise integer, advance_paise integer, advance_reference text
)
language sql stable security definer set search_path = ''
as $$
  select offer.id, offer.load_id, driver.full_name, load.pickup_city, load.destination_city,
    load.loading_date, offer.amount_paise, offer.payment_reference, offer.payment_recorded_at, fee.commission_paise,
    offer.amount_paise + coalesce(fee.commission_paise, 0), advance.amount_paise, advance.payment_reference
  from public.company_load_offers as offer
  join public.driver_profiles as driver on driver.user_id = offer.driver_id
  join public.company_loads as load on load.company_id = offer.company_id and load.id = offer.load_id
  left join public.company_booking_commissions as fee on fee.offer_id = offer.id
  left join public.driver_booking_advances as advance on advance.offer_id = offer.id
  where offer.company_id = (select auth.uid())
    and offer.status = case when recorded then 'payment_recorded' else 'accepted' end
  order by coalesce(offer.payment_recorded_at, offer.responded_at, offer.offered_at) desc, offer.id
  limit 21 offset least(greatest(coalesce(page_offset, 0), 0), 10000);
$$;

drop function public.list_account_trips(text, integer);
create function public.list_account_trips(view_as text, page_offset integer default 0)
returns table (
  offer_id uuid, company_name text, driver_name text, pickup_city text, destination_city text,
  pickup_address text, delivery_address text, loading_date date, amount_paise integer,
  status text, dispatched_at timestamptz, delivered_at timestamptz, location_at timestamptz,
  latitude double precision, longitude double precision, accuracy_m double precision,
  load_id uuid, advance_recorded boolean
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
    case when view_as = 'company' and trip.delivered_at is null then trip.accuracy_m end,
    case when view_as = 'company' then offer.load_id end,
    case when view_as = 'company' then (offer.status = 'payment_recorded' or advance.offer_id is not null) end
  from public.company_load_offers as offer
  join public.company_loads as load on load.company_id = offer.company_id and load.id = offer.load_id
  join public.company_profiles as company on company.user_id = offer.company_id
  join public.driver_profiles as driver on driver.user_id = offer.driver_id
  left join public.load_trip_tracking as trip on trip.offer_id = offer.id
  left join public.driver_booking_advances as advance on advance.offer_id = offer.id
  where offer.status in ('accepted', 'payment_recorded')
    and (
      (view_as = 'company' and offer.company_id = (select auth.uid()))
      or (view_as = 'driver' and offer.driver_id = (select auth.uid()))
    )
  order by (trip.delivered_at is not null), coalesce(trip.dispatched_at, offer.responded_at, offer.offered_at) desc, offer.id
  limit 21 offset least(greatest(coalesce(page_offset, 0), 0), 10000);
$$;

revoke all on function public.list_company_load_interest(uuid, integer), public.list_company_payments(boolean, integer),
  public.list_account_trips(text, integer) from public, anon, authenticated;
grant execute on function public.list_company_load_interest(uuid, integer), public.list_company_payments(boolean, integer),
  public.list_account_trips(text, integer) to authenticated;

commit;
