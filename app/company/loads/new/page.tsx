import { randomUUID } from "node:crypto";
import Link from "next/link";
import { requireCompany } from "../../../../lib/company";
import { CompanyCard } from "../../card";
import { CompanyForm } from "../../company-form";
import { postLoad } from "../actions";
import { indiaToday, truckTypes } from "../../../../lib/load-fields";

export const dynamic = "force-dynamic";

export default async function NewLoad() {
  await requireCompany("/company/login?next=post-load");

  return (
    <CompanyCard title="Post a load" description="Tell us where the load is going, what you are moving, which truck you need, and what you expect to pay." wide>
      <CompanyForm action={postLoad.bind(null, randomUUID())} submit="Post load" pendingLabel="Posting load…"
        groups={[
          { title: "Route and date", fields: [
            { name: "pickup_city", label: "Pickup city", maxLength: 80, placeholder: "e.g. Pune" },
            { name: "destination_city", label: "Destination city", maxLength: 80, placeholder: "e.g. Nashik" },
            { name: "loading_date", label: "Loading date", type: "date", min: indiaToday() },
            { name: "pickup_address", label: "Full pickup address", type: "textarea", maxLength: 350, wide: true,
              hint: "Include the building or warehouse, street, area, and PIN code." },
            { name: "delivery_address", label: "Full delivery address", type: "textarea", maxLength: 350, wide: true,
              hint: "Only the driver who accepts the trip will see the full addresses." },
          ] },
          { title: "Cargo and truck", fields: [
            { name: "cargo_type", label: "Cargo type", maxLength: 100, placeholder: "e.g. Bagged grain" },
            { name: "truck_type", label: "Truck required", type: "select", options: truckTypes },
            { name: "vehicle_size", label: "Truck body length (ft)", inputMode: "decimal", maxLength: 4, placeholder: "e.g. 17" },
            { name: "notes", label: "Loading instructions", type: "textarea", optional: true, maxLength: 500,
              placeholder: "e.g. Pickup gate, loading window, or handling instructions", wide: true },
          ] },
          { title: "Expected payment", fields: [
            { name: "expected_min", label: "Minimum amount (₹)", inputMode: "decimal", maxLength: 11, placeholder: "e.g. 8000" },
            { name: "expected_max", label: "Maximum amount (₹)", inputMode: "decimal", maxLength: 11, placeholder: "e.g. 10000",
              hint: "For a fixed amount, enter the same number in both fields." },
          ] },
        ]} />
      <Link href="/company/loads" className="text-link mt-5 inline-block py-2 text-sm">Cancel and go to My loads</Link>
    </CompanyCard>
  );
}
