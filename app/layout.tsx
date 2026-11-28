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
        <header className="border-b border-[#d4e1da] bg-[#f8fbf9]">
          <nav aria-label="Main navigation" className="site-shell flex items-center justify-between gap-3 py-3">
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
        <main className="site-shell flex-1 py-5 sm:py-7">{children}</main>
        <footer className="border-t border-[#d4e1da] bg-[#e3ede8]">
          <div className="site-shell py-3 text-sm text-[#435952]">Transport Connect · Maharashtra, India</div>
        </footer>
      </body>
    </html>
  );
}
