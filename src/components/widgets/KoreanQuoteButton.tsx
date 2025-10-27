// src/components/KoreanQuoteButton.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

/* Tooltip: PartnerActionButton과 동일 스타일 */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Quote = {
  author: string;
  authorProfile?: string;
  message: string;
};

async function fetchKoreanQuote(timeoutMs = 7000): Promise<Quote> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(
      "https://korean-advice-open-api.vercel.app/api/advice",
      {
        cache: "no-store",
        signal: ctrl.signal,
      }
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as Quote;
    if (!j?.message) throw new Error("빈 응답");
    return j;
  } finally {
    clearTimeout(t);
  }
}

export default function KoreanQuoteButton({
  className,
  label = "🧾",
  size = "icon",
  emojiSizePx = 22,
  ariaLabel = "오늘의 명언",
}: {
  className?: string;
  label?: string; // 버튼 이모지
  size?: "icon" | "sm" | "default" | "lg";
  emojiSizePx?: number;
  ariaLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [quote, setQuote] = React.useState<Quote | null>(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const q = await fetchKoreanQuote();
      setQuote(q);
    } catch {
      setErr("명언을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const handleOpen = () => {
    setOpen(true);
    void load();
  };

  const authorLine = React.useMemo(() => {
    if (!quote) return "";
    const by = (quote.author || "").trim();
    const prof = (quote.authorProfile || "").trim();
    if (by && prof) return `${by} · ${prof}`;
    return by || prof || "작자 미상";
  }, [quote]);

  return (
    <>
      {/* ───────── Trigger: ghost + 라디얼 호버 + Tooltip ───────── */}
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-flex", className)}>
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
                aria-label={ariaLabel}
                onClick={handleOpen}
              >
                <span
                  style={{ fontSize: size === "icon" ? emojiSizePx : 18 }}
                  className={
                    size !== "icon"
                      ? "font-medium leading-none"
                      : "leading-none"
                  }
                  aria-hidden
                >
                  {label}
                </span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            오늘의 명언
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* ───────── Dialog: 우상단 X, 스티키 헤더/푸터, 본문 카드 ───────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "w-[calc(100vw-2rem)] sm:max-w-[520px] rounded-2xl",
            "p-4 sm:p-6",
            "max-h-[85vh] overflow-y-auto"
          )}
        >
          {/* 닫기(X) */}
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-9 w-9 rounded-full"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>

          {/* 스티키 헤더 */}
          <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 px-4 pt-4 pb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-t-2xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base sm:text-lg">
                오늘의 명언
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                한국어 명언을 랜덤으로 가져와 보여드려요.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* 본문 카드 */}
          <div className="rounded-lg border p-4 bg-white/60 dark:bg-zinc-900/40 min-h-[132px]">
            {err ? (
              <div className="text-sm text-rose-600">{err}</div>
            ) : loading ? (
              <div className="space-y-3">
                <div className="text-sm text-neutral-600">불러오는 중…</div>
                <div className="h-3 w-5/6 bg-neutral-200/70 rounded animate-pulse" />
                <div className="h-3 w-4/6 bg-neutral-200/60 rounded animate-pulse" />
                <div className="h-3 w-3/6 bg-neutral-200/50 rounded animate-pulse" />
              </div>
            ) : quote ? (
              <div className="space-y-3">
                <blockquote className="relative">
                  <p className="text-[15px] font-semibold leading-relaxed whitespace-pre-wrap">
                    “{quote.message}”
                  </p>
                </blockquote>
                <div className="text-sm text-neutral-700 dark:text-neutral-300">
                  — {authorLine}
                </div>
              </div>
            ) : null}
          </div>

          {/* 스티키 푸터 */}
          <div className="sticky bottom-0 mt-4 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-b-2xl">
            <DialogFooter className="sm:justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => void load()}
                disabled={loading}
                className="h-10"
              >
                다시 뽑기
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" className="h-10">
                  닫기
                </Button>
              </DialogClose>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
