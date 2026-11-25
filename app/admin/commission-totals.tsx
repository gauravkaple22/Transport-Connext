import { formatFreight } from "../../lib/load-offers";

const totals = [
  ["total_paise", "Total company commission"],
  ["pending_paise", "Pending commission"],
  ["paid_paise", "Paid commission"],
  ["revenue_paise", "Total commission revenue"],
] as const;

export function CommissionTotals({ data }: { data: unknown }) {
  const summary = data && typeof data === "object" ? data as Record<string, unknown> : {};

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {totals.map(([key, title]) => (
        <div key={key} className="panel min-w-0 p-4">
          <dt className="text-sm font-semibold">{title}</dt>
          <dd className="mt-2 break-words text-xl font-extrabold">
            {typeof summary[key] === "number" ? formatFreight(summary[key]) : "Unavailable"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
