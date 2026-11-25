"use server";

import { revalidatePath } from "next/cache";
import { requireCompany } from "../../../lib/company";
import { isLoadId } from "../../../lib/load-fields";

type DispatchState = { error?: string; dispatched?: boolean };

export async function dispatchTrip(offerId: string, _: DispatchState): Promise<DispatchState> {
  const { supabase } = await requireCompany();
  if (!isLoadId(offerId)) return { error: "This trip is unavailable." };

  const { data, error } = await supabase.rpc("dispatch_company_trip", { trip_offer_id: offerId });
  if (error || data !== true) return { error: "Could not dispatch this trip. Confirm the driver's advance is recorded and try again." };

  revalidatePath("/company/trips");
  revalidatePath("/driver/trips");
  return { dispatched: true };
}
