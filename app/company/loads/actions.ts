"use server";

import { redirect } from "next/navigation";
import { requireCompany } from "../../../lib/company";
import { parsePaymentAmount } from "../../../lib/load-offers";
import type { CompanyFormState } from "../company-form";
import { isLoadId, isLoadingDate, truckTypes } from "../../../lib/load-fields";

function value(form: FormData, name: string) {
  const entry = form.get(name);
  return typeof entry === "string" ? entry.trim() : "";
}

export async function postLoad(id: string, _: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const { supabase, userId } = await requireCompany();
  if (!isLoadId(id)) return { message: "Reload this page before posting a load." };

  const pickup = value(form, "pickup_city");
  const destination = value(form, "destination_city");
  const loadingDate = value(form, "loading_date");
  const pickupAddress = value(form, "pickup_address");
  const deliveryAddress = value(form, "delivery_address");
  const cargo = value(form, "cargo_type");
  const truck = value(form, "truck_type");
  const size = value(form, "vehicle_size");
  const notes = value(form, "notes");
  const expectedMin = parsePaymentAmount(value(form, "expected_min"));
  const expectedMax = parsePaymentAmount(value(form, "expected_max"));
  const fields: Record<string, string> = {};
  if (pickup.length < 2 || pickup.length > 80) fields.pickup_city = "Enter the pickup city.";
  if (destination.length < 2 || destination.length > 80) fields.destination_city = "Enter the destination city.";
  if (pickupAddress.length < 10 || pickupAddress.length > 350) fields.pickup_address = "Enter the full pickup address.";
  if (deliveryAddress.length < 10 || deliveryAddress.length > 350) fields.delivery_address = "Enter the full delivery address.";
  if (!isLoadingDate(loadingDate)) fields.loading_date = "Choose today or a future date.";
  if (cargo.length < 2 || cargo.length > 100) fields.cargo_type = "Enter what you are transporting.";
  if (!truckTypes.some(({ value }) => value === truck)) fields.truck_type = "Choose the truck you need.";
  if (!/^\d{1,2}(\.\d)?$/.test(size) || Number(size) < 1 || Number(size) > 80) {
    fields.vehicle_size = "Enter a length between 1 and 80 feet, with up to one decimal place.";
  }
  if (expectedMin === null) fields.expected_min = "Enter a minimum amount between ₹1 and ₹1 crore.";
  if (expectedMax === null) fields.expected_max = "Enter a maximum amount between ₹1 and ₹1 crore.";
  if (expectedMin !== null && expectedMax !== null && expectedMax < expectedMin) {
    fields.expected_max = "The maximum must be at least the minimum.";
  }
  if (notes.length > 500) fields.notes = "Use 500 characters or fewer.";
  if (Object.keys(fields).length) return { fields };

  const { error } = await supabase.from("company_loads").upsert({
    company_id: userId, id, pickup_city: pickup, destination_city: destination,
    loading_date: loadingDate, cargo_type: cargo, truck_type: truck, vehicle_size_feet: Number(size), notes: notes || null,
    expected_min_paise: expectedMin, expected_max_paise: expectedMax,
    pickup_address: pickupAddress, delivery_address: deliveryAddress,
  }, { onConflict: "company_id,id", ignoreDuplicates: true });
  if (error) return { message: "We couldn't post your load. Try again shortly." };

  redirect("/company/loads?notice=posted");
}

export async function closeLoad(form: FormData) {
  const { supabase, userId } = await requireCompany();
  const id = value(form, "load_id");
  if (!isLoadId(id)) redirect("/company/loads?notice=close-failed");

  const { data, error } = await supabase
    .from("company_loads").update({ status: "closed" })
    .eq("company_id", userId).eq("id", id).eq("status", "open")
    .select("id").maybeSingle();
  if (error || !data) redirect("/company/loads?notice=close-failed");
  redirect("/company/loads?notice=closed");
}
