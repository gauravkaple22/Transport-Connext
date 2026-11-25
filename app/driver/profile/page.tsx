import { VehicleDetailsForm } from "./vehicle-details-form";
import { requireDriver } from "../../../lib/driver";
import { ProfileDetails, Workspace, WorkspaceHeading } from "../../workspace";
import { signOut } from "../actions";
import { SubmitButton } from "../form-controls";

export default async function DriverProfile() {
  const { profile, lastFour, supabase, userId } = await requireDriver();
  const { data: vehicle, error } = await supabase.from("driver_vehicle_details")
    .select("vehicle_number").eq("driver_id", userId).maybeSingle();

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
    </Workspace>
  );
}
