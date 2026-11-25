export const truckTypes = [
  { value: "mini", label: "Mini truck or pickup" },
  { value: "open", label: "Open-body truck" },
  { value: "closed", label: "Closed-body truck" },
  { value: "container", label: "Container truck" },
  { value: "trailer", label: "Trailer" },
  { value: "other", label: "Other truck" },
];

export function isLoadId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function indiaToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function isLoadingDate(date: string) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date && date >= indiaToday();
}

export function formatLoadingDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
