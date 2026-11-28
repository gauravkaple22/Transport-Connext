begin;

-- Existing balances and previously sent offers keep their original terms.
alter table public.company_booking_commissions alter column commission_paise drop expression;
alter table public.company_booking_commissions alter column commission_paise set not null;
alter table public.company_booking_commissions add check (commission_paise > 0 and commission_paise <= 100000000);
alter table public.company_load_offers add column platform_fee_paise integer
  check (platform_fee_paise > 0 and platform_fee_paise <= 100000000);
update public.company_load_offers
set platform_fee_paise = ((amount_paise::bigint * 4 + 50) / 100)::integer
where status = 'offered';

create table public.platform_booking_fee (
  singleton boolean primary key default true check (singleton),
  fee_paise integer not null check (fee_paise > 0 and fee_paise <= 100000000)
);
alter table public.platform_booking_fee enable row level security;
revoke all on public.platform_booking_fee from public, anon, authenticated;

create function public.current_platform_booking_fee()
returns integer language sql stable security definer set search_path = ''
as $$
  select fee.fee_paise from public.platform_booking_fee as fee
  where exists (select 1 from public.company_profiles where user_id = (select auth.uid()));
$$;
revoke all on function public.current_platform_booking_fee() from public, anon, authenticated;
grant execute on function public.current_platform_booking_fee() to authenticated;

create function public.snapshot_platform_booking_fee()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  select fee_paise into new.platform_fee_paise from public.platform_booking_fee where singleton;
  if new.platform_fee_paise is null then
    raise exception 'Platform booking fee is unavailable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.snapshot_platform_booking_fee() from public, anon, authenticated;
create trigger snapshot_platform_booking_fee before insert on public.company_load_offers
for each row execute function public.snapshot_platform_booking_fee();

create or replace function public.create_booking_commission()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.company_booking_commissions(offer_id, agreed_paise, commission_paise)
  values (new.id, new.amount_paise, new.platform_fee_paise)
  on conflict (offer_id) do nothing;
  return new;
end;
$$;

commit;
