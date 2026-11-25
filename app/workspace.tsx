import type { ReactNode } from "react";
import Link from "next/link";

const links = {
  driver: [
    ["/driver/dashboard", "Overview"],
    ["/driver/loads", "Browse loads"],
    ["/driver/offers", "My offers"],
    ["/driver/trips", "My trips"],
    ["/driver/profile", "My profile"],
  ],
  company: [
    ["/company/dashboard", "Overview"],
    ["/company/loads/new", "Post a load"],
    ["/company/loads", "My loads"],
    ["/company/trips", "Trips"],
    ["/company/payments", "Payments"],
    ["/company/profile", "Company profile"],
  ],
} as const;

export function Workspace({ role, current, heading, children, accountAction }: {
  role: keyof typeof links;
  current: string;
  heading: string;
  children: ReactNode;
  accountAction: ReactNode;
}) {
  const sidebarTitle = role === "company" ? "Company workspace" : "Driver workspace";
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="panel p-4 lg:sticky lg:top-5">
        <p className="px-3 pt-1 text-sm font-bold">{sidebarTitle}</p>
        <nav aria-label={sidebarTitle} className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
          {links[role].map(([href, label]) => (
            <Link key={href} href={href} aria-current={href === current ? "page" : undefined}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${href === current ? "bg-[#164e43] text-white" : "text-[#36564d] hover:bg-[#edf4ef]"}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-3 border-t border-[#dbe4dc] pt-3">{accountAction}</div>
      </aside>
      <section aria-label={heading} className="grid min-w-0 gap-5">{children}</section>
    </div>
  );
}

export function WorkspaceHeading({ label, title, description, action }: {
  label: string; title: string; description: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 rounded-3xl bg-[#123b33] p-6 text-white sm:p-8">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#f9dc8a]">{label}</p>
        <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#d8e8e1] sm:text-base">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function WorkspaceTile({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="panel block min-w-0 p-5 transition-colors hover:border-[#9dbdad] hover:bg-[#f8fcf9]">
      <span className="flex items-center justify-between gap-3 text-lg font-bold">
        {title}<span aria-hidden="true" className="text-[#164e43]">→</span>
      </span>
      <span className="mt-2 block text-sm leading-relaxed text-[#50645c]">{description}</span>
    </Link>
  );
}

export function ProfileDetails({ details }: { details: ReadonlyArray<readonly [string, string | null | undefined]> }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {details.filter(([, value]) => value).map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-xl bg-[#edf4ef] px-4 py-3">
          <dt className="text-sm font-semibold">{label}</dt>
          <dd className="mt-1 break-words text-sm text-[#50645c]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
