// src/components/notificationDropdown.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  const headerIconSize = Math.round(iconSize * 0.42);

  // 포털 렌더 안전 가드 (SSR 하이드레이션 대비)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      {/* ===== 좌하단 고정 원형 버튼(FAB) 트리거 — 뷰포트 기준 고정 ===== */}
      {mounted &&
        typeof window !== "undefined" &&
        createPortal(
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleOpenChange(true)}
            aria-label={caption}
            className={cn(
              // ✅ 전역(뷰포트) 고정
              "fixed z-[9999] left-4 bottom-4",
              // iOS 안전영역 고려

              "rounded-full p-0 shadow-lg hover:shadow-xl transition-shadow",
              "ring-1 ring-black/5 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70",
              // 크기 (원형)
              "grid place-items-center",
              className
            )}
            style={{
              width: wrapperSize + 20, // 이미지보다 약간 크게
              height: wrapperSize + 20,
            }}
          >
            <span className="relative inline-grid place-items-center">
              {/* 파동/글로우: 새 알림 있을 때만 */}
              {hasUnreadBadge && (
                <>
                  <span
                    className="
                      pointer-events-none absolute inset-0 rounded-full
                      bg-rose-400/25 blur-[0.5px] transform-gpu
                      motion-safe:animate-[notifWave_1.6s_ease-out_infinite]
                      "
                    aria-hidden
                  />
                  <span
                    className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-rose-300/60"
                    aria-hidden
                  />
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-rose-300/20 blur-md" />
                </>
              )}

              {/* 아이콘 */}
              <img
                src={iconSrc}
                alt={caption}
                className={cn(
                  "object-contain transition-transform duration-200",
                  "hover:scale-110 active:scale-95",
                  hasUnreadBadge ? "animate-soft-bounce" : ""
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
          </Button>,
          document.body
        )}

      {/* ===== Dialog: 폰/데탑 모두 예쁜 비율 ===== */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            // 공통
            "p-0 border-0 overflow-hidden ring-1 ring-black/5 backdrop-blur-xl",
            "rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)]",
            "max-h-[85svh] sm:max-h-[80vh]",

            // 데스크톱(>=sm): 기본 중앙 모달 스타일 유지
            "sm:fixed sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-auto sm:max-w-md",

            // 모바일(<sm): 바텀시트 — ★ 기본값들 ‘완전’ 리셋!
            "fixed inset-x-0 bottom-0 top-auto", // top 초기화
            "left-0 right-0", // left/right 명시
            "translate-x-0 translate-y-0", // translate 초기화
            "rounded-t-3xl rounded-b-none",
            "w-full",
            "pb-[max(env(safe-area-inset-bottom),12px)]"
          )}
        >
          {/* 배경 버블(은은) */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-12 -left-10 w-40 h-40 rounded-full bg-pink-200/30 blur-2xl animate-float-slow" />
            <div className="absolute -bottom-12 -right-8 w-44 h-44 rounded-full bg-amber-200/40 blur-2xl animate-float-slower" />
          </div>

          <div className="relative flex flex-col min-h=[360px] max-h-[inherit]">
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
                // 내부 스크롤 높이 (폰/데탑 모두 안정)
                <ScrollArea
                  className="px-1 py-2"
                  style={{ maxHeight: "60svh" }}
                >
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

      {/* 애니메이션 키프레임 */}
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
