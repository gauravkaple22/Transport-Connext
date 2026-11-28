import Link from "next/link";
import { redirectSignedInCompany } from "../../../lib/company";
import { loginCompany } from "../actions";
import { CompanyCard } from "../card";
import { CompanyForm } from "../company-form";
import { emailField, passwordField } from "../fields";

const notices = new Map([
  ["account-created", "Your company account is ready. Log in with your work email and password."],
  ["email-confirmed", "Your work email is confirmed. Log in to open your company dashboard."],
  ["check-email", "If registration is pending, check your work inbox for a confirmation link. If you already have an account, log in below."],
  ["password-updated", "Your password was updated. Log in with your new password."],
  ["signed-out", "You are logged out."],
  ["company-required", "Use a company account to log in here."],
  ["unavailable", "Company login is temporarily unavailable."],
  ["invalid-link", "This email link could not be used. Open it in the browser where you requested it, or request a new password reset email."],
]);

export default async function CompanyLogin({ searchParams }: { searchParams: Promise<{ notice?: string; next?: string }> }) {
  await redirectSignedInCompany();
  const { notice, next } = await searchParams;
  const message = notice ? notices.get(notice) : undefined;

  return (
    <CompanyCard title="Company login" description="Use your work email and password to access your company account.">
      {message && <p role="status" className="mt-4 rounded-xl bg-[#edf4ef] p-3 text-sm">{message}</p>}
      <CompanyForm action={loginCompany.bind(null, next)} groups={[{ fields: [emailField, passwordField] }]}
        submit="Log in" pendingLabel="Logging in…" />
      <Link href="/company/forgot-password" className="text-link mt-4 inline-block py-2 text-sm">Forgot your password?</Link>
      <div className="mt-4 border-t border-[#dbe4dc] pt-5">
        <Link href="/company/signup" className="button-outline w-full">Register a company</Link>
        <Link href="/login" className="text-link mt-4 inline-block py-2 text-sm">Other login options</Link>
      </div>
    </CompanyCard>
  );
}
