"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ label, pendingLabel, variant = "primary" }: { label: string; pendingLabel: string; variant?: "primary" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <div className="mt-1 grid">
      <button type="submit" className={variant === "outline" ? "button-outline disabled:opacity-65" : "button"} disabled={pending}>
        {pending && <span aria-hidden="true" className="size-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />}
        <span>{pending ? pendingLabel : label}</span>
      </button>
      <span role="status" className="sr-only">{pending ? pendingLabel : ""}</span>
    </div>
  );
}

export function PasswordField({
  isNew, value, onChange, error,
}: {
  isNew: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label htmlFor="driver-password">Password</label>
      <div className="relative">
        <input id="driver-password" name="password" type={visible ? "text" : "password"}
          autoComplete={isNew ? "new-password" : "current-password"}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "driver-password-error" : isNew ? "password-length" : undefined}
          minLength={isNew ? 8 : undefined} className="pr-20"
          value={value} onChange={(event) => onChange(event.target.value)} required />
        <button type="button" onClick={() => setVisible(!visible)} aria-controls="driver-password"
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 min-w-16 rounded-lg px-4 font-semibold text-[#164e43] hover:bg-[#edf4ef]">
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {error ? <span id="driver-password-error" className="field-error">{error}</span> :
        isNew && <span id="password-length" className="font-normal text-[#50645c]">Use at least 8 characters.</span>}
    </div>
  );
}
