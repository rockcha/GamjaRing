// src/components/notification/hooks/useRelativeTime.ts
"use client";

import { useMemo } from "react";

export function useRelativeTime() {
  const rtf = useMemo(
    () => new Intl.RelativeTimeFormat("ko", { numeric: "auto" }),
    []
  );

  const format = (iso: string) => {
    const now = Date.now();
    const t = new Date(iso).getTime();
    const diffSec = Math.round((t - now) / 1000);
    if (Math.abs(diffSec) < 60)
      return rtf.format(Math.round(diffSec), "second");
    const diffMin = Math.round(diffSec / 60);
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
    const diffHr = Math.round(diffMin / 60);
    if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
    const diffDay = Math.round(diffHr / 24);
    return rtf.format(diffDay, "day");
  };

  return { format };
}
