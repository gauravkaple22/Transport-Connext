begin;

drop trigger create_transport_driver_profile on auth.users;

create trigger create_transport_driver_profile
after insert on auth.users
for each row when (
  new.raw_user_meta_data ->> 'signup_type' = 'driver'
  and new.raw_app_meta_data ->> 'provider' = 'phone'
  and new.phone ~ '^\+?91[6-9][0-9]{9}$'
  and not (coalesce(new.raw_app_meta_data, '{}'::jsonb) ? 'role')
)
execute function public.create_transport_driver_profile();

commit;
