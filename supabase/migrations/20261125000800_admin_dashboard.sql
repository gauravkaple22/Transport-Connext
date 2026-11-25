begin;

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from public, anon, authenticated;

create function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

create function public.admin_dashboard_summary()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'companies', (select count(*) from public.company_profiles),
    'drivers', (select count(*) from public.driver_profiles),
    'loads', (select count(*) from public.company_loads),
    'offers', (select count(*) from public.company_load_offers),
    'assignments', (select count(*) from public.company_load_offers where status in ('accepted', 'payment_recorded')),
    'payments', (select count(*) from public.company_load_offers where status = 'payment_recorded')
  );
end;
$$;

create function public.admin_dashboard_records(category text, page_offset integer default 0)
returns setof jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
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
      order by account.created_at desc, profile.user_id limit 21 offset skip_rows;
    when 'drivers' then
      return query select jsonb_build_object(
        'key', profile.user_id, 'name', profile.full_name, 'mobile', account.phone,
        'created_at', account.created_at
      )
      from public.driver_profiles as profile
      join auth.users as account on account.id = profile.user_id
      order by account.created_at desc, profile.user_id limit 21 offset skip_rows;
    when 'loads' then
      return query select jsonb_build_object(
        'key', load.public_id, 'company', company.company_name, 'pickup', load.pickup_city,
        'destination', load.destination_city, 'loading_date', load.loading_date, 'status', load.status,
        'cargo', load.cargo_type, 'truck', load.truck_type, 'notes', load.notes, 'created_at', load.created_at
      )
      from public.company_loads as load
      join public.company_profiles as company on company.user_id = load.company_id
      order by load.created_at desc, load.company_id, load.id limit 21 offset skip_rows;
    when 'offers', 'assignments', 'payments' then
      return query select jsonb_build_object(
        'key', offer.id, 'company', company.company_name, 'driver', driver.full_name,
        'pickup', load.pickup_city, 'destination', load.destination_city, 'loading_date', load.loading_date,
        'status', offer.status, 'amount_paise', offer.amount_paise, 'created_at', offer.offered_at,
        'responded_at', offer.responded_at, 'payment_recorded_at', offer.payment_recorded_at,
        'payment_reference', offer.payment_reference
      )
      from public.company_load_offers as offer
      join public.company_loads as load on load.company_id = offer.company_id and load.id = offer.load_id
      join public.company_profiles as company on company.user_id = offer.company_id
      join public.driver_profiles as driver on driver.user_id = offer.driver_id
      where category = 'offers'
        or (category = 'assignments' and offer.status in ('accepted', 'payment_recorded'))
        or (category = 'payments' and offer.status = 'payment_recorded')
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

revoke all on function public.is_platform_admin(), public.admin_dashboard_summary(),
  public.admin_dashboard_records(text, integer) from public, anon, authenticated;
grant execute on function public.is_platform_admin(), public.admin_dashboard_summary(),
  public.admin_dashboard_records(text, integer) to authenticated;

commit;
