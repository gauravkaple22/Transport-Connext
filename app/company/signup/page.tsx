import Link from "next/link";
import { redirectSignedInCompany } from "../../../lib/company";
import { registerCompany } from "../actions";
import { CompanyCard } from "../card";
import { CompanyForm } from "../company-form";
import { companyBusinessFields, companyContactFields, emailField, newPasswordFields } from "../fields";

export default async function CompanySignup() {
  await redirectSignedInCompany();
  return (
    <CompanyCard title="Register your transport company" description="Enter your business details and the work email you will use to log in." wide>
      <CompanyForm action={registerCompany} submit="Create company account" pendingLabel="Creating your account…"
        groups={[
          { title: "Business details", fields: [...companyBusinessFields] },
          { title: "Contact details", fields: [...companyContactFields, emailField] },
          { title: "Choose a password", fields: [...newPasswordFields] },
        ]} />
      <p className="mt-5 text-sm">Already registered? <Link href="/company/login" className="text-link">Log in</Link></p>
    </CompanyCard>
  );
}
