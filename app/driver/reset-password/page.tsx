import { requireDriverRecovery } from "../../../lib/driver-recovery";
import { CompanyForm } from "../../company/company-form";
import { newPasswordFields } from "../../company/fields";
import { Card } from "../form";
import { resetDriverPassword } from "../recovery-actions";

export default async function ResetDriverPassword() {
  await requireDriverRecovery();

  return (
    <Card title="Choose a new password">
      <p className="mt-3 text-sm text-[#50645c]">Use your mobile number and this password the next time you log in.</p>
      <CompanyForm action={resetDriverPassword} groups={[{ fields: [...newPasswordFields] }]}
        submit="Save new password" pendingLabel="Saving password…" />
    </Card>
  );
}
