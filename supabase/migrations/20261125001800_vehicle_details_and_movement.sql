begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('driver-vehicle-documents', 'driver-vehicle-documents', false, 4194304,
  array['image/jpeg', 'image/png', 'application/pdf']);

create table public.driver_vehicle_details (
  driver_id uuid primary key references public.driver_profiles(user_id) on delete cascade,
  vehicle_number text not null check (vehicle_number ~ '^[A-Z0-9]{6,15}$'),
  upload_id uuid not null,
  submitted_at timestamptz not null default now()
);

alter table public.driver_vehicle_details enable row level security;
revoke all on public.driver_vehicle_details from public, anon, authenticated;
grant select on public.driver_vehicle_details to authenticated;
create policy "Drivers can read their own vehicle details"
on public.driver_vehicle_details for select to authenticated using (driver_id = (select auth.uid()));

create policy "Drivers can upload their own vehicle documents once"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'driver-vehicle-documents'
  and starts_with(name, (select auth.uid())::text || '/')
  and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/(rc|license|selfie\.jpg)$'
  and exists (select 1 from public.driver_profiles where user_id = (select auth.uid()))
  and not exists (select 1 from public.driver_vehicle_details where driver_id = (select auth.uid()))
);

create policy "Drivers can read only their own vehicle documents"
on storage.objects for select to authenticated
using (bucket_id = 'driver-vehicle-documents' and owner_id = (select auth.uid())::text);

create policy "Drivers can remove only unsubmitted vehicle documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'driver-vehicle-documents' and owner_id = (select auth.uid())::text
  and not exists (
    select 1 from public.driver_vehicle_details as vehicle
    where vehicle.driver_id = (select auth.uid())
      and starts_with(name, vehicle.driver_id::text || '/' || vehicle.upload_id::text || '/')
  )
);

create function public.submit_driver_vehicle_details(registration text, document_upload_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  path_prefix text;
begin
  if caller_id is null or registration is null or registration !~ '^[A-Z0-9]{6,15}$'
    or document_upload_id is null then return false; end if;

  perform 1 from public.driver_profiles where user_id = caller_id for update;
  if not found then return false; end if;
  if exists (select 1 from public.driver_vehicle_details where driver_id = caller_id) then
    return exists (
      select 1 from public.driver_vehicle_details where driver_id = caller_id and upload_id = document_upload_id
    );
  end if;

  path_prefix := caller_id::text || '/' || document_upload_id::text || '/';
  if (select count(*) from storage.objects as object
    where object.bucket_id = 'driver-vehicle-documents' and object.owner_id = caller_id::text
      and object.name in (path_prefix || 'rc', path_prefix || 'license', path_prefix || 'selfie.jpg')
      and (object.name <> path_prefix || 'selfie.jpg' or object.metadata->>'mimetype' = 'image/jpeg')
  ) <> 3 then return false; end if;

  insert into public.driver_vehicle_details(driver_id, vehicle_number, upload_id)
  values (caller_id, registration, document_upload_id);

  return true;
end;
$$;

revoke all on function public.submit_driver_vehicle_details(text, uuid) from public, anon, authenticated;
grant execute on function public.submit_driver_vehicle_details(text, uuid) to authenticated;

alter table public.company_loads add column vehicle_size_feet numeric(4,1)
  check (vehicle_size_feet between 1 and 80);
grant insert (vehicle_size_feet) on public.company_loads to authenticated;

create function public.require_load_vehicle_size()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.vehicle_size_feet is null then
    raise exception 'Vehicle size is required' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.require_load_vehicle_size() from public, anon, authenticated;
create trigger require_load_vehicle_size before insert on public.company_loads
for each row execute function public.require_load_vehicle_size();


drop function public.list_company_load_interest(uuid, integer);
create function public.list_company_load_interest(requested_load_id uuid, page_offset integer default 0)
returns table (
  driver_name text, expressed_at timestamptz, interest_id uuid, offer_id uuid,
  offer_status text, amount_paise integer, payment_reference text, can_offer boolean, requested_paise integer, advance_paise integer, advance_reference text, vehicle_number text
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
      ), interest.requested_paise, advance.amount_paise, advance.payment_reference, vehicle.vehicle_number
  from public.company_load_interests as interest
  join public.company_loads as load on load.company_id = interest.company_id and load.id = interest.load_id
  join public.driver_profiles as driver on driver.user_id = interest.driver_id
  left join public.driver_vehicle_details as vehicle on vehicle.driver_id = interest.driver_id
  left join public.company_load_offers as offer
    on offer.company_id = interest.company_id and offer.load_id = interest.load_id and offer.driver_id = interest.driver_id
  left join public.driver_booking_advances as advance on advance.offer_id = offer.id
  where interest.company_id = (select auth.uid()) and interest.load_id = requested_load_id
  order by interest.expressed_at desc, interest.driver_id
  limit 21 offset least(greatest(coalesce(page_offset, 0), 0), 10000);
$$;
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
  requested_paise integer, vehicle_size_feet numeric
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
    ), load.vehicle_size_feet
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
revoke all on function public.list_company_load_interest(uuid, integer), public.browse_driver_loads(text, date, text, integer) from public, anon, authenticated;
grant execute on function public.list_company_load_interest(uuid, integer), public.browse_driver_loads(text, date, text, integer) to authenticated;

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
    and (trip.location_at is null or trip.location_at <= now() - interval '2 seconds');

  if found then return true; end if;
  return exists (
    select 1 from public.load_trip_tracking as trip
    join public.company_load_offers as offer on offer.id = trip.offer_id
    where offer.id = trip_offer_id and offer.driver_id = (select auth.uid()) and trip.delivered_at is null
  );
end;
$$;

create or replace function public.show_driver_load_interest(public_load_id uuid, requested_paise integer)
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

  if not exists (select 1 from public.driver_vehicle_details where driver_id = caller_id) then
    return 'vehicle-required';
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

commit;
