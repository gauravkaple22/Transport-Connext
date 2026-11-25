import { requireCompany } from "../../../lib/company";
import { SubmitButton } from "../../driver/form-controls";
import { Workspace, WorkspaceHeading } from "../../workspace";
import { logoutCompany } from "../actions";
import { CompanyForm } from "../company-form";
import { changeCompanyEmail, saveCompanyProfile } from "./actions";
import { companyBusinessFields, companyContactFields } from "../fields";

export default async function CompanyProfile() {
  const { profile, email } = await requireCompany("/company/login?next=profile");

  return (
    <Workspace role="company" current="/company/profile" heading="Company profile"
      accountAction={<form action={logoutCompany}><SubmitButton label="Log out" pendingLabel="Logging out…" variant="outline" /></form>}>
      <WorkspaceHeading label="Company account" title="Company profile" description="Update your business and contact details." />
      <section className="panel p-5 sm:p-6">
        <h2 className="text-xl font-bold">Business and contact details</h2>
        <CompanyForm action={saveCompanyProfile} initialValues={{
          company_name: profile.company_name, contact_name: profile.contact_name,
          contact_mobile: profile.contact_mobile, secondary_contact_mobile: profile.secondary_contact_mobile ?? "",
          business_address: profile.business_address ?? "", city: profile.city, state: profile.state, gstin: profile.gstin ?? "",
        }} groups={[
          { title: "Business", fields: companyBusinessFields.map((field) => ({ ...field,
            optional: field.name === "gstin" ? !profile.gstin : field.name === "business_address" && !profile.business_address,
          })) },
          { title: "Contact", fields: [...companyContactFields] },
        ]} submit="Save profile" pendingLabel="Saving profile…" />
      </section>
      <section className="panel p-5 sm:p-6">
        <h2 className="text-xl font-bold">Sign-in email</h2>
        {email && <p className="mt-2 break-all text-sm text-[#50645c]">{email}</p>}
        <p className="mt-2 text-sm text-[#50645c]">Follow the confirmation email instructions before using the new address to log in.</p>
        <div className="max-w-sm">
          <CompanyForm action={changeCompanyEmail} groups={[{ fields: [
            { name: "email", label: "New work email", type: "email", autoComplete: "email", maxLength: 254 },
          ] }]} submit="Request email change" pendingLabel="Sending confirmation…" />
        </div>
      </section>
    </Workspace>
  );
}
