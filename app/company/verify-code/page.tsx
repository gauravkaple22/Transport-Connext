import Link from "next/link";
import { redirectSignedInCompany } from "../../../lib/company";
import { verifyRecovery } from "../actions";
import { CompanyCard } from "../card";
import { CompanyForm } from "../company-form";
import { emailField } from "../fields";

export default async function VerifyCompanyCode() {
  await redirectSignedInCompany();
  return (
    <CompanyCard title="Enter your reset code" description="Use the work email and one-time code from your password reset email.">
      <CompanyForm action={verifyRecovery} submit="Verify code" pendingLabel="Checking code…" groups={[{ fields: [
        emailField,
        { name: "otp", label: "One-time code", autoComplete: "one-time-code", inputMode: "numeric", maxLength: 10 },
      ] }]} />
      <Link href="/company/forgot-password" className="text-link mt-5 inline-block text-sm">Request a new reset email</Link>
    </CompanyCard>
  );
}
