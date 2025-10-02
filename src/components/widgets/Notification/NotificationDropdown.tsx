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
  /** ✅ 추가: 아이콘 크기(px). 기본 48 */
  iconSize = 48,
}: {
  onUnreadChange?: (count: number) => void;
  className?: string;
  caption?: string;
  iconSize?: number;
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

  // ✅ 아이콘 자원: /bell.png 로 사용 (+@2x, @3x 있으면 더 선명)
  const iconSrc = "/bell.png";
  const [imgLoaded, setImgLoaded] = useState(false);

  // ✅ 파생 크기 계산 (배지 오프셋/로딩/헤더 아이콘에 공통 적용)
  const wrapperSize = iconSize; // 버튼 안 원형 래퍼
  const imageSize = Math.round(iconSize * 0.9); // 래퍼보다 살짝 작게
  const dotSize = Math.max(10, Math.round(iconSize * 0.2));
  const badgeOffset = Math.max(4, Math.round(iconSize * 0.1));
  const badgeBottomOffset = Math.max(6, Math.round(iconSize * 0.12));
  const headerIconSize = Math.round(iconSize * 0.42);

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
              {/* 아이콘 래퍼: 배지/파동/글로우용 relative */}
              <span
                className="relative inline-grid place-items-center"
                style={{ width: wrapperSize, height: wrapperSize }}
              >
                {/* 🌊 퍼지는 파동 (새 알림 있을 때만) + 부드러운 글로우 */}
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
                      className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-rose-300/60"
                      aria-hidden
                    />
                    {/* 소프트 글로우 */}
                    <span className="pointer-events-none absolute inset-0 rounded-full bg-rose-300/20 blur-md" />
                  </>
                )}

                {/* PNG 아이콘 */}
                <img
                  src={iconSrc}
                  srcSet="/bell.png 1x, /bell@2x.png 2x, /bell@3x.png 3x"
                  alt="알림"
                  className={cn(
                    "object-contain transition-transform duration-200",
                    "group-hover:scale-110 group-active:scale-95",
                    hasUnreadBadge ? "animate-soft-bounce" : ""
                  )}
                  style={{ width: imageSize, height: imageSize }}
                  draggable={false}
                  loading="lazy"
                  onLoad={() => setImgLoaded(true)}
                />
                {!imgLoaded && (
                  <Skeleton
                    className="rounded-md absolute inset-0"
                    style={{ width: wrapperSize, height: wrapperSize }}
                  />
                )}

                {/* 우상단 배지(점 + 숫자 배지) */}
                {hasUnreadBadge && (
                  <>
                    {/* 작은 점 + ping */}
                    <span
                      className="pointer-events-none absolute rounded-full bg-rose-500/60 animate-ping"
                      style={{
                        top: -badgeOffset,
                        right: -badgeOffset,
                        width: dotSize,
                        height: dotSize,
                      }}
                    />
                    <span
                      className="pointer-events-none absolute rounded-full bg-rose-500 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
                      style={{
                        top: -badgeOffset,
                        right: -badgeOffset,
                        width: dotSize,
                        height: dotSize,
                      }}
                    />
                    {/* 숫자 배지 (가독용) */}
                    <Badge
                      variant="destructive"
                      className="pointer-events-none absolute px-1 py-0 h-4 min-w-[1.2rem] text-[10px] leading-4 rounded-full"
                      style={{
                        right: -badgeOffset,
                        bottom: -badgeBottomOffset,
                      }}
                    >
                      {computedUnreadCount > 99 ? "99+" : computedUnreadCount}
                    </Badge>
                  </>
                )}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {hasUnreadBadge
              ? `새 알림 ${computedUnreadCount}개`
              : "새 알림 없음"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Dialog로 알림 표시 — 몽글몽글 감성 강화 */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            "sm:max-w-md p-0 overflow-hidden border-0",
            // 부드러운 유리모피(Glassmorphism)
            "rounded-3xl ",
            "backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)]",
            // 은은한 내부 그림자 & 테두리
            "ring-1 ring-black/5"
          )}
        >
          {/* 몽글 배경 버블 */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-12 -left-10 w-40 h-40 rounded-full bg-pink-200/30 blur-2xl animate-float-slow" />
            <div className="absolute -bottom-12 -right-8 w-44 h-44 rounded-full bg-amber-200/40 blur-2xl animate-float-slower" />
          </div>

          <div className="relative flex flex-col min-h-[360px] max-h-[70vh]">
            <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
              <DialogTitle
                className={cn(
                  "flex items-center gap-2 text-lg",
                  "font-semibold tracking-tight"
                )}
              >
                <span className="relative inline-flex items-center justify-center">
                  <img
                    src={iconSrc}
                    alt="bell"
                    className="object-contain"
                    style={{ width: headerIconSize, height: headerIconSize }}
                    draggable={false}
                  />
                  {/* 타이틀 옆 미세 글로우 */}
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-amber-200/40 blur-sm" />
                </span>
                알림
                {hasUnreadBadge && (
                  <Badge variant="secondary" className="text-[10px]">
                    {computedUnreadCount > 99 ? "99+" : computedUnreadCount}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <Separator className="opacity-60" />

            <div className="flex-1">
              {loading ? (
                <div className="px-5 py-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ) : visibleItems.length === 0 ? (
                <div className="px-5 py-8 text-sm text-muted-foreground text-center">
                  새로운 알림이 없어요. 🫧
                </div>
              ) : (
                <ScrollArea className="h-[50vh] px-1 py-2">
                  <div className="pr-3">
                    <NotificationList
                      items={visibleItems}
                      formatTime={format}
                    />
                  </div>
                </ScrollArea>
              )}
            </div>

            <Separator className="opacity-60" />

            <DialogFooter className="px-5 py-4 shrink-0">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className={cn(
                  "rounded-full px-5",
                  "shadow-sm hover:shadow",
                  "transition-all"
                )}
              >
                닫기
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* 파동/몽글 애니메이션 키프레임 */}
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
        @keyframes softBounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-1.5px);
          }
        }
        @keyframes floatSlow {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-8px) translateX(4px);
          }
        }
        @keyframes floatSlower {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(6px) translateX(-6px);
          }
        }
      `}</style>
      <style jsx global>{`
        .animate-soft-bounce {
          animation: softBounce 1.8s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: floatSlow 7s ease-in-out infinite;
        }
        .animate-float-slower {
          animation: floatSlower 10s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
