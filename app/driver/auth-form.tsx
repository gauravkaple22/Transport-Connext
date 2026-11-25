"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PasswordField, SubmitButton } from "./form-controls";

export type DriverFormState = {
  message?: string;
  fields?: Partial<Record<"full_name" | "phone" | "password", string>>;
};

type AuthAction = (previous: DriverFormState, form: FormData) => Promise<DriverFormState>;

export function DriverAuthForm({ action, signup = false }: { action: AuthAction; signup?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const message = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const invalid = form.current?.querySelector<HTMLInputElement>('input[aria-invalid="true"]');
    if (invalid) invalid.focus();
    else if (state.message) message.current?.focus();
  }, [state]);

  const nameError = state.fields?.full_name;
  const phoneError = state.fields?.phone;

  return (
    <form ref={form} action={formAction} className="mt-6" noValidate>
      {state.message && (
        <p ref={message} tabIndex={-1} role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-900">
          {state.message}
        </p>
      )}
      <fieldset disabled={pending} className="grid min-w-0 gap-5">
        {signup && (
          <label className="field">
            Full name
            <input name="full_name" autoComplete="name" maxLength={100} value={name}
              onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "driver-name-error" : undefined} required />
            {nameError && <span id="driver-name-error" className="field-error">{nameError}</span>}
          </label>
        )}
        <label className="field">
          Mobile number
          <span className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 grid w-14 place-items-center text-[#50645c]">+91</span>
            <input name="phone" type="tel" inputMode="tel" autoComplete="username" maxLength={20}
              className="pl-14" placeholder="98765 43210" value={phone}
              onChange={(event) => setPhone(event.target.value)} aria-invalid={Boolean(phoneError)}
              aria-describedby={phoneError ? "driver-phone-error" : "driver-phone-hint"} required />
          </span>
          {phoneError ? <span id="driver-phone-error" className="field-error">{phoneError}</span> :
            <span id="driver-phone-hint" className="font-normal text-[#50645c]">Enter your 10-digit Indian mobile number.</span>}
        </label>
        <PasswordField isNew={signup} value={password} onChange={setPassword} error={state.fields?.password} />
        <SubmitButton label={signup ? "Create account" : "Log in"}
          pendingLabel={signup ? "Creating your account…" : "Logging in…"} />
      </fieldset>
    </form>
  );
}
