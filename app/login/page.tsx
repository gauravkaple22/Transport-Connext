import { redirect } from "next/navigation";
import { accountRoles } from "../../lib/account-roles";
import { signedInAccountRole } from "../../lib/auth-navigation";

export default async function LoginEntry() {
  const role = await signedInAccountRole();
  redirect(role ? accountRoles[role].dashboard : "/?login=1");
}
