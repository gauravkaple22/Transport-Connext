export function formValue(form: FormData, name: string) {
  const entry = form.get(name);
  return typeof entry === "string" ? entry : "";
}

export function companyEmailInput(form: FormData) {
  return formValue(form, "email").trim().toLowerCase();
}

export function validCompanyEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function indianMobile(value: string) {
  const mobileInput = value.replace(/[\s()-]/g, "");
  const mobile = mobileInput.startsWith("+91") ? mobileInput.slice(3) : mobileInput;
  return /^[6-9][0-9]{9}$/.test(mobile) ? `+91${mobile}` : "";
}

export function readCompanyProfile(form: FormData, existing?: { gstin: string | null; business_address: string | null }) {
  const secondaryInput = formValue(form, "secondary_contact_mobile").trim();
  const gstin = formValue(form, "gstin").trim().toUpperCase();
  const profile = {
    company_name: formValue(form, "company_name").trim(),
    contact_name: formValue(form, "contact_name").trim(),
    contact_mobile: indianMobile(formValue(form, "contact_mobile")),
    secondary_contact_mobile: indianMobile(secondaryInput) || null,
    business_address: formValue(form, "business_address").trim() || null,
    city: formValue(form, "city").trim(),
    state: formValue(form, "state").trim(),
    gstin: gstin || null,
  };
  const fields: Record<string, string> = {};
  if (profile.company_name.length < 2 || profile.company_name.length > 120) fields.company_name = "Enter your company name.";
  if (profile.contact_name.length < 2 || profile.contact_name.length > 100) fields.contact_name = "Enter the contact person's full name.";
  if (!profile.contact_mobile) fields.contact_mobile = "Enter a valid Indian mobile number.";
  if (secondaryInput && !profile.secondary_contact_mobile) fields.secondary_contact_mobile = "Enter a valid Indian mobile number.";
  if (profile.secondary_contact_mobile === profile.contact_mobile) fields.secondary_contact_mobile = "Use a different number from the primary contact.";
  if ((!existing || existing.business_address || profile.business_address) &&
      ((profile.business_address?.length ?? 0) < 5 || (profile.business_address?.length ?? 0) > 250)) {
    fields.business_address = "Enter your company address (5 to 250 characters).";
  }
  if (profile.city.length < 2 || profile.city.length > 80) fields.city = "Enter your company city.";
  if (profile.state.length < 2 || profile.state.length > 80) fields.state = "Enter your company state or union territory.";
  if ((!existing || existing.gstin || gstin) && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) {
    fields.gstin = "Enter a valid 15-character GSTIN.";
  }
  return { profile, fields };
}
