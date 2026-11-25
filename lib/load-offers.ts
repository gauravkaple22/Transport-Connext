export type OfferStatus = "offered" | "accepted" | "declined" | "payment_recorded";

const labels: Record<OfferStatus, string> = {
  offered: "Awaiting driver response",
  accepted: "Accepted",
  declined: "Declined",
  payment_recorded: "Payment recorded by company",
};

export function offerStatusLabel(status: OfferStatus) {
  return labels[status];
}

export function parsePaymentAmount(amount: string): number | null {
  const match = /^(\d{1,8})(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) return null;

  const paise = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return paise >= 100 && paise <= 1000000000 ? paise : null;
}

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export function formatExpectedPayment(min: number | null | undefined, max: number | null | undefined) {
  if (min == null || max == null) return "Not provided";
  return min === max ? formatFreight(min) : `${formatFreight(min)} to ${formatFreight(max)}`;
}

export function formatFreight(amountPaise: number) {
  return currency.format(amountPaise / 100);
}
