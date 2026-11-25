import { requireCompany } from "../../../lib/company";
import { SubmitButton } from "../../driver/form-controls";
import { TripList, tripPageNumber, type Trip } from "../../trip-list";
import { Workspace } from "../../workspace";
import { logoutCompany } from "../actions";

export default async function CompanyTrips({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase } = await requireCompany("/company/login?next=trips");
  const page = tripPageNumber((await searchParams).page);
  const { data, error } = await supabase.rpc("list_account_trips", { view_as: "company", page_offset: (page - 1) * 20 });
  const trips: Trip[] = Array.isArray(data) ? data : [];

  return (
    <Workspace role="company" current="/company/trips" heading="Company trips"
      accountAction={<form action={logoutCompany}><SubmitButton label="Log out" pendingLabel="Logging out…" variant="outline" /></form>}>
      <TripList role="company" source={{ data: trips, error: Boolean(error), page }} />
    </Workspace>
  );
}
