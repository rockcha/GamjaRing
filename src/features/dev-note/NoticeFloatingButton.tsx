// src/components/NoticeCenterFloatingButton.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import supabase from "@/lib/supabase";

/* Tooltip (PartnerActionButton과 동일 패턴) */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* Lucide Icons (본문 카드용) */
import { Megaphone, Wrench, PartyPopper, AlertTriangle } from "lucide-react";

/* ===== 타입 & 유틸 ===== */
export type NoticeType = "update" | "event" | "caution";
export type Notice = {
  id: string;
  title: string;
  type: NoticeType;
  content: string;
  created_at: string; // ISO
};

type LucideIconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const TYPE_META: Record<
  NoticeType,
  { label: string; Icon: LucideIconType; cardClass: string }
> = {
  update: {
    label: "업데이트",
    Icon: Wrench,
    cardClass:
      "bg-sky-50/70 border-sky-200 text-card-foreground dark:bg-sky-900/20 dark:border-sky-800",
  },
  event: {
    label: "이벤트",
    Icon: PartyPopper,
    cardClass:
      "bg-violet-50/70 border-violet-200 text-card-foreground dark:bg-violet-900/20 dark:border-violet-800",
  },
  caution: {
    label: "주의",
    Icon: AlertTriangle,
    cardClass:
      "bg-amber-50/70 border-amber-200 text-card-foreground dark:bg-amber-900/20 dark:border-amber-800",
  },
};

// 제목 접두(주의/이벤트/업데이트 등) 제거
const STRIP_WORDS = [
  "주의",
  "이벤트",
  "업데이트",
  "공지",
  "안내",
  "정보",
  "버그",
  "필독",
  "중요",
];
function stripTitle(raw: string) {
  let s = (raw ?? "").trim();
  s = s.replace(/^(?:[🚨⚠️ℹ️✅⭐️📢🔥✨🛠️🎉]+)\s*/u, "");
  const wordGroup = STRIP_WORDS.join("|");
  const re = new RegExp(
    `^(?:[\\[\\(【\\(]?\\s*(?:${wordGroup})\\s*[\\]\\)】\\)]?\\s*[:：-]?\\s*)+`,
    "i"
  );
  s = s.replace(re, "");
  return s.trim();
}

// 날짜 포맷/오늘 여부(Asia/Seoul 기준)
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
const isToday = (iso: string) => {
  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
  return fmtDate(iso) === today;
};

export default function NoticeCenterFloatingButton({
  className,
  buttonLabel = "개발자 공지사항",
  limit = 50,
  /** PartnerActionButton과 동일한 크기 시스템 */
  size = "icon",
  /** 트리거 이모지 (요청: 📢) */
  emoji = "📢",
  /** 트리거 이모지 실제 폰트 크기(px) */
  emojiSizePx = 22,
}: {
  className?: string;
  buttonLabel?: string;
  limit?: number;
  size?: "icon" | "sm" | "default" | "lg";
  emoji?: string;
  emojiSizePx?: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Notice[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  const ordered = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [items]
  );

  // ✅ 안 읽은 공지 여부 체크
  const checkUnread = useCallback(async () => {
    const { data, error } = await supabase.rpc("devnote_has_unread");
    if (!error) setHasUnread(!!data);
  }, []);

  // 진입 시 1회 + 주기적 체크
  useEffect(() => {
    void checkUnread();
    const t = setInterval(checkUnread, 60_000);
    return () => clearInterval(t);
  }, [checkUnread]);

  // 공지 insert 실시간 반영
  useEffect(() => {
    const ch = supabase
      .channel("notices-insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notices" },
        () => void checkUnread()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [checkUnread]);

  // 모달 열면: 목록 불러오고 → 전부 읽음 처리
  useEffect(() => {
    if (!open) return;
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from("notices")
          .select("id,title,type,content,created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        if (!mounted) return;
        setItems((data as Notice[]) ?? []);

        await supabase.rpc("devnote_mark_all_read");
        setHasUnread(false);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "공지 불러오기에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, limit]);

  return (
    <div className={cn("inline-block", className)}>
      {/* ✅ 트리거 버튼: PartnerActionButton과 동일한 패턴 + Tooltip "개발자 공지사항" */}
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex" onClick={() => setOpen(true)}>
              <Button
                type="button"
                variant="ghost"
                size={size}
                className={cn(
                  "relative h-10 w-10 transition-all",
                  "before:pointer-events-none before:absolute before:inset-0",
                  "before:opacity-0 hover:before:opacity-100 before:transition-opacity",
                  "before:bg-[radial-gradient(120px_80px_at_50%_-20%,rgba(255,182,193,0.35),transparent_60%)]",
                  { "w-auto px-3": size !== "icon" }
                )}
                aria-label={buttonLabel}
              >
                {/* 이모지 22px 고정 (요청) */}
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

                {/* 읽지 않음 배지 (우상단) — 40x40 기준에 맞춘 상수값 */}
                {hasUnread && (
                  <>
                    <span
                      className="pointer-events-none absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500/60 animate-ping"
                      aria-hidden
                    />
                    <span
                      className="pointer-events-none absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
                      aria-hidden
                    />
                  </>
                )}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            개발자 공지사항
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* ✅ 모달: 반응형 비율 기반으로 넓게 (기존 유지) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "p-0 border-0 overflow-hidden rounded-3xl",
            "shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)]",
            // 모바일: 94vw / 태블릿: 88vw / 데스크톱: 72~56vw / 최대 980px
            "w-[94vw] sm:w-[88vw] md:w-[72vw] lg:w-[56vw] xl:w-[48vw] 2xl:w-[42vw] max-w-[980px]",
            "max-h-[85svh]"
          )}
        >
          <div className="relative flex flex-col h-[min(85svh,680px)]">
            <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <Megaphone className="w-5 h-5" aria-hidden />
                <span>개발자 공지사항</span>
              </DialogTitle>
              <DialogDescription>
                <span className="text-[13px]">최신 순 공지입니다.</span>
                <span className="mx-2 text-muted-foreground">|</span>
                <span className="text-[12px] text-muted-foreground inline-flex items-center gap-2 flex-wrap align-middle">
                  <span className="inline-flex items-center gap-1.5">
                    <Wrench className="w-4 h-4" aria-hidden />
                    <span>업데이트</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <PartyPopper className="w-4 h-4" aria-hidden />
                    <span>이벤트</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" aria-hidden />
                    <span>주의</span>
                  </span>
                </span>
              </DialogDescription>
            </DialogHeader>

            <Separator className="opacity-60" />

            {/* 스크롤 가능한 본문 */}
            <div className="flex-1 min-h-0">
              {loading ? (
                <div className="px-5 py-4">
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-40" />
                    <Separator />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-5 w-1/2" />
                  </div>
                </div>
              ) : error ? (
                <div className="px-5 py-6 text-sm text-destructive">
                  {error}
                </div>
              ) : ordered.length === 0 ? (
                <div className="px-5 py-8 text-sm text-muted-foreground text-center">
                  등록된 공지가 없습니다.
                </div>
              ) : (
                <ScrollArea className="h-full px-1 py-2">
                  <ul className="space-y-1 pr-3">
                    {ordered.map((n) => {
                      const cleanTitle = stripTitle(n.title);
                      const meta = TYPE_META[n.type];
                      const Icon = meta.Icon;
                      return (
                        <li
                          key={n.id}
                          className={cn(
                            "rounded-xl border p-4 text-card-foreground",
                            meta.cardClass
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="mt-1 flex items-center justify-between gap-2 w-full">
                                <h3 className="text-base font-semibold leading-snug break-words flex items-center gap-2 min-w-0">
                                  <Icon
                                    className="w-4 h-4 shrink-0"
                                    aria-hidden
                                  />
                                  <span className="truncate">{cleanTitle}</span>
                                  {isToday(n.created_at) && (
                                    <span className="text-xs font-medium text-red-600 bg-red-100/70 dark:bg-red-900/40 dark:text-red-300 px-1.5 py-0.5 rounded-md">
                                      NEW
                                    </span>
                                  )}
                                </h3>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {fmtDate(n.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {n.content}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              )}
            </div>

            <Separator className="opacity-60" />

            {/* 하단 버튼(항상 보임) */}
            <DialogFooter className="px-5 py-4 shrink-0">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-lg px-5 shadow-sm hover:shadow transition-all"
              >
                닫기
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
