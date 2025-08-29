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
import supabase from "@/lib/supabase"; // 👈 보이는 알림만 읽음 처리용

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

  // 1) 커플이면 '커플요청 & is_request=true' 숨김
  const visibleItems = useMemo(() => {
    if (!notifications) return [];
    if (!isCoupled) return notifications;
    return notifications.filter(
      (n) => !(n.type === "커플요청" && n.is_request === true)
    );
  }, [notifications, isCoupled]);

  // 2) 배지 숫자 = 보이는 미읽음만
  const visibleUnreadCount = useMemo(
    () => visibleItems.filter((n) => !n.is_read).length,
    [visibleItems]
  );

  useEffect(() => {
    onUnreadChange?.(visibleUnreadCount);
  }, [visibleUnreadCount, onUnreadChange]);

  // 3) 팝오버 열 때 보이는 미읽음만 읽음 처리
  const handleOpenChange = async (v: boolean) => {
    setOpen(v);
    if (v && uid) {
      const ids = visibleItems.filter((n) => !n.is_read).map((n) => n.id);
      if (ids.length > 0) {
        await supabase
          .from("user_notification")
          .update({ is_read: true })
          .in("id", ids);
        // UI는 즉시 깜빡이지 않도록, 훅/리스트에서 즉시 재요청하지 않게 하거나
        // 리스트에서 로컬로 읽음 표시를 나중에 반영(닫힐 때)하도록 했던 기존 전략 유지 권장
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <BellButton unread={visibleUnreadCount} />
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        className="w-[24rem] p-0 shadow-lg"
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
          <div className="h-[24rem] grid place-items-center text-muted-foreground">
            불러오는 중…
          </div>
        ) : (
          <div className="max-h-[24rem] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
            <NotificationList items={visibleItems} formatTime={format} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
