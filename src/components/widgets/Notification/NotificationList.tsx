// src/components/notification/ui/NotificationList.tsx
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";

import { NotificationItem } from "./NotificationItem";
import type { NotificationRow } from "./types";
export function NotificationList({
  items,
  formatTime,
  height = 360,
}: {
  items: NotificationRow[];
  formatTime: (iso: string) => string;
  height?: number;
}) {
  if (items.length === 0) {
    return (
      <div className="h-[280px] grid place-items-center text-muted-foreground">
        새 알림이 없어요
      </div>
    );
  }

  return (
    <ScrollArea className={`max-h-[${height}px]`}>
      <ul className="p-2">
        {items.map((n) => (
          <NotificationItem
            key={n.id}
            n={n}
            timeText={formatTime(n.created_at)}
          />
        ))}
      </ul>
    </ScrollArea>
  );
}
