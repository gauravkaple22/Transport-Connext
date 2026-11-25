begin;

create table public.company_booking_commissions (
  offer_id uuid primary key references public.company_load_offers(id) on delete cascade,
  agreed_paise integer not null check (agreed_paise between 100 and 1000000000),
  commission_paise integer generated always as (((agreed_paise::bigint * 4 + 50) / 100)::integer) stored,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'paid')),
  confirmed_at timestamptz not null default now(),
  payment_reference text check (char_length(btrim(payment_reference)) between 3 and 80),
  submitted_at timestamptz,
  paid_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  check (
    (status = 'pending' and payment_reference is null and submitted_at is null and paid_at is null)
    or (status = 'submitted' and payment_reference is not null and submitted_at is not null and paid_at is null)
    or (status = 'paid' and payment_reference is not null and submitted_at is not null and paid_at is not null)
  )
);

alter table public.company_booking_commissions enable row level security;
revoke all on public.company_booking_commissions from public, anon, authenticated;
create index company_booking_commissions_recent on public.company_booking_commissions(confirmed_at desc, offer_id);
create unique index company_booking_commissions_verified_reference
  on public.company_booking_commissions (lower(payment_reference)) where status = 'paid';

create function public.create_booking_commission()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.company_booking_commissions(offer_id, agreed_paise)
  values (new.id, new.amount_paise)
  on conflict (offer_id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_booking_commission() from public, anon, authenticated;
create trigger create_booking_commission
after update of status on public.company_load_offers
for each row when (old.status = 'offered' and new.status = 'accepted')
execute function public.create_booking_commission();

create function public.submit_company_commission_payment(booking_id uuid, reference_text text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  reference_value text := btrim(reference_text);
begin
  if reference_value is null or char_length(reference_value) not between 3 and 80 then return false; end if;

  update public.company_booking_commissions as fee
  set status = 'submitted', payment_reference = reference_value, submitted_at = now()
  from public.company_load_offers as offer
  where fee.offer_id = booking_id and offer.id = fee.offer_id and offer.company_id = (select auth.uid())
    and fee.status in ('pending', 'submitted') and fee.payment_reference is distinct from reference_value;
  if found then return true; end if;

  return exists (
    select 1 from public.company_booking_commissions as fee
    join public.company_load_offers as offer on offer.id = fee.offer_id
    where fee.offer_id = booking_id and offer.company_id = (select auth.uid())
      and fee.status = 'submitted' and fee.payment_reference = reference_value
  );
end;
$$;

create function public.verify_company_commission_payment(booking_id uuid, expected_reference text)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;

  update public.company_booking_commissions as fee
  set status = 'paid', paid_at = now(), verified_by = auth.uid()
  where fee.offer_id = booking_id and fee.status = 'submitted' and fee.payment_reference = expected_reference;
  if found then return true; end if;

  return exists (
    select 1 from public.company_booking_commissions as fee
    where fee.offer_id = booking_id and fee.status = 'paid' and fee.payment_reference = expected_reference
  );
end;
$$;

create function public.list_booking_commissions(admin_view boolean, page_offset integer default 0)
returns table (
  offer_id uuid, company_name text, pickup_city text, destination_city text, loading_date date,
  agreed_paise integer, commission_paise integer, total_paise integer, commission_status text,
  payment_reference text, confirmed_at timestamptz, paid_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null or (admin_view and not public.is_platform_admin()) then
    raise exception 'Commission access required' using errcode = '42501';
  end if;

  return query
  select fee.offer_id, company.company_name, load.pickup_city, load.destination_city, load.loading_date,
    fee.agreed_paise, fee.commission_paise, fee.agreed_paise + fee.commission_paise, fee.status,
    fee.payment_reference, fee.confirmed_at, fee.paid_at
  from public.company_booking_commissions as fee
  join public.company_load_offers as offer on offer.id = fee.offer_id
  join public.company_loads as load on load.company_id = offer.company_id and load.id = offer.load_id
  join public.company_profiles as company on company.user_id = offer.company_id
  where admin_view or offer.company_id = caller_id
  order by fee.confirmed_at desc, fee.offer_id
  limit 21 offset least(greatest(coalesce(page_offset, 0), 0), 10000);
end;
$$;

create function public.admin_commission_summary()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;

  return (
    select jsonb_build_object(
      'total_paise', coalesce(sum(commission_paise), 0),
      'pending_paise', coalesce(sum(commission_paise) filter (where status <> 'paid'), 0),
      'paid_paise', coalesce(sum(commission_paise) filter (where status = 'paid'), 0),
      'revenue_paise', coalesce(sum(commission_paise) filter (where status = 'paid'), 0)
    )
    from public.company_booking_commissions
  );
end;
$$;

revoke all on function public.submit_company_commission_payment(uuid, text), public.verify_company_commission_payment(uuid, text),
  public.list_booking_commissions(boolean, integer), public.admin_commission_summary() from public, anon, authenticated;
grant execute on function public.submit_company_commission_payment(uuid, text), public.verify_company_commission_payment(uuid, text),
  public.list_booking_commissions(boolean, integer), public.admin_commission_summary() to authenticated;

drop function public.list_company_payments(boolean, integer);
create function public.list_company_payments(recorded boolean default false, page_offset integer default 0)
returns table (
  offer_id uuid, load_id uuid, driver_name text, pickup_city text, destination_city text,
  loading_date date, amount_paise integer, payment_reference text, payment_recorded_at timestamptz, commission_paise integer, total_paise integer
)
language sql stable security definer set search_path = ''
as $$
  select offer.id, offer.load_id, driver.full_name, load.pickup_city, load.destination_city,
    load.loading_date, offer.amount_paise, offer.payment_reference, offer.payment_recorded_at, fee.commission_paise,
    offer.amount_paise + coalesce(fee.commission_paise, 0)
  from public.company_load_offers as offer
  join public.driver_profiles as driver on driver.user_id = offer.driver_id
  join public.company_loads as load on load.company_id = offer.company_id and load.id = offer.load_id
  left join public.company_booking_commissions as fee on fee.offer_id = offer.id
  where offer.company_id = (select auth.uid())
    and offer.status = case when recorded then 'payment_recorded' else 'accepted' end
  order by coalesce(offer.payment_recorded_at, offer.responded_at, offer.offered_at) desc, offer.id
  limit 21 offset least(greatest(coalesce(page_offset, 0), 0), 10000);
$$;

revoke all on function public.list_company_payments(boolean, integer) from public, anon, authenticated;
grant execute on function public.list_company_payments(boolean, integer) to authenticated;
commit;
