import type { ReactNode } from "react";

export type DriverSearchParams = Promise<{ notice?: string }>;

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel mx-auto max-w-lg p-5 sm:p-7">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      {children}
    </section>
  );
}
