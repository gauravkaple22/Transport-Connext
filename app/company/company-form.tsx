"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { SubmitButton } from "../driver/form-controls";

export type CompanyFormState = {
  message?: string;
  success?: string;
  fields?: Record<string, string>;
};

type Field = {
  name: string;
  label: string;
  type?: "email" | "tel" | "password" | "date" | "select" | "textarea";
  min?: string;
  placeholder?: string;
  options?: ReadonlyArray<{ value: string; label: string }>;
  wide?: boolean;
  autoComplete?: string;
  inputMode?: "numeric" | "decimal" | "tel" | "email";
  hint?: string;
  maxLength?: number;
  optional?: boolean;
};

type Group = { title?: string; fields: Field[] };

export function CompanyForm({
  action, groups, submit, pendingLabel, initialValues = {},
}: {
  action: (state: CompanyFormState, form: FormData) => Promise<CompanyFormState>;
  groups: Group[];
  submit: string;
  pendingLabel: string;
  initialValues?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [showPassword, setShowPassword] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const invalid = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (invalid) invalid.focus();
    else if (state.message || state.success) feedback.current?.focus();
  }, [state]);

  return (
    <form ref={form} action={formAction} className="mt-6" noValidate>
      {(state.message || state.success) && (
        <p ref={feedback} tabIndex={-1} role={state.message ? "alert" : "status"}
          className={`mb-5 rounded-xl p-3 text-sm ${state.message ? "bg-rose-50 text-rose-900" : "bg-[#edf4ef]"}`}>
          {state.message ?? state.success}
        </p>
      )}
      <fieldset disabled={pending} className="grid min-w-0 gap-6">
        {groups.map((group, index) => (
          <div className="min-w-0" key={group.title ?? index}>
            {group.title && <h2 className="mb-3 border-b border-[#dbe4dc] pb-2 font-bold">{group.title}</h2>}
            <div className={`grid gap-4 ${group.title ? "sm:grid-cols-2" : ""}`}>
              {group.fields.map((field) => {
                const id = `company-${field.name}`;
                const error = state.fields?.[field.name];
                const controls = {
                  id,
                  name: field.name,
                  value: values[field.name] ?? "",
                  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
                    setValues((current) => ({ ...current, [field.name]: event.target.value })),
                  "aria-invalid": Boolean(error),
                  "aria-describedby": error || field.hint ? `${id}-hint` : undefined,
                  required: !field.optional,
                };
                return (
                  <div className={field.wide ? "field sm:col-span-2" : "field"} key={field.name}>
                    <label htmlFor={id}>
                      {field.label}{field.optional && <span className="ml-1 font-normal text-[#50645c]">(optional)</span>}
                    </label>
                    <div className="relative">
                      {field.type === "select" ? (
                        <select {...controls}>
                          <option value="" disabled>Choose an option</option>
                          {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      ) : field.type === "textarea" ? (
                        <textarea {...controls} rows={3} maxLength={field.maxLength} placeholder={field.placeholder} />
                      ) : (
                        <input {...controls} type={field.type === "password" && showPassword ? "text" : field.type ?? "text"}
                          autoComplete={field.autoComplete} inputMode={field.inputMode} maxLength={field.maxLength}
                          min={field.min} placeholder={field.placeholder} />
                      )}
                      {field.name === "password" && (
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide passwords" : "Show passwords"}
                          className="absolute inset-y-0 right-0 rounded-lg px-4 font-semibold text-[#164e43] hover:bg-[#edf4ef]">
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      )}
                    </div>
                    {(error || field.hint) && (
                      <span id={`${id}-hint`} className={error ? "field-error" : "font-normal text-[#50645c]"}>
                        {error ?? field.hint}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <SubmitButton label={submit} pendingLabel={pendingLabel} />
      </fieldset>
    </form>
  );
}
