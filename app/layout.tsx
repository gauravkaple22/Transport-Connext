import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { accountRoles } from "../lib/account-roles";
import { signedInAccountRole } from "../lib/auth-navigation";
import { LoginMenu } from "./login-menu";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transport Connect",
  description: "Connecting transport companies and truck drivers in Maharashtra",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const role = await signedInAccountRole();
  const account = role ? accountRoles[role] : null;
  return (
    <html lang="en">
      <body className="flex flex-col">
        <header className="border-b border-[#dbe4dc] bg-white">
          <nav aria-label="Main navigation" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight sm:text-lg">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#164e43] text-lg text-[#f9dc8a]">→</span>
              Transport Connect
            </Link>
            {account ? (
              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden rounded-full bg-[#edf4ef] px-3 py-1 text-xs font-semibold sm:inline">{account.label}</span>
                <Link href={account.dashboard} className="button-outline">Dashboard</Link>
              </div>
            ) : (
              <Suspense fallback={<Link href="/login" className="button shrink-0">Log in</Link>}>
                <LoginMenu />
              </Suspense>
            )}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8 sm:py-12">{children}</main>
        <footer className="border-t border-[#dbe4dc]">
          <div className="mx-auto max-w-6xl px-5 py-5 text-sm text-[#50645c] sm:px-8">Transport Connect · Maharashtra, India</div>
        </footer>
      </body>
    </html>
  );
}
