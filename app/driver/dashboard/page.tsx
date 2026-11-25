import Link from "next/link";
import { requireDriver } from "../../../lib/driver";
import { ProfileDetails, Workspace, WorkspaceHeading, WorkspaceTile } from "../../workspace";
import { signOut } from "../actions";
import { SubmitButton } from "../form-controls";
import type { DriverSearchParams } from "../form";

export default async function DriverDashboard({ searchParams }: { searchParams: DriverSearchParams }) {
  const { profile, lastFour } = await requireDriver();
  const { notice } = await searchParams;

  return (
    <Workspace role="driver" current="/driver/dashboard" heading="Driver dashboard"
      accountAction={<form action={signOut}><SubmitButton label="Log out" pendingLabel="Logging out…" variant="outline" /></form>}>
      <WorkspaceHeading label="Driver dashboard" title={`Welcome, ${profile.full_name}`}
        description="Find a load that suits you or respond to offers from transport companies."
        action={<Link href="/driver/loads" className="button-outline">Browse loads</Link>} />
      {notice === "logout-failed" && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900">Could not log out. Please try again.</p>}
      <section aria-label="Driver quick actions" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <WorkspaceTile href="/driver/loads" title="Find loads" description="Search by pickup city, loading date, or truck type." />
        <WorkspaceTile href="/driver/trips" title="My trips" description="See full addresses and update your dispatch and delivery status." />
        <WorkspaceTile href="/driver/offers" title="Review my offers" description="See the payment amount and accept or decline an offer." />
      </section>
      <section className="panel p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">My profile</h2>
          <Link href="/driver/profile" className="text-link text-sm">View profile</Link>
        </div>
        <ProfileDetails details={[["Full name", profile.full_name], ["Mobile number", lastFour ? `Ending in ${lastFour}` : null]]} />
      </section>
    </Workspace>
  );
}
