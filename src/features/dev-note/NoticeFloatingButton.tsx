// src/components/NoticeCenterFloatingButton.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import supabase from "@/lib/supabase";
import { motion } from "framer-motion";

/* ===== 타입 & 유틸 ===== */
export type NoticeType = "update" | "event" | "caution";
export type Notice = {
  id: string;
  title: string;
  type: NoticeType;
  content: string;
  created_at: string; // ISO
};

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
    const t = setInterval(checkUnread, 60_000); // 1분 간격
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

        // ✅ 지금까지의 공지를 전부 읽음 처리
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

  /* ===== PotatoPokeButton 스타일: ripple 구현 ===== */
  const [ripple, setRipple] = useState(false);
  const rippleTimer = useRef<number | null>(null);
  const startRipple = () => {
    setRipple(false);
    requestAnimationFrame(() => {
      setRipple(true);
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
      rippleTimer.current = window.setTimeout(() => setRipple(false), 1400);
    });
  };
  useEffect(() => {
    return () => {
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
    };
  }, []);

  const Btn = (
    <div className="relative">
      <motion.button
        type="button"
        onClick={() => {
          startRipple();
          setOpen(true);
        }}
        aria-label={buttonLabel}
        className={cn(
          "relative grid place-items-center",
          "h-14 w-14 rounded-full border",
          "bg-white/60",
          "hover:pl-4 transition-all duration-500"
        )}
      >
        {/* ripple */}
        {ripple && (
          <span
            className="
              pointer-events-none absolute inset-0 rounded-full
              ring-4 ring-rose-300/50
              animate-[pokePing_1.4s_ease-out_forwards]
            "
            aria-hidden
          />
        )}

        {/* 이모지 (텍스트 없음) */}
        <span className="text-xl leading-none select-none" aria-hidden>
          {buttonEmoji}
        </span>

        <span className="sr-only">{buttonLabel}</span>
      </motion.button>

      {/* 🔴 우상단 점 + 깜빡임 (유지) */}
      {hasUnread && (
        <>
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 opacity-70 animate-ping" />
        </>
      )}

      {/* 파동 키프레임 */}
      <style>{`
        @keyframes pokePing {
          0%   { transform: scale(1);   opacity: .75; }
          70%  { transform: scale(1.9); opacity: 0;   }
          100% { transform: scale(1.9); opacity: 0;   }
        }
      `}</style>
    </div>
  );

  return (
    <div>
      {Btn}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>📢 개발자 공지사항</span>
            </DialogTitle>
            <DialogDescription>
              <span className="text-[13px]">최신 순 공지입니다.</span>
              <span className="mx-2 text-muted-foreground">|</span>
              <span className="text-[12px] text-muted-foreground inline-flex items-center gap-3 flex-wrap align-middle">
                <span>
                  🛠️<span className="mx-1">:</span>업데이트
                </span>
                <span>
                  🎉<span className="mx-1">:</span>이벤트
                </span>
                <span>
                  ⚠️<span className="mx-1">:</span>주의
                </span>
              </span>
            </DialogDescription>
          </DialogHeader>

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
                  const cleanTitle = stripTitle(n.title);
                  const meta = TYPE_META[n.type];
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
