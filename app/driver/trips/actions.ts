"use server";

import { revalidatePath } from "next/cache";
import { requireDriver } from "../../../lib/driver";
import { isLoadId } from "../../../lib/load-fields";

export type TripActionState = { error?: string; delivered?: boolean };

export async function markTripDelivered(offerId: string, _: TripActionState): Promise<TripActionState> {
  const { supabase } = await requireDriver();
  if (!isLoadId(offerId)) return { error: "This trip is unavailable." };

  const { data, error } = await supabase.rpc("deliver_driver_trip", { trip_offer_id: offerId });
  if (error || data !== true) return { error: "Could not update this trip. Check its status and try again." };
  revalidatePath("/driver/trips");
  revalidatePath("/company/trips");
  return { delivered: true };
}

export async function shareTripLocation(offerId: string, latitude: number, longitude: number, accuracy: number) {
  const { supabase } = await requireDriver();
  if (!isLoadId(offerId) || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000) return false;

  const { data, error } = await supabase.rpc("update_driver_trip_location", {
    trip_offer_id: offerId, latitude_value: latitude, longitude_value: longitude, accuracy_value: accuracy,
  });
  return !error && data === true;
}
