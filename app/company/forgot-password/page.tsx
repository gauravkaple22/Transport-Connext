import Link from "next/link";
import { redirectSignedInCompany } from "../../../lib/company";
import { sendRecovery } from "../actions";
import { CompanyCard } from "../card";
import { CompanyForm } from "../company-form";
import { emailField } from "../fields";

export default async function ForgotCompanyPassword() {
  await redirectSignedInCompany();
  return (
    <CompanyCard title="Reset your company password" description="Enter your work email. Follow the link in the reset email, or enter the one-time code if your email includes one.">
      <CompanyForm action={sendRecovery} groups={[{ fields: [emailField] }]}
        submit="Send reset email" pendingLabel="Sending reset email…" />
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
        <Link href="/company/verify-code" className="text-link">Enter a reset code</Link>
        <Link href="/company/login" className="text-link">Back to login</Link>
      </div>
    </CompanyCard>
  );
}
