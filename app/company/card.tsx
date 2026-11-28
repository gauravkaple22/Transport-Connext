import type { ReactNode } from "react";

export function CompanyCard({
  title, description, wide = false, children,
}: {
  title: string;
  description?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`panel mx-auto p-5 sm:p-7 ${wide ? "max-w-5xl" : "max-w-lg"}`}>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      {description && <p className="mt-3 leading-relaxed text-[#50645c]">{description}</p>}
      {children}
    </section>
  );
}
