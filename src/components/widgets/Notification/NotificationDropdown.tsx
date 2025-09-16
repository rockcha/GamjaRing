// src/components/notificationDropdown.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useNotifications } from "./useNotifications";
import { useRelativeTime } from "./useRelativeTime";
import { NotificationList } from "./NotificationList";
import supabase from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function NotificationDropdown({
  onUnreadChange,
  className,
  caption = "알림",
}: {
  onUnreadChange?: (count: number) => void;
  className?: string;
  caption?: string;
}) {
  const { user } = useUser();
  const uid = user?.id ?? null;
  const isCoupled = !!user?.couple_id;

  const [open, setOpen] = useState(false);
  const { loading, notifications } = useNotifications(uid);
  const { format } = useRelativeTime();

  // 커플 연결 시 '커플요청(요청)' 숨김
  const visibleItems = useMemo(() => {
    if (!notifications) return [];
    if (!isCoupled) return notifications;
    return notifications.filter(
      (n) => !(n.type === "커플요청" && n.is_request === true)
    );
  }, [notifications, isCoupled]);

  const visibleUnread = useMemo(
    () => visibleItems.filter((n) => !n.is_read),
    [visibleItems]
  );
  const visibleUnreadCount = visibleUnread.length;

  useEffect(() => {
    onUnreadChange?.(visibleUnreadCount);
  }, [visibleUnreadCount, onUnreadChange]);

  // 낙관적 배지 제어
  const [pendingReadIds, setPendingReadIds] = useState<string[]>([]);
  useEffect(() => {
    if (!pendingReadIds.length) return;
    const currentUnreadIds = new Set(visibleUnread.map((n) => n.id));
    setPendingReadIds((prev) => prev.filter((id) => currentUnreadIds.has(id)));
  }, [visibleUnread, pendingReadIds.length]);

  const computedUnreadCount = Math.max(
    0,
    visibleUnreadCount - pendingReadIds.length
  );
  const hasUnreadBadge = computedUnreadCount > 0;

  // 열릴 때 읽음 처리(낙관적)
  const handleOpenChange = async (v: boolean) => {
    setOpen(v);
    if (v && uid) {
      const ids = visibleUnread.map((n) => n.id);
      if (ids.length > 0) {
        setPendingReadIds(ids);
        const { error } = await supabase
          .from("user_notification")
          .update({ is_read: true })
          .in("id", ids);
        if (error) setPendingReadIds([]);
      }
    }
  };

  // 아이콘 자원
  const iconSrc = "/notification/bell.png";
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <>
      {/* PNG + 아래 텍스트 버튼 (DailyFortuneCard 톤) */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => handleOpenChange(true)}
        aria-label="알림 열기"
        className={cn(
          "p-0 h-auto inline-flex flex-col items-center gap-1",
          "group rounded-md transition-all duration-200 ease-out",
          "hover:-translate-y-0.5 hover:bg-neutral-50/60",
          "active:translate-y-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300/60 focus-visible:ring-offset-2",
          className
        )}
      >
        {/* 아이콘 래퍼: 배지/파동용 relative */}
        {/* 아이콘 래퍼: 배지/파동용 relative */}
        <span className="relative inline-grid place-items-center h-10 w-10">
          {/* 🌊 퍼지는 파동 (새 알림 있을 때만) */}
          {hasUnreadBadge && (
            <>
              {/* 확산되는 반투명 원 */}
              <span
                className="
          pointer-events-none absolute inset-0 rounded-full
          bg-rose-400/25 blur-[0.5px] transform-gpu
          motion-safe:animate-[notifWave_1.6s_ease-out_infinite]
          motion-reduce:animate-none
        "
                aria-hidden
              />
              {/* 얇은 고정 링 (중앙을 또렷하게) */}
              <span
                className="
          pointer-events-none absolute inset-0 rounded-full
          ring-2 ring-rose-300/60
        "
                aria-hidden
              />
            </>
          )}

          <img
            src={iconSrc}
            alt="알림"
            className="
      h-6 w-6 object-contain
      transition-transform duration-200
      group-hover:scale-110 group-active:scale-95
    "
            draggable={false}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
          />
          {!imgLoaded && (
            <Skeleton className="h-8 w-8 rounded-md absolute inset-0" />
          )}

          {/* 우상단 빨간 점 배지 */}
          {hasUnreadBadge && (
            <>
              <span
                className="
          pointer-events-none
          absolute -top-0.5 -right-0.5
          h-2.5 w-2.5 rounded-full
          bg-rose-500/60 animate-ping
        "
              />
              <span
                className="
          pointer-events-none
          absolute -top-0.5 -right-0.5
          h-2.5 w-2.5 rounded-full
          bg-rose-500
          shadow-[0_0_0_1px_rgba(255,255,255,0.9)]
        "
              />
            </>
          )}
        </span>
      </Button>

      {/* Dialog로 알림 표시 */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="flex flex-col min-h-[340px] sm:min-h-[380px] max-h-[70vh]">
            <DialogHeader className="px-4 py-4 shrink-0 border-b">
              <DialogTitle>알림</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1 pb-4">
              {loading ? (
                <div className="px-3 pt-1">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ) : visibleItems.length === 0 ? (
                <div className="px-4 pt-1 text-sm text-muted-foreground">
                  새로운 알림이 없어요.
                </div>
              ) : (
                <div className="pr-1">
                  <NotificationList items={visibleItems} formatTime={format} />
                </div>
              )}
            </div>

            <DialogFooter className="px-4 pb-4 shrink-0">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                닫기
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
<style>{`
@keyframes notifWave {
  0%   { transform: scale(1);   opacity: .65; }
  70%  { transform: scale(2.15); opacity: 0;  }
  100% { transform: scale(2.15); opacity: 0;  }
}
`}</style>;
