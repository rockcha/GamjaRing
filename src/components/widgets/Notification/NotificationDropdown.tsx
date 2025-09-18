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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
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
        if (error) setPendingReadIds([]); // 실패 시 롤백
      }
    }
  };

  // 아이콘 자원
  const iconSrc = "/notification/bell.png";
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <>
      {/* 알림 버튼 */}
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
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
              <span className="relative inline-grid place-items-center h-10 w-10">
                {/* 🌊 퍼지는 파동 (새 알림 있을 때만) */}
                {hasUnreadBadge && (
                  <>
                    <span
                      className="
                        pointer-events-none absolute inset-0 rounded-full
                        bg-rose-400/25 blur-[0.5px] transform-gpu
                        motion-safe:animate-[notifWave_1.6s_ease-out_infinite]
                        motion-reduce:animate-none
                      "
                      aria-hidden
                    />
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

                {/* 우상단 배지(점 + 숫자 배지) */}
                {hasUnreadBadge && (
                  <>
                    {/* 작은 점 + ping */}
                    <span
                      className="
                        pointer-events-none absolute -top-0.5 -right-0.5
                        h-2.5 w-2.5 rounded-full
                        bg-rose-500/60 animate-ping
                      "
                    />
                    <span
                      className="
                        pointer-events-none absolute -top-0.5 -right-0.5
                        h-2.5 w-2.5 rounded-full bg-rose-500
                        shadow-[0_0_0_1px_rgba(255,255,255,0.9)]
                      "
                    />
                    {/* 숫자 배지 (가독용) */}
                    <Badge
                      variant="destructive"
                      className="pointer-events-none absolute -bottom-1 -right-1 px-1 py-0 h-4 min-w-[1.2rem] text-[10px] leading-4 rounded-full"
                    >
                      {computedUnreadCount > 99 ? "99+" : computedUnreadCount}
                    </Badge>
                  </>
                )}
              </span>

              {/* 캡션 */}
              <span className="text-[11px] text-neutral-600">{caption}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {hasUnreadBadge
              ? `새 알림 ${computedUnreadCount}개`
              : "새 알림 없음"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Dialog로 알림 표시 */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="flex flex-col min-h-[360px] max-h-[70vh]">
            <DialogHeader className="px-4 pt-4 pb-3 shrink-0">
              <DialogTitle className="flex items-center gap-2">
                알림
                {hasUnreadBadge && (
                  <Badge variant="secondary" className="text-[10px]">
                    {computedUnreadCount > 99 ? "99+" : computedUnreadCount}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <Separator />

            <div className="flex-1">
              {loading ? (
                <div className="px-4 py-3">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ) : visibleItems.length === 0 ? (
                <div className="px-4 py-4 text-sm text-muted-foreground">
                  새로운 알림이 없어요.
                </div>
              ) : (
                <ScrollArea className="h-[50vh] px-1 py-2">
                  <div className="pr-2">
                    <NotificationList
                      items={visibleItems}
                      formatTime={format}
                    />
                  </div>
                </ScrollArea>
              )}
            </div>

            <Separator />

            <DialogFooter className="px-4 py-3 shrink-0">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                닫기
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* 파동 애니메이션 키프레임(컴포넌트 범위) */}
      <style jsx>{`
        @keyframes notifWave {
          0% {
            transform: scale(1);
            opacity: 0.65;
          }
          70% {
            transform: scale(2.15);
            opacity: 0;
          }
          100% {
            transform: scale(2.15);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
