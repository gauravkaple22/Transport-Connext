import { CompanyForm } from "../../company/company-form";
import { addRecoveryEmail } from "../recovery-actions";
import { VehicleDetailsForm } from "./vehicle-details-form";
import { requireDriver } from "../../../lib/driver";
import { ProfileDetails, Workspace, WorkspaceHeading } from "../../workspace";
import { signOut } from "../actions";
import { SubmitButton } from "../form-controls";

export default async function DriverProfile({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const { profile, lastFour, supabase, userId } = await requireDriver();
  const [{ data: vehicle, error }, { data: auth }] = await Promise.all([
    supabase.from("driver_vehicle_details").select("vehicle_number").eq("driver_id", userId).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const recoveryEmail = auth.user?.email_confirmed_at ? auth.user.email : undefined;

  return (
    <Workspace role="driver" current="/driver/profile" heading="Driver profile"
      accountAction={<form action={signOut}><SubmitButton label="Log out" pendingLabel="Logging out…" variant="outline" /></form>}>
      <WorkspaceHeading label="Driver account" title="My profile" description="The account details you used to register." />
      <section className="panel p-5 sm:p-6">
        <h2 className="mb-4 text-xl font-bold">Personal details</h2>
        <ProfileDetails details={[["Full name", profile.full_name], ["Mobile number", lastFour ? `Ending in ${lastFour}` : null]]} />
      </section>
      <section className="panel grid gap-4 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Vehicle and documents</h2>
        {error ? <p role="alert">Vehicle details are temporarily unavailable.</p>
          : vehicle ? <ProfileDetails details={[["Vehicle number", vehicle.vehicle_number], ["Documents", "Submitted"]]} />
          : <VehicleDetailsForm userId={userId} />}
      </section>
      <section id="recovery-email" className="panel scroll-mt-5 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Recovery email</h2>
        {notice === "email-unconfirmed" && <p role="status" className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Your recovery email is still unverified. If you changed an existing address, confirm both emails. If the link expired, request a new one below.
        </p>}
        <p className="mt-2 text-sm text-[#50645c]">Add an optional email to reset your password without SMS. Keep using your mobile number to log in.</p>
        {recoveryEmail && <p className="mt-2 break-all text-sm">Verified email: {recoveryEmail}</p>}
        <div className="max-w-sm">
          <CompanyForm action={addRecoveryEmail} groups={[{ fields: [
            { name: "email", label: recoveryEmail ? "New recovery email" : "Recovery email", type: "email", autoComplete: "email", maxLength: 254 },
          ] }]} submit={recoveryEmail ? "Change recovery email" : "Send confirmation link"} pendingLabel="Sending confirmation…" />
        </div>
      </section>
    </Workspace>
  );
}
