begin;

create table public.company_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null check (char_length(btrim(company_name)) between 2 and 120),
  contact_name text not null check (char_length(btrim(contact_name)) between 2 and 100),
  contact_mobile text not null check (contact_mobile ~ '^\+91[6-9][0-9]{9}$'),
  city text not null check (char_length(btrim(city)) between 2 and 80),
  state text not null check (char_length(btrim(state)) between 2 and 80),
  gstin text check (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$')
);

alter table public.company_profiles enable row level security;
revoke all on public.company_profiles from public, anon, authenticated;
grant select on public.company_profiles to authenticated;

create policy "Company members can read their own company profile"
on public.company_profiles for select to authenticated
using ((select auth.uid()) = user_id);

create function public.create_transport_company_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.company_profiles (
    user_id, company_name, contact_name, contact_mobile, city, state, gstin
  ) values (
    new.id,
    btrim(new.raw_user_meta_data ->> 'company_name'),
    btrim(new.raw_user_meta_data ->> 'contact_name'),
    new.raw_user_meta_data ->> 'contact_mobile',
    btrim(new.raw_user_meta_data ->> 'city'),
    btrim(new.raw_user_meta_data ->> 'state'),
    nullif(new.raw_user_meta_data ->> 'gstin', '')
  );
  return new;
end;
$$;

revoke execute on function public.create_transport_company_profile() from public, anon, authenticated;

create trigger create_transport_company_profile
after insert on auth.users
for each row when (
  new.raw_user_meta_data ->> 'signup_type' = 'company'
  and new.raw_app_meta_data ->> 'provider' = 'email'
  and not (coalesce(new.raw_app_meta_data, '{}'::jsonb) ? 'role')
)
execute function public.create_transport_company_profile();

commit;
