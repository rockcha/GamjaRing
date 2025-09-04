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

  // 필터링: 커플 연결된 상태에선 '커플요청 요청' 숨김
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

  // ✅ 낙관적 배지 제어: 지금 읽음 처리 중인(곧 사라질) 알림 ID들
  const [pendingReadIds, setPendingReadIds] = useState<string[]>([]);

  // 훅 데이터가 갱신되면, 아직 안 사라진 ID만 남기기(교집합 갱신)
  useEffect(() => {
    if (!pendingReadIds.length) return;
    const currentUnreadIds = new Set(visibleUnread.map((n) => n.id));
    setPendingReadIds((prev) => prev.filter((id) => currentUnreadIds.has(id)));
  }, [visibleUnread, pendingReadIds.length]);

  // 최종 배지 계산: 서버 업데이트 전이더라도 UI는 즉시 줄여 보임
  const computedUnreadCount = Math.max(
    0,
    visibleUnreadCount - pendingReadIds.length
  );
  const hasUnreadBadge = computedUnreadCount > 0;

  // 열릴 때 읽음 처리 (낙관적 업데이트 포함)
  const handleOpenChange = async (v: boolean) => {
    setOpen(v);
    if (v && uid) {
      const ids = visibleUnread.map((n) => n.id);
      if (ids.length > 0) {
        // 1) 배지 즉시 숨김(낙관적)
        setPendingReadIds(ids);

        // 2) 서버 업데이트
        const { error } = await supabase
          .from("user_notification")
          .update({ is_read: true })
          .in("id", ids);

        // 3) 실패 시 롤백(배지 다시 보이도록)
        if (error) {
          setPendingReadIds([]);
        }
      }
    }
  };

  // 항상 기본 PNG 사용
  const iconSrc = "/notification/bell.png";
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <>
      {/* PNG + 아래 텍스트 */}
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
        {/* 아이콘 래퍼: 배지 위치를 위한 relative */}
        <span className="relative inline-block">
          <img
            src={iconSrc}
            alt="알림"
            className="
              h-8 w-8 object-contain
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

          {/* 빨간 배지 */}
          {hasUnreadBadge && (
            <>
              <span
                className="
                  pointer-events-none
                  absolute -top-0.5 -right-0.5
                  h-2.5 w-2.5 rounded-full
                  bg-rose-500/60
                  animate-ping
                "
              />
              <span
                className="
                  pointer-events-none
                  absolute -top-0.5 -right-0.5
                  h-2.5 w-2.5 rounded-full
                  bg-rose-500 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]
                "
              />
            </>
          )}
        </span>

        <span className="text-xs font-medium text-neutral-700 transition-colors group-hover:text-neutral-800">
          {caption}
        </span>
      </Button>

      {/* Dialog로 알림 표시 (고정 높이 + 내부 스크롤) */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="flex flex-col min-h-[340px] sm:min-h-[380px] max-h-[70vh]">
            <DialogHeader className="px-4 pt-4 shrink-0">
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
