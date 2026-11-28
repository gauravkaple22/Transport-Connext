# Transport Connect

Transport Connect is a platform in development for transport companies and truck drivers, starting in Maharashtra. The home page links to `/login`, where visitors choose Driver or Company. Company accounts use email and password.

Drivers sign up with their full name, Indian mobile number and password. Supabase Auth stores the mobile number on the auth user record. The driver profile table stores the name and user ID, and the protected dashboard requires that profile. The dashboard shows only the last four digits when the authenticated session contains the number. Drivers can add an optional verified recovery email in My profile. Login uses the mobile number and password, and recovery sends an email link.

## Run locally

Use Node.js 22.19 or a newer supported release. The app uses the operating system certificate store when running locally. Run `npm install`, then `npm run dev` and visit http://localhost:3000.

## Configure the shared Supabase project

1. If needed, copy `.env.example` to `.env.local`. Use the project's URL and publishable key from the Supabase **Connect** dialog.
2. Coordinate with the company developer. In Supabase **SQL Editor**, run the migration files in order. If the initial driver profile migration is already applied, run only the newer phone signup migration.
3. Under **Authentication > Sign In / Providers > Phone**, enable the Phone provider and leave **Confirm phone** off. Phone-and-password signup works without an SMS provider when phone confirmation is off. Keep the project's Email provider and its confirmation settings available for the company flow.
4. For driver recovery, allow `http://localhost:3000/driver/auth/callback` under **Authentication > URL Configuration > Redirect URLs** and add the equivalent HTTPS URL for deployment. Match `APP_URL` to the exact browser origin, including the port. Use custom SMTP for delivery to users outside the project team.

Existing driver profiles are preserved by the migration. If anyone created an email-only driver account in the earlier prototype, coordinate a verified account transition before they rely on this phone-only login.

## Test the driver flow

- Open `/login` and check the Driver and Company destinations.
- Register a driver using an Indian mobile number you own and a password of at least 8 characters. Check that the dashboard displays your name.
- Log out and confirm that opening `/driver/dashboard` redirects to driver login.
- Log in again with the same phone and password. Try a wrong password and confirm access is denied.
- Verify that an account without a driver profile cannot open the dashboard.

Since phone numbers are entered without verification, this setup cannot verify that a driver owns the number they enter. Keep ownership verification and account recovery in mind before opening registration to the public.


## Set up company authentication

1. Run `supabase/migrations/20261125000200_company_profiles.sql` in the shared project's SQL Editor. It creates the company profile table, owner-only read policy and company signup trigger.
2. Keep the Email provider and Confirm email enabled. Set `APP_URL` in `.env.local` to the actual app origin and add `http://localhost:3000/company/auth/callback` and `http://localhost:3000/company/auth/callback?flow=recovery` under **Authentication > URL Configuration > Redirect URLs** for local development. For a deployed app, add the matching HTTPS callback URLs.
3. The default Supabase emails support confirmation and reset links. Open links in the same browser that requested them. The built-in mailer is for testing with organization team addresses and is rate-limited.
4. To deliver numeric recovery codes, add `{{ .Token }}` to the **Reset password** email template. Projects created from June 3, 2026 on the Free plan require custom SMTP to edit Auth templates. A template can keep the default link as a fallback. Example:

   ```html
   <h2>Reset your Transport Connect password</h2>
   <p>Your one-time reset code is <strong>{{ .Token }}</strong>.</p>
   <p>You can also <a href="{{ .ConfirmationURL }}">reset your password using this link</a>.</p>
   ```

5. Register at `/company/signup`, confirm the email, check the dashboard, log out and sign back in. Test password reset separately with the default link and, after the template is configured, a numeric code. Test that a signed-out visitor and a driver session cannot open the company dashboard or password update page.

The operating location and optional GSTIN are company-provided registration details. GSTIN validation checks format only.

## Company loads

Run `supabase/migrations/20261125000300_company_loads.sql` after the company profiles migration. Sign in and open **My loads** from the company dashboard. Post a load, check it appears as Open, then close it and verify it remains visible as Closed. RLS confines all load operations to the owning company. Loading dates are validated in Indian time.

## Driver load browsing

Run `supabase/migrations/20261125000400_driver_browse_loads.sql` after the company loads migration. A signed-in driver can use **Browse loads** from their dashboard to see open upcoming loads and filter by pickup city, loading date or truck type. The listing exposes the company name and load summary. Company contacts and private loading notes stay out of the listing.

## Driver interest

Run `supabase/migrations/20261125000500_load_interests.sql` after the driver browse migration. A driver can submit one payment request per open, upcoming load. The company that posted it can open **Interested drivers** in **My loads** to see names and submission times. Closed loads keep their interest history. Driver contact details are excluded from this list.

## Company offers and payment records

Run `supabase/migrations/20261125000600_load_offers.sql` after the load interests migration. In **My loads > Interested drivers**, a company can select one driver at a time. With the driver payment requests migration, the offer uses the amount the driver entered. The driver can accept or decline in **My offers**. Acceptance closes the listing and assigns the load to that driver. A decline lets the company choose another interested driver.

After making a payment outside the app, the company can record it with an optional reference. This status reflects what the company recorded. The app has no payment gateway, fund transfer, or bank-side verification.

## Company payments, activity, and profile edits

Run `supabase/migrations/20261125000700_company_payments_and_profile.sql` after the offers migration. Accepted offers appear in **Payments due**. After paying outside the app, use **Record a payment already made**; the payment moves to **Recorded payments**. Payment records are company-entered and do not initiate or verify transfers.

The company dashboard shows interest, offer responses, and payment records. The dashboard, payments, interested-driver page, and driver offers refresh automatically when their tabs are visible. Historical offer responses without a recorded response timestamp do not appear in the activity feed.

Company profile edits apply to the signed-in company's own profile. Sign-in email changes go through Supabase's configured confirmation process using the existing company auth callback.

## Administrator setup

1. Run `supabase/migrations/20261125000800_admin_dashboard.sql` after the company payments migration.
2. While signed in to the Supabase dashboard as the project owner, open **Authentication > Users** and create a dedicated email/password account for the platform administrator. Use an email address you control and save the password privately. Copy that account's user UUID.
3. In the shared project's SQL Editor, run the following with the dedicated administrator user's actual UUID:

   ```sql
   insert into public.platform_admins (user_id)
   values ('PASTE_ADMIN_USER_UUID_HERE'::uuid)
   on conflict (user_id) do nothing;
   ```

4. Open `http://localhost:3000/admin/login` and sign in with that account. There is no public admin registration. Access depends on the database allowlist, and the email and password are handled by Supabase Auth.

The admin dashboard is read-only and shows live totals and paginated records. Accepted assignments represent accepted load offers. Trip progress, delivery confirmation and actual payment transfers are separate features.

## Driver payment requests

Run the expected payment, driver expected payment, and driver payment requests migrations in order (00900, 01000, 01100). In **Browse loads**, drivers enter a payment amount within the displayed range. In **My loads > Driver requests**, the company selects a driver at that amount. The driver confirms in **My offers**. An older load without a payment range cannot accept new payment requests.
## Trip addresses and location sharing

Run `supabase/migrations/20261125001200_trip_addresses_tracking.sql` after the driver payment requests migration. New load posts need full pickup and delivery addresses. Drivers can see them in **My trips** after accepting the offer. Companies can see their own addresses in **My loads** and **Trips**. Older loads keep their existing city information.

Run `supabase/migrations/20261125001400_company_dispatch.sql` to move dispatch to the company. After loading, the owning company uses **Mark dispatched** in **Trips**. The driver page refreshes automatically and shows **Share my location**. Browser permission is required. Keep the trip page visible and connected for updates. The owning company sees the last shared location and time in **Trips**, with a link to open it on a map. **Mark delivered** stops location updates and removes the stored position. This is browser-based sharing and does not continue in the background. Use HTTPS when testing from a phone on a deployed site.

## In-page live trip map

After the trip addresses migration, run `supabase/migrations/20261125001300_live_trip_map.sql` and ensure Realtime is enabled in the Supabase project. Open **Company > Trips**, expand **Driver location map** for a dispatched trip, and allow location sharing on the assigned driver's device. The map moves when a new position arrives. The Trips page continues refreshing if the Realtime connection is interrupted.

The map uses Leaflet and OpenStreetMap's standard tiles for low-volume testing. You can set `NEXT_PUBLIC_TRIP_TILE_URL` to a compatible OpenStreetMap-derived tile endpoint if needed and ensure its attribution requirements are met.

## Company booking commission

Run `supabase/migrations/20261125001500_company_booking_commission.sql` after the company dispatch migration. Each booking newly confirmed by the driver creates one company commission at 4% of the agreed price, rounded to the nearest paise. Earlier confirmed bookings are excluded. Driver payments continue to use the full agreed price.

Companies can record a platform payment reference separately from the driver's payment. The administrator verifies actual receipt outside the app before marking the commission paid. Admin pending totals include submitted references awaiting verification, and revenue includes verified payments only. Use one payment reference per booking.
