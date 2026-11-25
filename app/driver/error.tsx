"use client";

import Link from "next/link";
import { Card } from "./form";

export default function DriverError({ reset }: { reset: () => void }) {
  return (
    <Card title="We couldn't load this page">
      <p className="mt-3 text-[#50645c]">Try again in a moment.</p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button className="button" onClick={reset}>Try again</button>
        <Link href="/driver/login" className="text-link">Driver login</Link>
      </div>
    </Card>
  );
}
