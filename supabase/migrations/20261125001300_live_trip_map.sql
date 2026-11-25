begin;

create function public.can_company_view_trip_location(trip_offer_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.company_load_offers as offer
    where offer.id = trip_offer_id and offer.company_id = (select auth.uid())
      and offer.status in ('accepted', 'payment_recorded')
  );
$$;

revoke all on function public.can_company_view_trip_location(uuid) from public, anon, authenticated;
grant execute on function public.can_company_view_trip_location(uuid) to authenticated;

grant select on public.load_trip_tracking to authenticated;
create policy "Companies can read their own trip location"
on public.load_trip_tracking for select to authenticated
using (public.can_company_view_trip_location(offer_id));

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'load_trip_tracking'
  ) then
    alter publication supabase_realtime add table public.load_trip_tracking;
  end if;
end;
$$;

create or replace function public.update_driver_trip_location(
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
    and (trip.location_at is null or trip.location_at <= now() - interval '5 seconds');

  if found then return true; end if;
  return exists (
    select 1 from public.load_trip_tracking as trip
    join public.company_load_offers as offer on offer.id = trip.offer_id
    where offer.id = trip_offer_id and offer.driver_id = (select auth.uid()) and trip.delivered_at is null
  );
end;
$$;

commit;
