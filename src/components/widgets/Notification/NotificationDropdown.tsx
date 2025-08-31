// src/components/notificationDropdown.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
import supabase from "@/lib/supabase";

export default function NotificationDropdown({
  onUnreadChange,
}: {
  onUnreadChange?: (count: number) => void;
}) {
  const { user } = useUser();
  const uid = user?.id ?? null;
  const isCoupled = !!user?.couple_id;

  const [open, setOpen] = useState(false);
  const { loading, notifications } = useNotifications(uid);
  const { format } = useRelativeTime();

  const visibleItems = useMemo(() => {
    if (!notifications) return [];
    if (!isCoupled) return notifications;
    return notifications.filter(
      (n) => !(n.type === "커플요청" && n.is_request === true)
    );
  }, [notifications, isCoupled]);

  const visibleUnreadCount = useMemo(
    () => visibleItems.filter((n) => !n.is_read).length,
    [visibleItems]
  );

  useEffect(() => {
    onUnreadChange?.(visibleUnreadCount);
  }, [visibleUnreadCount, onUnreadChange]);

  const handleOpenChange = async (v: boolean) => {
    setOpen(v);
    if (v && uid) {
      const ids = visibleItems.filter((n) => !n.is_read).map((n) => n.id);
      if (ids.length > 0) {
        await supabase
          .from("user_notification")
          .update({ is_read: true })
          .in("id", ids);
      }
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <BellButton unread={visibleUnreadCount} />
        </PopoverTrigger>

        {/* 🔽 알림 목록이 버튼 위로 뜨도록 side="top" */}
        <PopoverContent
          side="top"
          align="start"
          className="w-[20rem] p-0 shadow-lg"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="text-sm font-semibold">알림</div>
            {visibleUnreadCount > 0 ? (
              <Badge variant="default">새 알림 {visibleUnreadCount}</Badge>
            ) : (
              <Badge variant="outline">새 알림 없음</Badge>
            )}
          </div>

          {loading ? (
            <div className="h-[20rem] grid place-items-center text-muted-foreground">
              불러오는 중…
            </div>
          ) : (
            <div className="max-h-[20rem] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
              <NotificationList items={visibleItems} formatTime={format} />
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
