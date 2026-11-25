begin;

create view public.admin_commission_booking_data as
select fee.offer_id, offer.company_id, company.company_name, driver.full_name as driver_name,
  load.pickup_city, load.destination_city, load.loading_date, fee.agreed_paise, fee.commission_paise,
  fee.agreed_paise + fee.commission_paise as total_paise, fee.status as commission_status,
  fee.payment_reference, fee.confirmed_at, fee.paid_at,
  case when tracking.delivered_at is not null then 'delivered'
       when tracking.dispatched_at is not null then 'dispatched' else 'assigned' end as trip_status
from public.company_booking_commissions as fee
join public.company_load_offers as offer on offer.id = fee.offer_id
join public.company_loads as load on load.company_id = offer.company_id and load.id = offer.load_id
join public.company_profiles as company on company.user_id = offer.company_id
join public.driver_profiles as driver on driver.user_id = offer.driver_id
left join public.load_trip_tracking as tracking on tracking.offer_id = offer.id;

revoke all on public.admin_commission_booking_data from public, anon, authenticated;

create function public.admin_commission_overview(
  view_kind text, company_filter uuid default null, payment_filter text default null,
  trip_filter text default null, search_text text default null, page_offset integer default 0
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  result jsonb;
  query_text text := lower(left(btrim(coalesce(search_text, '')), 100));
  skip_rows integer := least(greatest(coalesce(page_offset, 0), 0), 10000);
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
  if view_kind is null or view_kind not in ('companies', 'bookings') then
    raise exception 'Unknown commission view' using errcode = '22023';
  end if;

  with matching as (
    select booking.*
    from public.admin_commission_booking_data as booking
    where (company_filter is null or booking.company_id = company_filter)
      and (payment_filter is null or payment_filter = booking.commission_status
        or (payment_filter = 'outstanding' and booking.commission_status <> 'paid'))
      and (trip_filter is null or booking.trip_status = trip_filter)
      and (query_text = '' or strpos(lower(concat_ws(' ', booking.company_name, booking.driver_name, booking.pickup_city,
        booking.destination_city, booking.offer_id::text, booking.payment_reference)), query_text) > 0)
  ), company_totals as (
    select company_id, company_name, count(*) as booking_count, sum(commission_paise) as total_paise,
      coalesce(sum(commission_paise) filter (where commission_status <> 'paid'), 0) as pending_paise,
      coalesce(sum(commission_paise) filter (where commission_status = 'paid'), 0) as paid_paise
    from matching
    where view_kind = 'companies'
    group by company_id, company_name
    order by pending_paise desc, company_name, company_id
    limit 21 offset skip_rows
  ), booking_page as (
    select * from matching
    where view_kind = 'bookings'
    order by confirmed_at desc, offer_id
    limit 21 offset skip_rows
  )
  select jsonb_build_object(
    'company_name', (select profile.company_name from public.company_profiles as profile where profile.user_id = company_filter),
    'summary', (select jsonb_build_object(
      'total_paise', coalesce(sum(commission_paise), 0),
      'pending_paise', coalesce(sum(commission_paise) filter (where commission_status <> 'paid'), 0),
      'paid_paise', coalesce(sum(commission_paise) filter (where commission_status = 'paid'), 0),
      'revenue_paise', coalesce(sum(commission_paise) filter (where commission_status = 'paid'), 0)
    ) from matching),
    'companies', coalesce((select jsonb_agg(to_jsonb(company_totals) order by pending_paise desc, company_name, company_id) from company_totals), '[]'::jsonb),
    'bookings', coalesce((select jsonb_agg(to_jsonb(booking_page) order by confirmed_at desc, offer_id) from booking_page), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

create function public.admin_record_received_commission(booking_id uuid, reference_text text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  reference_value text := btrim(reference_text);
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
  if reference_value is null or char_length(reference_value) not between 3 and 80 then return false; end if;

  update public.company_booking_commissions as fee
  set status = 'paid', submitted_at = now(), paid_at = now(),
    payment_reference = reference_value, verified_by = auth.uid()
  where fee.offer_id = booking_id and fee.status = 'pending';
  if found then return true; end if;

  return exists (
    select 1 from public.company_booking_commissions as fee
    where fee.offer_id = booking_id and fee.status = 'paid' and fee.payment_reference = reference_value
  );
end;
$$;

create function public.admin_monitor_records(category text, page_offset integer default 0, search_text text default null, trip_filter text default null)
returns setof jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  query_text text := lower(left(btrim(coalesce(search_text, '')), 100));
  skip_rows integer := least(greatest(coalesce(page_offset, 0), 0), 200000);
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  case category
    when 'companies' then
      return query select jsonb_build_object(
        'key', profile.user_id, 'name', profile.company_name, 'contact', profile.contact_name,
        'email', account.email, 'mobile', profile.contact_mobile, 'city', profile.city,
        'state', profile.state, 'gstin', profile.gstin, 'created_at', account.created_at
      )
      from public.company_profiles as profile
      join auth.users as account on account.id = profile.user_id
      where query_text = '' or strpos(lower(concat_ws(' ', profile.user_id::text, to_jsonb(profile)->>'company_name', to_jsonb(profile)->>'contact_name', to_jsonb(profile)->>'full_name', to_jsonb(profile)->>'city', to_jsonb(profile)->>'state', to_jsonb(profile)->>'gstin', to_jsonb(profile)->>'contact_mobile', account.email, account.phone)), query_text) > 0
      order by account.created_at desc, profile.user_id limit 21 offset skip_rows;
    when 'drivers' then
      return query select jsonb_build_object(
        'key', profile.user_id, 'name', profile.full_name, 'mobile', account.phone,
        'created_at', account.created_at
      )
      from public.driver_profiles as profile
      join auth.users as account on account.id = profile.user_id
      where query_text = '' or strpos(lower(concat_ws(' ', profile.user_id::text, to_jsonb(profile)->>'company_name', to_jsonb(profile)->>'contact_name', to_jsonb(profile)->>'full_name', to_jsonb(profile)->>'city', to_jsonb(profile)->>'state', to_jsonb(profile)->>'gstin', to_jsonb(profile)->>'contact_mobile', account.email, account.phone)), query_text) > 0
      order by account.created_at desc, profile.user_id limit 21 offset skip_rows;
    when 'loads' then
      return query select jsonb_build_object(
        'key', load.public_id, 'company', company.company_name, 'pickup', load.pickup_city,
        'destination', load.destination_city, 'loading_date', load.loading_date, 'status', load.status,
        'cargo', load.cargo_type, 'truck', load.truck_type, 'notes', load.notes, 'created_at', load.created_at,
        'pickup_address', load.pickup_address, 'delivery_address', load.delivery_address
      )
      from public.company_loads as load
      join public.company_profiles as company on company.user_id = load.company_id
      where query_text = '' or strpos(lower(concat_ws(' ', company.company_name,load.pickup_city,load.destination_city,load.cargo_type,load.public_id::text)), query_text) > 0
      order by load.created_at desc, load.company_id, load.id limit 21 offset skip_rows;
    when 'offers', 'assignments', 'payments' then
      return query select jsonb_build_object(
        'key', offer.id, 'company', company.company_name, 'driver', driver.full_name,
        'pickup', load.pickup_city, 'destination', load.destination_city, 'loading_date', load.loading_date,
        'status', offer.status, 'amount_paise', offer.amount_paise, 'created_at', offer.offered_at,
        'responded_at', offer.responded_at, 'payment_recorded_at', offer.payment_recorded_at,
        'payment_reference', offer.payment_reference, 'trip_status', case when offer.status in ('accepted','payment_recorded') then stage.value end,
        'dispatched_at', tracking.dispatched_at, 'delivered_at', tracking.delivered_at
      )
      from public.company_load_offers as offer
      join public.company_loads as load on load.company_id = offer.company_id and load.id = offer.load_id
      join public.company_profiles as company on company.user_id = offer.company_id
      join public.driver_profiles as driver on driver.user_id = offer.driver_id
      left join public.load_trip_tracking as tracking on tracking.offer_id = offer.id
      cross join lateral (select case when tracking.delivered_at is not null then 'delivered'
        when tracking.dispatched_at is not null then 'dispatched' else 'assigned' end as value) as stage
      where (category = 'offers'
        or (category = 'assignments' and offer.status in ('accepted', 'payment_recorded'))
        or (category = 'payments' and offer.status = 'payment_recorded'))
        and (category <> 'assignments' or trip_filter is null or stage.value = trip_filter)
        and (query_text = '' or strpos(lower(concat_ws(' ', company.company_name, driver.full_name,
          load.pickup_city, load.destination_city, offer.id::text, offer.payment_reference)), query_text) > 0)
      order by
        case when category = 'payments' then offer.payment_recorded_at
             when category = 'assignments' then coalesce(offer.responded_at, offer.offered_at)
             else offer.offered_at end desc,
        offer.id
      limit 21 offset skip_rows;
    else
      raise exception 'Unknown admin category' using errcode = '22023';
  end case;
end;
$$;

revoke all on function public.admin_commission_overview(text, uuid, text, text, text, integer),
  public.admin_record_received_commission(uuid, text), public.admin_monitor_records(text, integer, text, text)
from public, anon, authenticated;
grant execute on function public.admin_commission_overview(text, uuid, text, text, text, integer),
  public.admin_record_received_commission(uuid, text), public.admin_monitor_records(text, integer, text, text)
to authenticated;

commit;
