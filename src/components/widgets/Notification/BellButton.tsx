// src/components/notification/ui/BellButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

export function BellButton({
  unread,
  ...rest
}: { unread: number } & React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="default"
      className="relative hover:cursor-pointer"
      aria-label="알림"
      {...rest}
    >
      <Bell className="h-8 w-8" />
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] min-w-[16px] h-[16px] px-[4px] leading-none">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Button>
  );
}
