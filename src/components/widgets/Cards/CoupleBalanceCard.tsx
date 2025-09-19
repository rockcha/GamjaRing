// src/components/CoupleBalanceCard.tsx
"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { Skeleton } from "@/components/ui/skeleton";

type CoupleBalanceCardProps = {
  className?: string;
  dense?: boolean;
  showDelta?: boolean;
  onClick?: () => void;
};

/* 부드러운 카운트업 (초기 1회 스냅 지원) */
function useAnimatedNumber(value: number, duration = 220, skipToken?: number) {
  const [display, setDisplay] = React.useState<number>(value);
  const fromRef = React.useRef<number>(value);
  const startRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number | null>(null);

  const skipNextRef = React.useRef(false);
  const lastTokenRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (skipToken != null && skipToken !== lastTokenRef.current) {
      skipNextRef.current = true;
      lastTokenRef.current = skipToken;
    }
  }, [skipToken]);

  React.useEffect(() => {
    if (fromRef.current === value) return;

    if (skipNextRef.current) {
      skipNextRef.current = false;
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const to = value;
    startRef.current = null;

    const step = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const p = Math.min(1, (t - (startRef.current as number)) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = from + (to - from) * eased;
      setDisplay(Math.round(cur));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return display;
}

export default function CoupleBalanceCard({
  className,
  dense = false,
  showDelta = true,
  onClick,
}: CoupleBalanceCardProps) {
  const { gold, potatoCount } = useCoupleContext() as {
    gold?: number;
    potatoCount?: number;
  };

  const goldReady = typeof gold === "number";
  const potatoReady = typeof potatoCount === "number";
  const isLoading = !goldReady || !potatoReady;

  const goldSafe = goldReady ? (gold as number) : 0;
  const potatoSafe = potatoReady ? (potatoCount as number) : 0;

  /** 로딩 → 준비 직후 첫 변화는 카운트업 스냅 */
  const [skipToken, setSkipToken] = useState(0);
  const wasLoadingRef = React.useRef(true);
  React.useEffect(() => {
    if (wasLoadingRef.current && !isLoading) setSkipToken((t) => t + 1);
    wasLoadingRef.current = isLoading;
  }, [isLoading]);

  const goldAnim = useAnimatedNumber(goldSafe, 220, skipToken);
  const potatoAnim = useAnimatedNumber(potatoSafe, 220, skipToken);

  // 델타/플래시
  const [goldBump, setGoldBump] = useState(false);
  const [potatoBump, setPotatoBump] = useState(false);
  const prevGold = React.useRef(goldSafe);
  const prevPotato = React.useRef(potatoSafe);

  const [goldDelta, setGoldDelta] = useState<number | null>(null);
  const [potatoDelta, setPotatoDelta] = useState<number | null>(null);
  const goldDeltaTimer = React.useRef<number | null>(null);
  const potatoDeltaTimer = React.useRef<number | null>(null);

  // ✅ 마운트 후 첫 "값 변화"는 무조건 무시 (페이지 이동 시 +전체 금액 방지)
  const ignoreFirstGoldChangeRef = React.useRef(true);
  const ignoreFirstPotatoChangeRef = React.useRef(true);

  React.useEffect(() => {
    if (!goldReady) return;

    if (prevGold.current !== goldSafe) {
      // 첫 변화는 무시하고 동기화만
      if (ignoreFirstGoldChangeRef.current) {
        ignoreFirstGoldChangeRef.current = false;
        prevGold.current = goldSafe;
        setGoldDelta(null);
        setGoldBump(false);
        return;
      }

      const diff = goldSafe - prevGold.current;
      prevGold.current = goldSafe;

      setGoldBump(true);
      window.setTimeout(() => setGoldBump(false), 120);

      if (showDelta && diff !== 0) {
        setGoldDelta(diff);
        if (goldDeltaTimer.current != null) {
          window.clearTimeout(goldDeltaTimer.current);
          goldDeltaTimer.current = null;
        }
        // ⏱ 유지 시간 ~1초로 살짝 증가 (애니 길이보다 살짝 더 길게)
        goldDeltaTimer.current = window.setTimeout(() => {
          setGoldDelta(null);
          goldDeltaTimer.current = null;
        }, 1300);
      }
    }

    return () => {
      if (goldDeltaTimer.current != null) {
        window.clearTimeout(goldDeltaTimer.current);
        goldDeltaTimer.current = null;
      }
    };
  }, [goldReady, goldSafe, showDelta]);

  React.useEffect(() => {
    if (!potatoReady) return;

    if (prevPotato.current !== potatoSafe) {
      if (ignoreFirstPotatoChangeRef.current) {
        ignoreFirstPotatoChangeRef.current = false;
        prevPotato.current = potatoSafe;
        setPotatoDelta(null);
        setPotatoBump(false);
        return;
      }

      const diff = potatoSafe - prevPotato.current;
      prevPotato.current = potatoSafe;

      setPotatoBump(true);
      window.setTimeout(() => setPotatoBump(false), 120);

      if (showDelta && diff !== 0) {
        setPotatoDelta(diff);
        if (potatoDeltaTimer.current != null) {
          window.clearTimeout(potatoDeltaTimer.current);
          potatoDeltaTimer.current = null;
        }
        // ⏱ 유지 시간 ~1초로 살짝 증가 (애니 길이보다 살짝 더 길게)
        potatoDeltaTimer.current = window.setTimeout(() => {
          setPotatoDelta(null);
          potatoDeltaTimer.current = null;
        }, 3300);
      }
    }

    return () => {
      if (potatoDeltaTimer.current != null) {
        window.clearTimeout(potatoDeltaTimer.current);
        potatoDeltaTimer.current = null;
      }
    };
  }, [potatoReady, potatoSafe, showDelta]);

  /** 스타일 */
  const cardCls = cn(
    "relative",
    dense ? "px-3 py-2" : "px-3.5 py-2.5",
    "cursor-pointer select-none",
    "active:scale-[0.995] transition-transform duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
    className
  );

  const itemStack = (bump: boolean) =>
    cn(
      "flex flex-col items-center justify-center",
      dense ? "gap-1" : "gap-1.5",
      "transition-transform",
      bump ? "scale-[1.02]" : "scale-100"
    );

  const chipCls = cn(
    "relative inline-grid place-items-center rounded-full",
    dense ? "h-7 w-7 text-[15px]" : "h-8 w-8 text-[17px]",
    "bg-white/80 shadow-sm ring-1 ring-black/5"
  );

  const numCls = cn(
    "relative font-semibold tabular-nums text-amber-900 tracking-tight",
    dense ? "text-[12px] leading-4" : "text-[13px] leading-[18px]"
  );

  const badgeBase =
    "absolute left-50% left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full border shadow-sm text-[10px] font-semibold tabular-nums backdrop-blur-[2px] ring-1 ring-white/40 animate-[floatUp_700ms_ease-out_forwards]";
  const goldBadgeTone =
    goldDelta && goldDelta > 0
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-rose-50 text-rose-700 border-rose-200";
  const potatoBadgeTone =
    potatoDelta && potatoDelta > 0
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  const totalGold = goldAnim.toLocaleString("ko-KR");
  const totalPotato = potatoAnim.toLocaleString("ko-KR");

  const centerFlashText =
    "drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] font-extrabold tracking-tight text-5xl sm:text-6xl md:text-7xl leading-none select-none";

  return (
    <div
      className={cardCls}
      role="button"
      tabIndex={0}
      onClick={onClick}
      aria-label="보유 자산"
    >
      {/* 작은 델타 배지 */}
      {showDelta && goldDelta !== null && (
        <span className={cn(badgeBase, goldBadgeTone, "-top-3")} aria-hidden>
          {goldDelta > 0 ? "▲" : "▼"}{" "}
          {Math.abs(goldDelta).toLocaleString("ko-KR")}
        </span>
      )}
      {showDelta && potatoDelta !== null && (
        <span
          className={cn(badgeBase, potatoBadgeTone, "top-[46px]")}
          aria-hidden
        >
          {potatoDelta > 0 ? "▲" : "▼"}{" "}
          {Math.abs(potatoDelta).toLocaleString("ko-KR")}
        </span>
      )}

      {/* 2열 */}
      <div className="grid w-full items-center grid-cols-2 gap-2">
        {/* GOLD */}
        <div
          className={itemStack(goldBump)}
          aria-label={`보유 골드 ${totalGold}`}
        >
          <span className={chipCls} aria-hidden>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,.8),rgba(255,255,255,0)_45%)] mix-blend-screen"
            />
            {goldBump && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full animate-[chipGlow_3s_ease-in-out_infinite]"
              />
            )}
            🪙
          </span>

          {!goldReady ? (
            <Skeleton
              className={cn(dense ? "h-3 w-14" : "h-3.5 w-16", "rounded-md")}
            />
          ) : (
            <span
              className={cn(
                numCls,
                goldBump && "animate-[bumpPulse_240ms_ease-out]"
              )}
            >
              {totalGold}
              {goldBump && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 -left-6 w-12 bg-gradient-to-r from-transparent via-white/70 to-transparent rounded-md blur-[1px] animate-[shineSweep_700ms_ease-out]"
                />
              )}
            </span>
          )}
        </div>

        {/* POTATO */}
        <div
          className={itemStack(potatoBump)}
          aria-label={`보유 감자 ${totalPotato}`}
        >
          <span className={chipCls} aria-hidden>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,.8),rgba(255,255,255,0)_45%)] mix-blend-screen"
            />
            {potatoBump && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full animate-[chipGlow_3s_ease-in-out_infinite]"
              />
            )}
            🥔
          </span>

          {!potatoReady ? (
            <Skeleton
              className={cn(dense ? "h-3 w-14" : "h-3.5 w-16", "rounded-md")}
            />
          ) : (
            <span
              className={cn(
                numCls,
                potatoBump && "animate-[bumpPulse_240ms_ease-out]"
              )}
            >
              {totalPotato}
              {potatoBump && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 -left-6 w-12 bg-gradient-to-r from-transparent via-white/70 to-transparent rounded-md blur-[1px] animate-[shineSweep_700ms_ease-out]"
                />
              )}
            </span>
          )}
        </div>
      </div>

      {/* 중앙 플래시 (정중앙 배치 & 유지시간 ↑) */}
      {showDelta && goldDelta !== null && (
        <div
          className="fixed inset-0 z-[2147483647] pointer-events-none flex items-center justify-center"
          aria-hidden
        >
          <div
            className={cn(
              "animate-[centerFlash_3200ms_cubic-bezier(0.2,0.8,0.2,1)_forwards]",
              centerFlashText,
              goldDelta > 0 ? "text-emerald-400" : "text-rose-400",
              "text-center"
            )}
            style={{
              WebkitTextStroke: "1px rgba(0,0,0,0.15)",
              textShadow:
                "0 2px 10px rgba(0,0,0,0.35), 0 0 24px rgba(255,255,255,0.25)",
            }}
          >
            🪙 {goldDelta > 0 ? "+" : "−"}
            {Math.abs(goldDelta).toLocaleString("ko-KR")}
          </div>
        </div>
      )}

      {showDelta && potatoDelta !== null && (
        <div
          className="fixed inset-0 z-[2147483647] pointer-events-none flex items-center justify-center"
          aria-hidden
        >
          {/* ✅ 위치 보정: 추가 translate 제거, 완전한 정중앙 */}
          <div
            className={cn(
              "animate-[centerFlash_1200ms_cubic-bezier(0.2,0.8,0.2,1)_forwards]",
              centerFlashText,
              potatoDelta > 0 ? "text-emerald-400" : "text-rose-400",
              "text-center"
            )}
            style={{
              WebkitTextStroke: "1px rgba(0,0,0,0.15)",
              textShadow:
                "0 2px 10px rgba(0,0,0,0.35), 0 0 24px rgba(255,255,255,0.25)",
            }}
          >
            🥔 {potatoDelta > 0 ? "+" : "−"}
            {Math.abs(potatoDelta).toLocaleString("ko-KR")}
          </div>
        </div>
      )}

      {/* 접근성 */}
      <span className="sr-only" aria-live="polite">
        골드 {totalGold}, 감자 {totalPotato}
      </span>

      <style>{`
        @keyframes floatUp {
          0% { opacity: 0; transform: translate(-50%, 0) scale(0.92); filter: blur(0.25px); }
          18% { opacity: 1; transform: translate(-50%, -5px) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translate(-50%, -14px) scale(1); filter: blur(0.25px); }
        }
        @keyframes bumpPulse {
          0% { transform: scale(1); text-shadow: 0 0 0 rgba(0,0,0,0); }
          35% { transform: scale(1.06); text-shadow: 0 1px 0 rgba(0,0,0,0.06); }
          100% { transform: scale(1); text-shadow: 0 0 0 rgba(0,0,0,0); }
        }
        @keyframes shineSweep {
          0% { transform: translateX(-120%) skewX(-15deg); opacity: 0; }
          30% { opacity: .6; }
          70% { opacity: .3; }
          100% { transform: translateX(120%) skewX(-15deg); opacity: 0; }
        }
        @keyframes chipGlow {
          0%,100% { box-shadow: inset 0 0 0 rgba(255,255,255,0); }
          50% { box-shadow: inset 0 8px 22px rgba(255,255,255,0.45); }
        }
        /* ⏱ 중앙 플래시: 유지 구간을 늘려 약 1.2s 동안 표시 */
        @keyframes centerFlash {
          0% { opacity: 0; transform: scale(0.92); filter: blur(1px); }
          20% { opacity: 1; transform: scale(1.05); filter: blur(0); }
          85% { opacity: 1; transform: scale(1.0); filter: blur(0); }
          100% { opacity: 0; transform: scale(1.0); filter: blur(1px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[floatUp_700ms_ease-out_forwards\\],
          .animate-\\[bumpPulse_240ms_ease-out\\],
          .animate-\\[shineSweep_700ms_ease-out\\],
          .animate-\\[chipGlow_3s_ease-in-out_infinite\\],
          .animate-\\[centerFlash_1200ms_cubic-bezier\\(0\\.2,0\\.8,0\\.2,1\\)_forwards\\] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
