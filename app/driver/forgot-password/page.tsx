import Link from "next/link";
import { redirectSignedInDriver } from "../../../lib/driver";
import { Card } from "../form";

export default async function ForgotPassword() {
  await redirectSignedInDriver();
  return (
    <Card title="Forgot your password?">
      <p className="mt-4 text-slate-600">Self-service password recovery is currently unavailable for driver accounts.</p>
      <Link href="/driver/login" className="text-link mt-5 inline-block text-sm">Back to driver login</Link>
    </Card>
  );
}
