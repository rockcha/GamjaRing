// src/components/notification/ui/BellButton.tsx
"use client";

import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export function BellButton({
  unread,
  className,
  ...rest
}: { unread: number } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label="알림"
      className={cn(
        "relative flex items-center justify-center",
        "h-12 w-12 rounded-full text-white shadow-md transition-colors",
        "bg-amber-700 hover:bg-amber-600",
        className
      )}
      {...rest}
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] min-w-[16px] h-[16px] px-[4px] leading-none">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
