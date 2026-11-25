import Link from "next/link";
import { redirectSignedInDriver } from "../../../lib/driver";
import { signUp } from "../actions";
import { DriverAuthForm } from "../auth-form";
import { Card } from "../form";

export default async function Signup() {
  await redirectSignedInDriver();
  return (
    <Card title="Create a driver account">
      <p className="mt-3 text-[#50645c]">Use your own mobile number. You will use it each time you log in.</p>
      <DriverAuthForm action={signUp} signup />
      <p className="mt-5 text-sm">Already have an account? <Link href="/driver/login" className="text-link">Log in</Link></p>
    </Card>
  );
}
