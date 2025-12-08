// src/components/notificationDropdown.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useNotifications } from "./useNotifications";
import { useRelativeTime } from "./useRelativeTime";
import { NotificationList } from "./NotificationList";

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

/* Tooltip */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NotificationDropdownProps = {
  onUnreadChange?: (count: number) => void;
  className?: string;
  caption?: string;
  size?: "icon" | "sm" | "default" | "lg";
  emoji?: string;
  emojiSizePx?: number;
};

export default function NotificationDropdown({
  onUnreadChange,
  className,
  caption = "알림",
  size = "icon",
  emoji = "🔔",
  emojiSizePx = 22,
}: NotificationDropdownProps) {
  const { user } = useUser();
  const uid = user?.id ?? null;
  const isCoupled = !!user?.couple_id;

  const [open, setOpen] = useState(false);

  // realtime + read + count 관리 훅
  const { loading, notifications, unreadCount, markAllRead } =
    useNotifications(uid);

  const { format } = useRelativeTime();

  // 커플 요청 숨김 필터링
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

  // 상위에 unreadCount 전달
  useEffect(() => {
    onUnreadChange?.(visibleUnreadCount);
  }, [visibleUnreadCount, onUnreadChange]);

  // 모달 열릴 때 모두 읽음 처리
  const handleOpenChange = async (v: boolean) => {
    setOpen(v);
    if (v) {
      await markAllRead();
    }
  };

  const hasUnreadBadge = visibleUnreadCount > 0;

  return (
    <>
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
                  "relative h-10 w-10 transition-all grid place-items-center",
                  "before:bg-[radial-gradient(120px_80px_at_50%_-20%,rgba(255,182,193,0.35),transparent_60%)]",
                  "before:pointer-events-none before:absolute before:inset-0",
                  "before:opacity-0 hover:before:opacity-100 before:transition-opacity",
                  { "w-auto px-3": size !== "icon" }
                )}
              >
                <span
                  style={{ fontSize: size === "icon" ? emojiSizePx : 18 }}
                  className={size !== "icon" ? "font-medium leading-none" : ""}
                >
                  {emoji}
                </span>

                {/* 배지 */}
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
                      {visibleUnreadCount > 99 ? "99+" : visibleUnreadCount}
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

      {/* 모달 */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            "p-0 border-0 overflow-hidden rounded-3xl",
            "shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)]",
            "sm:max-w-md w-[min(92vw,560px)]",
            "max-h-[85svh]"
          )}
        >
          <div className="relative flex flex-col h-[min(85svh,640px)]">
            <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                {caption}
                {hasUnreadBadge && (
                  <Badge variant="secondary" className="text-[10px]">
                    {visibleUnreadCount > 99 ? "99+" : visibleUnreadCount}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <Separator className="opacity-60" />

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
