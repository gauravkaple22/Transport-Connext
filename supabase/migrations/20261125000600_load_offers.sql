begin;

alter table public.company_load_interests
  add column id uuid not null default gen_random_uuid() unique;

create table public.company_load_offers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  load_id uuid not null,
  driver_id uuid not null,
  amount_paise integer not null check (amount_paise between 100 and 1000000000),
  status text not null default 'offered' check (status in ('offered', 'accepted', 'declined', 'payment_recorded')),
  offered_at timestamptz not null default now(),
  payment_recorded_at timestamptz,
  payment_reference text check (char_length(payment_reference) <= 80),
  unique (company_id, load_id, driver_id),
  foreign key (company_id, load_id, driver_id)
    references public.company_load_interests(company_id, load_id, driver_id) on delete cascade
);

create unique index company_load_offers_one_active
  on public.company_load_offers(company_id, load_id)
  where status in ('offered', 'accepted', 'payment_recorded');
create index company_load_offers_driver_recent
  on public.company_load_offers(driver_id, offered_at desc, id);

alter table public.company_load_offers enable row level security;
revoke all on public.company_load_offers from public, anon, authenticated;

create function public.offer_company_load(interest_id uuid, freight_paise integer)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  applicant record;
begin
  if freight_paise is null or freight_paise not between 100 and 1000000000 then return false; end if;
  select interest.company_id, interest.load_id, interest.driver_id into applicant
  from public.company_load_interests as interest
  join public.company_loads as load on load.company_id = interest.company_id and load.id = interest.load_id
  where interest.id = interest_id and interest.company_id = caller_id and load.status = 'open'
    and load.loading_date >= (now() at time zone 'Asia/Kolkata')::date
  for update of load;
  if not found then return false; end if;

  insert into public.company_load_offers (company_id, load_id, driver_id, amount_paise)
  values (applicant.company_id, applicant.load_id, applicant.driver_id, freight_paise)
  on conflict do nothing;
  return found;
end;
$$;

create function public.respond_to_load_offer(offer_id uuid, accept_offer boolean)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target record;
begin
  if accept_offer is null then return false; end if;
  select load.company_id, load.id, load.status, load.loading_date into target
  from public.company_load_offers as offer
  join public.company_loads as load on load.company_id = offer.company_id and load.id = offer.load_id
  where offer.id = offer_id and offer.driver_id = caller_id
  for update of load;
  if not found then return false; end if;

  if accept_offer and (
    target.status <> 'open' or target.loading_date < (now() at time zone 'Asia/Kolkata')::date
  ) then return false; end if;

  update public.company_load_offers
  set status = case when accept_offer then 'accepted' else 'declined' end
  where id = offer_id and driver_id = caller_id and status = 'offered';
  if not found then return false; end if;

  if accept_offer then
    update public.company_loads set status = 'closed'
    where company_id = target.company_id and id = target.id;
  end if;
  return true;
end;
$$;

create function public.record_company_load_payment(offer_id uuid, reference_text text default null)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if char_length(reference_text) > 80 then return false; end if;
  update public.company_load_offers
  set status = 'payment_recorded', payment_recorded_at = now(), payment_reference = nullif(btrim(reference_text), '')
  where id = offer_id and company_id = caller_id and status = 'accepted';

  return found or exists (
    select 1 from public.company_load_offers where id = offer_id and company_id = caller_id and status = 'payment_recorded'
  );
end;
$$;

create function public.list_driver_load_offers(page_offset integer default 0)
returns table (
  offer_id uuid, company_name text, pickup_city text, destination_city text, loading_date date,
  amount_paise integer, offer_status text, can_accept boolean, payment_recorded_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select offer.id, company.company_name, load.pickup_city, load.destination_city, load.loading_date,
    offer.amount_paise, offer.status,
    offer.status = 'offered' and load.status = 'open'
      and load.loading_date >= (now() at time zone 'Asia/Kolkata')::date,
    offer.payment_recorded_at
  from public.company_load_offers as offer
  join public.company_loads as load on load.company_id = offer.company_id and load.id = offer.load_id
  join public.company_profiles as company on company.user_id = offer.company_id
  where offer.driver_id = (select auth.uid())
  order by offer.offered_at desc, offer.id
  limit 21 offset least(greatest(coalesce(page_offset, 0), 0), 10000);
$$;

drop function public.list_company_load_interest(uuid, integer);
create function public.list_company_load_interest(requested_load_id uuid, page_offset integer default 0)
returns table (
  driver_name text, expressed_at timestamptz, interest_id uuid, offer_id uuid,
  offer_status text, amount_paise integer, payment_reference text, can_offer boolean
)
language sql stable security definer set search_path = ''
as $$
  select driver.full_name, interest.expressed_at, interest.id, offer.id, offer.status,
    offer.amount_paise, offer.payment_reference,
    offer.id is null and load.status = 'open'
      and load.loading_date >= (now() at time zone 'Asia/Kolkata')::date
      and not exists (
        select 1 from public.company_load_offers as active
        where active.company_id = interest.company_id and active.load_id = interest.load_id
          and active.status in ('offered', 'accepted', 'payment_recorded')
      )
  from public.company_load_interests as interest
  join public.company_loads as load on load.company_id = interest.company_id and load.id = interest.load_id
  join public.driver_profiles as driver on driver.user_id = interest.driver_id
  left join public.company_load_offers as offer
    on offer.company_id = interest.company_id and offer.load_id = interest.load_id and offer.driver_id = interest.driver_id
  where interest.company_id = (select auth.uid()) and interest.load_id = requested_load_id
  order by interest.expressed_at desc, interest.driver_id
  limit 21 offset least(greatest(coalesce(page_offset, 0), 0), 10000);
$$;

revoke all on function public.offer_company_load(uuid, integer), public.respond_to_load_offer(uuid, boolean),
  public.record_company_load_payment(uuid, text), public.list_driver_load_offers(integer),
  public.list_company_load_interest(uuid, integer) from public, anon, authenticated;
grant execute on function public.offer_company_load(uuid, integer), public.respond_to_load_offer(uuid, boolean),
  public.record_company_load_payment(uuid, text), public.list_driver_load_offers(integer),
  public.list_company_load_interest(uuid, integer) to authenticated;

commit;
