import { requireCompanyRecovery } from "../../../lib/company";
import { updateCompanyPassword } from "../actions";
import { CompanyCard } from "../card";
import { CompanyForm } from "../company-form";
import { newPasswordFields } from "../fields";

export const dynamic = "force-dynamic";

export default async function ResetCompanyPassword() {
  await requireCompanyRecovery();

  return (
    <CompanyCard title="Choose a new password" description="Use this password the next time you log in.">
      <CompanyForm action={updateCompanyPassword} groups={[{ fields: [...newPasswordFields] }]}
        submit="Save new password" pendingLabel="Saving password…" />
    </CompanyCard>
  );
}
