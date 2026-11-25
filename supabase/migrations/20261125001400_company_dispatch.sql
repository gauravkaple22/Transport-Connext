begin;

drop function public.dispatch_driver_trip(uuid);

create function public.dispatch_company_trip(trip_offer_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.load_trip_tracking (offer_id)
  select offer.id from public.company_load_offers as offer
  where offer.id = trip_offer_id and offer.company_id = (select auth.uid())
    and offer.status in ('accepted', 'payment_recorded')
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

revoke all on function public.dispatch_company_trip(uuid) from public, anon, authenticated;
grant execute on function public.dispatch_company_trip(uuid) to authenticated;

commit;
