import Link from "next/link";
import { CompanyForm } from "../../company/company-form";
import { Card, type DriverSearchParams } from "../form";
import { sendDriverReset } from "../recovery-actions";

export default async function ForgotPassword({ searchParams }: { searchParams: DriverSearchParams }) {
  const { notice } = await searchParams;

  return (
    <Card title="Forgot your password?">
      {notice === "invalid-link" && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-900">
        This link is invalid or expired. Request a new link and open it in the same browser.
      </p>}
      <p className="mt-3 text-sm text-[#50645c]">Enter the recovery email you verified in your driver profile.</p>
      <CompanyForm action={sendDriverReset} groups={[{ fields: [
        { name: "email", label: "Recovery email", type: "email", autoComplete: "email", maxLength: 254 },
      ] }]} submit="Send reset link" pendingLabel="Sending link…" />
      <p className="mt-4 text-sm text-[#50645c]">If you never added a recovery email, contact Transport Connect support for help.</p>
      <Link href="/driver/login" className="text-link mt-5 inline-block text-sm">Back to driver login</Link>
    </Card>
  );
}
