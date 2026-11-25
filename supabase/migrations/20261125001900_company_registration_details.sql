begin;

alter table public.company_profiles
  add column business_address text check (char_length(btrim(business_address)) between 5 and 250),
  add column secondary_contact_mobile text check (
    secondary_contact_mobile ~ '^\+91[6-9][0-9]{9}$' and secondary_contact_mobile <> contact_mobile
  );

grant update (business_address, secondary_contact_mobile) on public.company_profiles to authenticated;

create or replace function public.create_transport_company_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  address text := nullif(btrim(new.raw_user_meta_data ->> 'business_address'), '');
  tax_id text := nullif(upper(btrim(new.raw_user_meta_data ->> 'gstin')), '');
begin
  if address is null or tax_id is null then
    raise exception 'Company address and GSTIN are required' using errcode = '23514';
  end if;

  insert into public.company_profiles (
    user_id, company_name, contact_name, contact_mobile, secondary_contact_mobile, business_address, city, state, gstin
  ) values (
    new.id,
    btrim(new.raw_user_meta_data ->> 'company_name'),
    btrim(new.raw_user_meta_data ->> 'contact_name'),
    new.raw_user_meta_data ->> 'contact_mobile',
    nullif(btrim(new.raw_user_meta_data ->> 'secondary_contact_mobile'), ''),
    address,
    btrim(new.raw_user_meta_data ->> 'city'),
    btrim(new.raw_user_meta_data ->> 'state'),
    tax_id
  );
  return new;
end;
$$;

commit;
