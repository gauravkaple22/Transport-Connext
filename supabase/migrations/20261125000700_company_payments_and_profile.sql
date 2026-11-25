begin;

grant update (company_name, contact_name, contact_mobile, city, state, gstin)
on public.company_profiles to authenticated;

create policy "Company members can update their own company profile"
on public.company_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter table public.company_load_offers add column responded_at timestamptz;
create index company_load_offers_payment_queue
  on public.company_load_offers (company_id, status, offered_at desc, id)
  where status in ('accepted', 'payment_recorded');

create function public.set_load_offer_response_time()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.responded_at := now();
  return new;
end;
$$;

revoke all on function public.set_load_offer_response_time() from public, anon, authenticated;

create trigger set_load_offer_response_time
before update of status on public.company_load_offers
for each row when (old.status = 'offered' and new.status in ('accepted', 'declined'))
execute function public.set_load_offer_response_time();

create function public.list_company_payments(recorded boolean default false, page_offset integer default 0)
returns table (
  offer_id uuid, load_id uuid, driver_name text, pickup_city text, destination_city text,
  loading_date date, amount_paise integer, payment_reference text, payment_recorded_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select offer.id, offer.load_id, driver.full_name, load.pickup_city, load.destination_city,
    load.loading_date, offer.amount_paise, offer.payment_reference, offer.payment_recorded_at
  from public.company_load_offers as offer
  join public.driver_profiles as driver on driver.user_id = offer.driver_id
  join public.company_loads as load on load.company_id = offer.company_id and load.id = offer.load_id
  where offer.company_id = (select auth.uid())
    and offer.status = case when recorded then 'payment_recorded' else 'accepted' end
  order by coalesce(offer.payment_recorded_at, offer.responded_at, offer.offered_at) desc, offer.id
  limit 21 offset least(greatest(coalesce(page_offset, 0), 0), 10000);
$$;

create index company_load_interests_activity
  on public.company_load_interests (company_id, expressed_at desc, id);
create index company_load_offers_responses_activity
  on public.company_load_offers (company_id, responded_at desc, id) where responded_at is not null;
create index company_load_offers_payments_activity
  on public.company_load_offers (company_id, payment_recorded_at desc, id) where payment_recorded_at is not null;

create function public.list_company_activity()
returns table (
  event_id text, event_type text, occurred_at timestamptz, load_id uuid,
  pickup_city text, destination_city text, driver_name text
)
language sql stable security definer set search_path = ''
as $$
  with caller as (select auth.uid() as id),
  events as (
    (select 'interest:' || interest.id as event_id, 'interest' as event_type,
      interest.expressed_at as occurred_at, interest.load_id, interest.driver_id
    from public.company_load_interests as interest
    where interest.company_id = (select id from caller)
    order by interest.expressed_at desc, interest.id limit 10)
    union all
    (select 'response:' || offer.id,
      case when offer.status = 'declined' then 'declined' else 'accepted' end,
      offer.responded_at, offer.load_id, offer.driver_id
    from public.company_load_offers as offer
    where offer.company_id = (select id from caller) and offer.responded_at is not null
    order by offer.responded_at desc, offer.id limit 10)
    union all
    (select 'payment:' || offer.id, 'payment', offer.payment_recorded_at, offer.load_id, offer.driver_id
    from public.company_load_offers as offer
    where offer.company_id = (select id from caller) and offer.payment_recorded_at is not null
    order by offer.payment_recorded_at desc, offer.id limit 10)
  )
  select events.event_id, events.event_type, events.occurred_at, events.load_id,
    load.pickup_city, load.destination_city, driver.full_name
  from events
  join public.company_loads as load on load.company_id = (select id from caller) and load.id = events.load_id
  join public.driver_profiles as driver on driver.user_id = events.driver_id
  order by events.occurred_at desc, events.event_id
  limit 10;
$$;

revoke all on function public.list_company_payments(boolean, integer), public.list_company_activity()
from public, anon, authenticated;
grant execute on function public.list_company_payments(boolean, integer), public.list_company_activity()
to authenticated;

commit;
