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
import { cn } from "@/lib/utils";

export default function NotificationDropdown({
  onUnreadChange,
  className,
  caption = "알림",
  /** 트리거 아이콘 크기(px). 기본 48 */
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

  // 아이콘 리소스
  const iconSrc = "/bell.png";
  const [imgLoaded, setImgLoaded] = useState(false);

  // 파생 크기
  const wrapperSize = Math.max(40, iconSize); // 원형 내부 이미지 크기 기준
  const imageSize = Math.round(wrapperSize * 0.9);
  const dotSize = Math.max(10, Math.round(wrapperSize * 0.22));
  const badgeOffset = Math.max(4, Math.round(wrapperSize * 0.12));

  return (
    <>
      {/* ✅ 고정/포털 제거: 배치한 위치에 그대로 렌더되는 트리거 버튼 */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => handleOpenChange(true)}
        aria-label={caption}
        className={cn(
          "p-0 ",

          "grid place-items-center",
          className
        )}
        style={{
          width: wrapperSize + 20,
          height: wrapperSize + 20,
        }}
      >
        <span className="relative inline-grid place-items-center">
          {/* 아이콘 */}
          <img
            src={iconSrc}
            alt={caption}
            className={cn(
              "object-contain transition-transform duration-200",
              "hover:scale-110 active:scale-95"
            )}
            style={{ width: imageSize, height: imageSize }}
            draggable={false}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
          />
          {!imgLoaded && (
            <Skeleton
              className="rounded-full absolute"
              style={{ width: imageSize, height: imageSize }}
            />
          )}

          {/* 배지 (우상단) */}
          {hasUnreadBadge && (
            <>
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
              <Badge
                variant="destructive"
                className="pointer-events-none absolute px-1 py-0 h-4 min-w-[1.2rem] text-[10px] leading-4 rounded-full"
                style={{
                  right: -badgeOffset,
                  bottom: -Math.max(6, Math.round(wrapperSize * 0.14)),
                }}
              >
                {computedUnreadCount > 99 ? "99+" : computedUnreadCount}
              </Badge>
            </>
          )}
        </span>
      </Button>

      {/* ✅ 표준 중앙 모달 + 내부 스크롤 고정 (닫기 버튼 항상 보임) */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            // 레이아웃: 중앙 모달, 고정 해제
            "p-0 border-0 overflow-hidden rounded-3xl",
            "shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)]",
            "sm:max-w-md w-[min(92vw,560px)]",
            // 전체 높이 한정 (뷰포트 기준) — 내부에서만 스크롤
            "max-h-[85svh]"
          )}
        >
          {/* 내부를 flex column으로 구성 → 중간 ScrollArea가 스크롤 담당 */}
          <div className="relative flex flex-col h-[min(85svh,640px)]">
            <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                {caption}
                {hasUnreadBadge && (
                  <Badge variant="secondary" className="text-[10px]">
                    {computedUnreadCount > 99 ? "99+" : computedUnreadCount}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <Separator className="opacity-60" />

            {/* ✅ 스크롤 가능한 영역: flex-1 + min-h-0 필수 */}
            <div className="flex-1 min-h-0">
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
                <ScrollArea className="h-full px-1 py-2">
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

            {/* ✅ Footer는 고정 영역 → 항상 보임 */}
            <DialogFooter className="px-5 py-4 shrink-0">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="rounded-lg px-5 shadow-sm hover:shadow transition-all"
              >
                닫기
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
