// src/components/KoreanQuoteButton.tsx
"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  buttonEmoji = "🧾",
  ariaLabel = "오늘의 명언",
}: {
  className?: string;
  buttonEmoji?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [quote, setQuote] = React.useState<Quote | null>(null);

  // MapModalButton과 동일한 '원형 + 리플' 버튼 구현
  const [ripple, setRipple] = React.useState(false);
  const rippleTimer = React.useRef<number | null>(null);
  const startRipple = () => {
    setRipple(false);
    requestAnimationFrame(() => {
      setRipple(true);
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
      rippleTimer.current = window.setTimeout(() => setRipple(false), 1400);
    });
  };
  React.useEffect(() => {
    return () => {
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
    };
  }, []);

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
    startRipple();
    setOpen(true);
    void load();
  };

  const authorLine = React.useMemo(() => {
    if (!quote) return "";
    const by = (quote.author || "").trim();
    const prof = (quote.authorProfile || "").trim();
    // 지은이/프로필 둘 중 없는 값이 있으면 자연스럽게 생략
    if (by && prof) return `${by} · ${prof}`;
    return by || prof || "작자 미상";
  }, [quote]);

  const CircleButton = (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onClick={handleOpen}
      className={cn(
        "relative grid place-items-center",
        "h-14 w-14 rounded-full border",
        "bg-white/60",
        "hover:pl-4 transition-all duration-500",
        className
      )}
    >
      {/* 클릭 리플 */}
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

      {/* 이모지 아이콘만 노출 (텍스트 없음) */}
      <span className="text-2xl leading-none select-none" aria-hidden>
        {buttonEmoji}
      </span>

      {/* 파동 키프레임 (MapModalButton과 동일) */}
      <style>{`
        @keyframes pokePing {
          0%   { transform: scale(1);   opacity: .75; }
          70%  { transform: scale(1.9); opacity: 0;   }
          100% { transform: scale(1.9); opacity: 0;   }
        }
      `}</style>
    </motion.button>
  );

  return (
    <>
      {CircleButton}

      {/* Dialog 레이아웃은 기존 구조 유지 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>오늘의 명언</DialogTitle>
          </DialogHeader>

          <div className="rounded-lg border p-4 bg-white/60 dark:bg-zinc-900/40 min-h-[132px]">
            {err ? (
              <div className="text-sm text-rose-600">{err}</div>
            ) : loading ? (
              <div className="text-sm text-neutral-600">불러오는 중…</div>
            ) : quote ? (
              <div className="space-y-3">
                {/* ✅ 실제 '말'을 시각적으로 강조 + 큰 따옴표 표기 */}
                <div className="relative">
                  <p className="text-[15px] font-semibold leading-relaxed whitespace-pre-wrap">
                    {'"' + quote.message + '"'}
                  </p>
                </div>

                <div className="text-sm text-neutral-700 dark:text-neutral-300">
                  — {authorLine}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => void load()}
              disabled={loading}
            >
              다시 뽑기
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
