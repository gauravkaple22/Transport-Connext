begin;

create table public.driver_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 100)
);

alter table public.driver_profiles enable row level security;
revoke all on public.driver_profiles from public, anon, authenticated;
grant select on public.driver_profiles to authenticated;

create policy "Drivers can read their own profile"
on public.driver_profiles for select to authenticated
using ((select auth.uid()) = user_id);

-- Only new public driver signups reach this function. Role membership is
-- determined by the protected profile row, never by editable auth metadata.
create function public.create_transport_driver_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.driver_profiles (user_id, full_name)
  values (new.id, btrim(new.raw_user_meta_data ->> 'full_name'));
  return new;
end;
$$;

revoke execute on function public.create_transport_driver_profile() from public, anon, authenticated;

create trigger create_transport_driver_profile
after insert on auth.users
for each row when (
  new.raw_user_meta_data ->> 'signup_type' = 'driver'
  and coalesce(new.raw_app_meta_data ->> 'provider', '') = 'email'
  and not (coalesce(new.raw_app_meta_data, '{}'::jsonb) ? 'role')
)
execute function public.create_transport_driver_profile();

commit;
