"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { accountRoles } from "../lib/account-roles";

export function LoginMenu() {
  const dialog = useRef<HTMLDialogElement>(null);
  const openFromLink = useSearchParams().get("login") === "1";

  useEffect(() => {
    if (openFromLink && !dialog.current?.open) dialog.current?.showModal();
  }, [openFromLink]);

  function clearLoginQuery() {
    const current = new URL(window.location.href);
    if (current.searchParams.get("login") !== "1") return;
    current.searchParams.delete("login");
    window.history.replaceState(null, "", current);
  }

  return (
    <>
      <button type="button" aria-haspopup="dialog" className="button shrink-0"
        onClick={() => dialog.current?.showModal()}>Log in</button>
      <dialog ref={dialog} aria-labelledby="login-menu-title" onClose={clearLoginQuery}
        className="panel fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto p-5 text-[#152e29] backdrop:bg-slate-950/60 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="login-menu-title" className="text-2xl font-extrabold tracking-tight">Log in</h2>
            <p className="mt-1 text-sm text-[#50645c]">Choose your account type.</p>
          </div>
          <button type="button" aria-label="Close login options" className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl hover:bg-[#edf4ef]"
            onClick={() => dialog.current?.close()}>×</button>
        </div>
        <ul className="mt-5 grid gap-2.5">
          {Object.values(accountRoles).map((role) => (
            <li key={role.login}>
              <Link href={role.login} onClick={() => dialog.current?.close()}
                className="flex items-center justify-between gap-4 rounded-xl border border-[#dbe4dc] px-4 py-3 hover:border-[#9dbdad] hover:bg-[#edf4ef]">
                <span>
                  <span className="block font-bold">{role.label}</span>
                  <span className="mt-1 block text-sm text-[#50645c]">{role.credential}</span>
                </span>
                <span aria-hidden="true" className="text-[#164e43]">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}
