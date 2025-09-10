// src/components/NoticeCenterFloatingButton.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import supabase from "@/lib/supabase";

// ===== 타입 =====
export type NoticeType = "update" | "event" | "caution";
export type Notice = {
  id: string;
  title: string;
  type: NoticeType;
  content: string;
  created_at: string;
};

// ===== type → 스타일/이모지 매핑 =====
const TYPE_META: Record<
  NoticeType,
  { label: string; emoji: string; cardClass: string }
> = {
  update: {
    label: "업데이트",
    emoji: "🛠️",
    cardClass:
      "bg-sky-50/70 border-sky-200 text-card-foreground dark:bg-sky-900/20 dark:border-sky-800",
  },
  event: {
    label: "이벤트",
    emoji: "🎉",
    cardClass:
      "bg-violet-50/70 border-violet-200 text-card-foreground dark:bg-violet-900/20 dark:border-violet-800",
  },
  caution: {
    label: "주의",
    emoji: "⚠️",
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
  // 앞쪽 이모지/아이콘 제거
  s = s.replace(/^(?:[🚨⚠️ℹ️✅⭐️📢🔥✨🛠️🎉]+)\s*/u, "");
  // 괄호/대괄호로 둘러싼 카테고리 + 콜론/대시 제거
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

// ===== Floating Notice Center =====
export default function NoticeCenterFloatingButton({
  className,
  buttonEmoji = "📢",
  buttonLabel = "개발자 공지사항",
  limit = 50,
}: {
  className?: string;
  buttonEmoji?: string;
  buttonLabel?: string;
  limit?: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Notice[]>([]);

  const ordered = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [items]
  );

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
    <div className={cn("fixed left-3 bottom-3 z-50", className)}>
      {/* Floating button */}
      <Button
        size="sm"
        variant="default"
        onClick={() => setOpen(true)}
        className="rounded-2xl shadow-lg px-3 py-2 h-auto text-sm gap-2 bg-popover text-popover-foreground border border-border hover:bg-accent hover:text-accent-foreground"
        aria-label={buttonLabel}
      >
        <span aria-hidden>{buttonEmoji}</span>
        <span>{buttonLabel}</span>
      </Button>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>📢 개발자 공지사항</span>
            </DialogTitle>

            {/* 설명 + 이모지 전설(같은 줄) */}
            <DialogDescription>
              <span className="text-[13px]">최신순으로 공지입니다.</span>
              <span className="mx-2 text-muted-foreground">|</span>
              <span className="text-[12px] text-muted-foreground inline-flex items-center gap-3 flex-wrap align-middle">
                <span>
                  {TYPE_META.update.emoji}
                  <span className="mx-1">:</span>
                  {TYPE_META.update.label}
                </span>
                <span>
                  {TYPE_META.event.emoji}
                  <span className="mx-1">:</span>
                  {TYPE_META.event.label}
                </span>
                <span>
                  {TYPE_META.caution.emoji}
                  <span className="mx-1">:</span>
                  {TYPE_META.caution.label}
                </span>
              </span>
            </DialogDescription>
          </DialogHeader>

          {/* Body */}
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <Separator />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : ordered.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              등록된 공지가 없습니다.
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-3">
              <ul className="space-y-4">
                {ordered.map((n) => {
                  const meta = TYPE_META[n.type];
                  const cleanTitle = stripTitle(n.title);
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
                            {/* 이모지 + 정제된 제목 (타입 라벨 제거) */}
                            <h3 className="text-base font-semibold leading-snug break-words flex items-center gap-2 min-w-0">
                              <span className="mr-1" aria-hidden>
                                {meta.emoji}
                              </span>
                              <span className="truncate">{cleanTitle}</span>
                              {isToday(n.created_at) && (
                                <span className="text-xs font-normal text-red-500/80 bg-red-100/60 dark:bg-red-900/40 dark:text-red-300 px-1.5 py-0.5 rounded-md">
                                  new
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
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================
   사용 예시
   ----------------------------
   <NoticeCenterFloatingButton className="left-4 bottom-4" />
   or 레이아웃 컴포넌트에 추가
============================ */
