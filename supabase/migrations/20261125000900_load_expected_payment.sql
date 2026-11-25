begin;

alter table public.company_loads
  add column expected_min_paise integer,
  add column expected_max_paise integer,
  add constraint company_loads_expected_payment_range check (
    (expected_min_paise is null and expected_max_paise is null)
    or (
      expected_min_paise is not null and expected_max_paise is not null
      and expected_min_paise between 100 and 1000000000
      and expected_max_paise between expected_min_paise and 1000000000
    )
  );

-- Existing loads may have no range. Require both amounts for every new load.
create function public.require_load_payment_range()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.expected_min_paise is null or new.expected_max_paise is null then
    raise exception 'An expected payment range is required' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.require_load_payment_range() from public, anon, authenticated;

create trigger require_load_payment_range
before insert on public.company_loads
for each row execute function public.require_load_payment_range();

grant insert (expected_min_paise, expected_max_paise) on public.company_loads to authenticated;

commit;
