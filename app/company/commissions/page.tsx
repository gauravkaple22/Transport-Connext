import Link from "next/link";
import { requireCompany } from "../../../lib/company";
import { AutoRefresh } from "../../auto-refresh";
import { CommissionForm } from "../../commission-form";
import { CommissionList, commissionPage, commissionPageSize, type Commission } from "../../commission-list";
import { SubmitButton } from "../../driver/form-controls";
import { Workspace, WorkspaceHeading } from "../../workspace";
import { logoutCompany } from "../actions";
import { CommissionUpiPayment } from "./upi-payment";
import { submitCommissionReference } from "./actions";

export default async function CompanyCommissions({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase } = await requireCompany("/company/login?next=commissions");
  const page = commissionPage((await searchParams).page);
  const { data, error } = await supabase.rpc("list_booking_commissions", {
    admin_view: false, page_offset: (page - 1) * commissionPageSize,
  });
  const records: Commission[] = Array.isArray(data) ? data : [];

  return (
    <Workspace role="company" current="/company/payments" heading="Platform commission"
      accountAction={<form action={logoutCompany}><SubmitButton label="Log out" pendingLabel="Logging out…" variant="outline" /></form>}>
      <AutoRefresh intervalMs={records.some((record) => record.commission_status === "submitted") ? 5000 : 20000} />
      <WorkspaceHeading label="Company payments" title="Platform commission"
        description="The company pays a fixed platform fee on new confirmed bookings. Pay the driver the full agreed amount directly." />
      <Link className="text-link w-fit text-sm" href="/company/payments">Back to driver payments</Link>
      <CommissionList records={records} error={Boolean(error)} page={page} path="/company/commissions"
        renderAction={(record) => record.commission_status !== "paid" && (
          <details className="mt-4 rounded-xl border border-[#dbe4dc] p-4">
            <summary className="cursor-pointer font-semibold">{record.commission_status === "submitted" ? "View or update payment reference" : "Pay platform fee"}</summary>
            {record.commission_status === "pending" && <CommissionUpiPayment offerId={record.offer_id} amount={record.commission_paise} />}
            <p className="mt-3 text-sm text-[#50645c]">
              {record.commission_status === "submitted"
                ? "Your reference is awaiting Admin verification. This page updates automatically when the payment is verified."
                : "After paying, enter the UPI transaction ID from your receipt. The admin will verify the payment."}
            </p>
            <CommissionForm action={submitCommissionReference.bind(null, record.offer_id)} reference={record.payment_reference} upi />
          </details>
        )} />
    </Workspace>
  );
}
