import Link from "next/link";
import { redirectSignedInDriver } from "../../../lib/driver";
import { signIn } from "../actions";
import { DriverAuthForm } from "../auth-form";
import type { DriverSearchParams } from "../form";

export default async function Login({ searchParams }: { searchParams: DriverSearchParams }) {
  await redirectSignedInDriver();
  const { notice } = await searchParams;
  const message = notice === "signed-out" ? "You are logged out." :
    notice === "driver-required" ? "Use a driver account to log in here." :
    notice === "unavailable" ? "Driver login is temporarily unavailable. Try again later." : null;

  return (
    <section className="panel mx-auto grid max-w-4xl overflow-hidden lg:grid-cols-[0.85fr_1fr]">
      <div className="bg-[#123b33] p-6 text-white sm:p-9 lg:flex lg:flex-col lg:justify-center">
        <p className="text-sm font-semibold text-[#f9dc8a]">Transport Connect for drivers</p>
        <p className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Find loads for your next trip</p>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#d8e8e1]">
          Browse open loads and respond to offers from transport companies.
        </p>
      </div>
      <div className="min-w-0 p-6 sm:p-9">
        <h1 className="text-3xl font-extrabold tracking-tight">Driver login</h1>
        <p className="mt-2 text-sm text-[#50645c]">Use your mobile number and password to sign in.</p>
        {message && <p role="status" className="mt-4 rounded-xl bg-[#edf4ef] p-3 text-sm">{message}</p>}
        <DriverAuthForm action={signIn} />
        <Link href="/driver/forgot-password" className="text-link mt-3 inline-block py-2 text-sm">Forgot your password?</Link>
        <div className="mt-4 border-t border-[#dbe4dc] pt-5">
          <Link href="/driver/signup" className="button-outline w-full">Create a driver account</Link>
          <Link href="/login" className="text-link mt-3 inline-block py-2 text-sm">Other login options</Link>
        </div>
      </div>
    </section>
  );
}
