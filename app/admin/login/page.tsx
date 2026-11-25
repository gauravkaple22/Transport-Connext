import { redirect } from "next/navigation";
import { isSignedInAdmin } from "../../../lib/admin";
import { CompanyForm } from "../../company/company-form";
import { emailField, passwordField } from "../../company/fields";
import { loginAdmin } from "../actions";

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (await isSignedInAdmin()) redirect("/admin/dashboard");
  const { notice } = await searchParams;

  return (
    <section className="panel mx-auto max-w-lg p-6 sm:p-9">
      <h1 className="text-3xl font-extrabold tracking-tight">Admin sign-in</h1>
      <p className="mt-2 text-[#50645c]">Use the email and password for your authorised administrator account.</p>
      {notice === "signed-out" && <p role="status" className="mt-4 rounded-xl bg-[#edf4ef] p-3 text-sm">You are logged out.</p>}
      <CompanyForm action={loginAdmin} groups={[{ fields: [{ ...emailField, label: "Administrator email" }, passwordField] }]}
        submit="Sign in" pendingLabel="Signing in…" />
    </section>
  );
}
