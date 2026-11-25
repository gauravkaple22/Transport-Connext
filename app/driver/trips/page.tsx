import { requireDriver } from "../../../lib/driver";
import { SubmitButton } from "../form-controls";
import { TripList, tripPageNumber, type Trip } from "../../trip-list";
import { Workspace } from "../../workspace";
import { signOut } from "../actions";

export default async function DriverTrips({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase } = await requireDriver();
  const page = tripPageNumber((await searchParams).page);
  const { data, error } = await supabase.rpc("list_account_trips", { view_as: "driver", page_offset: (page - 1) * 20 });
  const trips: Trip[] = Array.isArray(data) ? data : [];

  return (
    <Workspace role="driver" current="/driver/trips" heading="My trips"
      accountAction={<form action={signOut}><SubmitButton label="Log out" pendingLabel="Logging out…" variant="outline" /></form>}>
      <TripList role="driver" source={{ data: trips, error: Boolean(error), page }} />
    </Workspace>
  );
}
