"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type CompanyActivity = {
  event_id: string;
  event_type: "interest" | "accepted" | "declined" | "payment";
  occurred_at: string;
  load_id: string;
  pickup_city: string;
  destination_city: string;
  driver_name: string;
};

const eventLabels = {
  interest: "showed interest",
  accepted: "accepted your offer",
  declined: "declined your offer",
  payment: "had a payment recorded",
};

const time = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export function ActivityFeed({ events, unavailable }: { events: CompanyActivity[]; unavailable: boolean }) {
  const lastSeen = useRef(events[0]?.event_id);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!events.length || lastSeen.current === events[0].event_id) return;
    lastSeen.current = events[0].event_id;
    const event = events[0];
    setNotice(`${event.driver_name} ${eventLabels[event.event_type]}.`);
  }, [events]);

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Recent activity</h2>
        <span className="text-xs font-semibold text-[#50645c]">Updates automatically while open</span>
      </div>
      <div role="status" className={notice ? "mt-3 rounded-xl bg-[#edf4ef] p-3 text-sm" : "sr-only"}>
        {notice}
        {notice && <button type="button" onClick={() => setNotice("")} className="text-link ml-3">Dismiss</button>}
      </div>
      {unavailable ? <p className="mt-4 text-sm text-[#50645c]">Activity is temporarily unavailable.</p>
        : events.length === 0 ? <p className="mt-4 text-sm text-[#50645c]">Driver responses and payment updates will appear here.</p>
        : (
          <ul className="mt-3 divide-y divide-[#dbe4dc]">
            {events.map((event) => (
              <li key={event.event_id}>
                <Link href={event.event_type === "payment" ? "/company/payments?view=recorded" : `/company/loads/${event.load_id}/interest`}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3 hover:underline">
                  <div className="min-w-0 break-words">
                    <p className="text-sm font-semibold">{event.driver_name} {eventLabels[event.event_type]}</p>
                    <p className="mt-1 text-sm text-[#50645c]">{event.pickup_city} to {event.destination_city}</p>
                  </div>
                  <time dateTime={event.occurred_at} className="text-xs text-[#50645c]">{time.format(new Date(event.occurred_at))}</time>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
