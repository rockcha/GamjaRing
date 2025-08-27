// src/components/notification/ui/NotificationItem.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { NotificationRow } from "./types";
import { Separator } from "@/components/ui/separator";

export function NotificationItem({
  n,
  timeText,
}: {
  n: NotificationRow;
  timeText: string;
}) {
  return (
    <li className="flex gap-3 rounded-md px-3 py-2 hover:bg-muted/60 transition border-b">
      <div className="min-w-0 flex-1">
        <div className="text-sm text-foreground whitespace-pre-line break-words">
          {n.description}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{timeText}</span>
        </div>
      </div>
      <div className="pt-0.5">
        <Badge
          variant={n.is_read ? "secondary" : "default"}
          className={n.is_read ? "" : "bg-amber-600 hover:bg-amber-600"}
        >
          {n.type}
        </Badge>
      </div>
    </li>
  );
}
