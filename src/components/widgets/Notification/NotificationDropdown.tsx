// src/components/notificationDropdown.tsx
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useNotifications } from "./useNotifications";
import { useRelativeTime } from "./useRelativeTime";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { BellButton } from "./BellButton";
import { NotificationList } from "./NotificationList";

export default function NotificationDropdown({
  onUnreadChange,
}: {
  onUnreadChange?: (count: number) => void;
}) {
  const { user } = useUser();
  const uid = user?.id ?? null;

  const [open, setOpen] = useState(false);
  const { loading, notifications, unreadCount, markAllRead } =
    useNotifications(uid);
  const { format } = useRelativeTime();

  useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

  const handleOpenChange = async (v: boolean) => {
    setOpen(v);
    if (v) await markAllRead();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <BellButton unread={unreadCount} />
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        className="w-[24rem] p-0 shadow-lg"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-sm font-semibold">알림</div>
          {unreadCount > 0 ? (
            <Badge
              variant="default"
              className="bg-amber-600 hover:bg-amber-600"
            >
              새 알림 {unreadCount}
            </Badge>
          ) : (
            <Badge variant="outline">새 알림 없음</Badge>
          )}
        </div>

        {/* 본문 (리스트만 스크롤) */}
        {loading ? (
          <div className="h-[24rem] grid place-items-center text-muted-foreground">
            불러오는 중…
          </div>
        ) : (
          <div
            className="
              max-h-[24rem]        /* 약 5~7개 높이 */
              overflow-y-auto
              scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent
            "
          >
            <NotificationList items={notifications} formatTime={format} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
