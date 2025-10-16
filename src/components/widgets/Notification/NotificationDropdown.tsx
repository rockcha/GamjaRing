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

/* Tooltip — PartnerActionButton과 동일 패턴 */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function NotificationDropdown({
  onUnreadChange,
  className,
  caption = "알림",
  /** PartnerActionButton과 동일한 크기 시스템 */
  size = "icon",
  /** 트리거 이모지 (기본 🔔) */
  emoji = "🔔",
  /** 트리거 이모지 실제 폰트 크기(px) — icon일 때 */
  emojiSizePx = 22,
}: {
  onUnreadChange?: (count: number) => void;
  className?: string;
  caption?: string;
  size?: "icon" | "sm" | "default" | "lg";
  emoji?: string;
  emojiSizePx?: number;
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

  return (
    <>
      {/* ✅ 트리거 버튼: PartnerActionButton과 동일 + Tooltip "알림" */}
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-flex", className)}>
              <Button
                type="button"
                variant="ghost"
                size={size}
                onClick={() => handleOpenChange(true)}
                aria-label={caption}
                className={cn(
                  "relative h-10 w-10 transition-all",
                  "grid place-items-center",
                  "before:pointer-events-none before:absolute before:inset-0",
                  "before:opacity-0 hover:before:opacity-100 before:transition-opacity",
                  "before:bg-[radial-gradient(120px_80px_at_50%_-20%,rgba(255,182,193,0.35),transparent_60%)]",
                  { "w-auto px-3": size !== "icon" }
                )}
              >
                {/* 🔔 이모지 — icon일 때 22px, 나머지 18px */}
                <span
                  style={{ fontSize: size === "icon" ? emojiSizePx : 18 }}
                  className={
                    size !== "icon"
                      ? "font-medium leading-none"
                      : "leading-none"
                  }
                >
                  {emoji}
                </span>

                {/* 읽지 않음 점 + 숫자 뱃지 (40x40 기준 위치, non-icon도 자연스럽게 배치) */}
                {hasUnreadBadge && (
                  <>
                    <span
                      className="pointer-events-none absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500/60 animate-ping"
                      aria-hidden
                    />
                    <span
                      className="pointer-events-none absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
                      aria-hidden
                    />
                    <Badge
                      variant="destructive"
                      className="pointer-events-none absolute px-1 py-0 h-4 min-w-[1.2rem] text-[10px] leading-4 rounded-full -right-1.5 -bottom-1.5"
                    >
                      {computedUnreadCount > 99 ? "99+" : computedUnreadCount}
                    </Badge>
                  </>
                )}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            알림
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* ✅ 표준 중앙 모달 + 내부 스크롤 고정 (닫기 버튼 항상 보임) */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            "p-0 border-0 overflow-hidden rounded-3xl",
            "shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)]",
            "sm:max-w-md w-[min(92vw,560px)]",
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
