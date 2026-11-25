import Link from "next/link";
import { requireCompany } from "../../../lib/company";
import { AutoRefresh } from "../../auto-refresh";
import { ActivityFeed, type CompanyActivity } from "../activity-feed";
import { SubmitButton } from "../../driver/form-controls";
import { ProfileDetails, Workspace, WorkspaceHeading, WorkspaceTile } from "../../workspace";
import { logoutCompany } from "../actions";

export default async function CompanyDashboard({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { supabase, profile, email } = await requireCompany();
  const [{ notice }, { data: activity, error: activityError }] = await Promise.all([
    searchParams, supabase.rpc("list_company_activity"),
  ]);
  const events: CompanyActivity[] = Array.isArray(activity) ? activity : [];

  return (
    <Workspace role="company" current="/company/dashboard" heading="Company dashboard"
      accountAction={<form action={logoutCompany}><SubmitButton label="Log out" pendingLabel="Logging out…" variant="outline" /></form>}>
      <AutoRefresh />
      <WorkspaceHeading label="Company dashboard" title={profile.company_name}
        description="Post loads, review interested drivers, and manage your load offers."
        action={<Link href="/company/loads/new" className="button-outline">+ Post a load</Link>} />
      {notice === "logout-failed" && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900">Could not log out. Please try again.</p>}
      {notice === "password-updated" && <p role="status" className="rounded-xl bg-[#edf4ef] p-4 text-sm">Your password was updated. Please log out and log in again.</p>}
      <section aria-label="Company quick actions" className="grid gap-4 sm:grid-cols-2">
        <WorkspaceTile href="/company/loads/new" title="Post transport work" description="Add the route, cargo, loading date, and truck required." />
        <WorkspaceTile href="/company/loads" title="Manage my loads" description="Review your loads, see who is interested, and send offers." />
        <WorkspaceTile href="/company/trips" title="Track trips" description="Follow dispatch, last shared location, and delivery." />
        <WorkspaceTile href="/company/payments" title="Trip payments" description="See what is due and record payments you have made." />
      </section>
      <ActivityFeed events={events} unavailable={Boolean(activityError)} />
      <section className="panel p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Company profile</h2>
          <Link href="/company/profile" className="text-link text-sm">View profile</Link>
        </div>
        <ProfileDetails details={[["Contact person", profile.contact_name], ["Work email", email],
          ["Operating location", `${profile.city}, ${profile.state}`]]} />
      </section>
    </Workspace>
  );
}
