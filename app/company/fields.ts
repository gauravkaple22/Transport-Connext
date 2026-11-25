export const emailField = { name: "email", label: "Work email", type: "email", autoComplete: "username", maxLength: 254 } as const;

export const passwordField = { name: "password", label: "Password", type: "password", autoComplete: "current-password" } as const;

export const newPasswordFields = [
  { ...passwordField, autoComplete: "new-password", hint: "Use at least 8 characters." },
  { name: "confirm_password", label: "Confirm password", type: "password", autoComplete: "new-password" },
] as const;

export const companyBusinessFields = [
  { name: "company_name", label: "Company name", autoComplete: "organization", maxLength: 120 },
  { name: "gstin", label: "GSTIN", maxLength: 15, hint: "Enter your 15-character GSTIN." },
  { name: "business_address", label: "Company address", autoComplete: "street-address", maxLength: 250, wide: true,
    hint: "Include the building, street, area, and PIN code." },
  { name: "city", label: "Company city", autoComplete: "address-level2", maxLength: 80 },
  { name: "state", label: "State or union territory", autoComplete: "address-level1", maxLength: 80 },
] as const;

export const companyContactFields = [
  { name: "contact_name", label: "Contact person's full name", autoComplete: "name", maxLength: 100 },
  { name: "contact_mobile", label: "Primary contact number", type: "tel", autoComplete: "tel",
    inputMode: "tel", maxLength: 20, hint: "Use a 10-digit Indian mobile number. +91 is optional." },
  { name: "secondary_contact_mobile", label: "Second contact number", type: "tel",
    inputMode: "tel", maxLength: 20, optional: true },
] as const;
