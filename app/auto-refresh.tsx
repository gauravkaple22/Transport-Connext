"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervalMs = 20000 }: { intervalMs?: number } = {}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const refresh = () => {
      if (!pending && document.visibilityState === "visible" && navigator.onLine) {
        startTransition(() => router.refresh());
      }
    };

    const tick = window.setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [intervalMs, pending, router, startTransition]);

  return null;
}
