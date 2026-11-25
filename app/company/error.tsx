"use client";

import Link from "next/link";
import { CompanyCard } from "./card";

export default function CompanyError({ reset }: { reset: () => void }) {
  return (
    <CompanyCard title="We couldn't load this page" description="Try again in a moment.">
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button className="button" onClick={reset}>Try again</button>
        <Link href="/company/login" className="text-link">Company login</Link>
      </div>
    </CompanyCard>
  );
}
