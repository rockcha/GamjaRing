// src/components/CoupleBalanceCard.tsx
"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { Skeleton } from "@/components/ui/skeleton";

type CoupleBalanceCardProps = {
  className?: string;
  dense?: boolean; // 더 컴팩트
  showDelta?: boolean; // +N/-N 배지
  onClick?: () => void; // 외부 클릭 콜백(옵션)
};

/* 부드러운 카운트업 */
function useAnimatedNumber(value: number, duration = 220) {
  const [display, setDisplay] = React.useState<number>(value);
  const fromRef = React.useRef<number>(value);
  const startRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (fromRef.current === value) return;

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
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
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

  const isLoading = typeof gold !== "number" || typeof potatoCount !== "number";
  const goldSafe = typeof gold === "number" ? gold : 0;
  const potatoSafe = typeof potatoCount === "number" ? potatoCount : 0;

  const goldAnim = useAnimatedNumber(goldSafe);
  const potatoAnim = useAnimatedNumber(potatoSafe);

  // 바운스 & 델타
  const [goldBump, setGoldBump] = useState(false);
  const [potatoBump, setPotatoBump] = useState(false);
  const prevGold = React.useRef(goldSafe);
  const prevPotato = React.useRef(potatoSafe);

  const [goldDelta, setGoldDelta] = useState<number | null>(null);
  const [potatoDelta, setPotatoDelta] = useState<number | null>(null);
  const goldDeltaTimer = React.useRef<number | null>(null);
  const potatoDeltaTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!isLoading && prevGold.current !== goldSafe) {
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
        goldDeltaTimer.current = window.setTimeout(() => {
          setGoldDelta(null);
          goldDeltaTimer.current = null;
        }, 900);
      }
    }

    return () => {
      if (goldDeltaTimer.current != null) {
        window.clearTimeout(goldDeltaTimer.current);
        goldDeltaTimer.current = null;
      }
    };
  }, [goldSafe, isLoading, showDelta]);

  React.useEffect(() => {
    if (!isLoading && prevPotato.current !== potatoSafe) {
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
        potatoDeltaTimer.current = window.setTimeout(() => {
          setPotatoDelta(null);
          potatoDeltaTimer.current = null;
        }, 900);
      }
    }

    return () => {
      if (potatoDeltaTimer.current != null) {
        window.clearTimeout(potatoDeltaTimer.current);
        potatoDeltaTimer.current = null;
      }
    };
  }, [potatoSafe, isLoading, showDelta]);

  /** 스타일 (호버 없음, 컴팩트) */
  const cardCls = cn(
    "relative rounded-xl bg-white ring-1 ring-black/5 shadow-sm",
    dense ? "px-3 py-2" : "px-3.5 py-2.5",
    "cursor-pointer",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
    className
  );

  // 각 블록(칩+숫자)을 세로 스택, 카드 전체는 2열 그리드로 가로 배치
  const itemStack = (bump: boolean) =>
    cn(
      "flex flex-col items-center justify-center",
      dense ? "gap-1" : "gap-1.5",
      "transition-transform",
      bump ? "scale-[1.02]" : "scale-100"
    );

  const chipCls = cn(
    "inline-grid place-items-center",
    dense ? "h-7 w-7 text-[15px]" : "h-8 w-8 text-[17px]"
  );

  const numCls = cn(
    "font-semibold tabular-nums text-amber-900 tracking-tight",
    dense ? "text-[12px] leading-4" : "text-[13px] leading-[18px]"
  );

  const badgeBase =
    "absolute left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full border shadow-sm text-[10px] font-semibold tabular-nums animate-[floatUp_700ms_ease-out_forwards]";
  const goldBadgeTone =
    goldDelta && goldDelta > 0
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-rose-50 text-rose-700 border-rose-200";
  const potatoBadgeTone =
    potatoDelta && potatoDelta > 0
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <div
      className={cardCls}
      role="button"
      tabIndex={0}
      onClick={onClick}
      aria-label="보유 자산"
    >
      {/* 델타 배지 (위/아래 살짝만) */}
      {showDelta && goldDelta !== null && (
        <span className={cn(badgeBase, goldBadgeTone, "-top-3")} aria-hidden>
          🪙 {goldDelta > 0 ? "+" : ""}
          {goldDelta.toLocaleString("ko-KR")}
        </span>
      )}
      {showDelta && potatoDelta !== null && (
        <span
          className={cn(badgeBase, potatoBadgeTone, "top-[46px]")}
          aria-hidden
        >
          🥔 {potatoDelta > 0 ? "+" : ""}
          {potatoDelta.toLocaleString("ko-KR")}
        </span>
      )}

      {/* 2열 그리드 (세로 스택을 좌우 배치해 높이 최소화) */}
      <div className={cn("grid w-full items-center", "grid-cols-2 gap-2")}>
        {/* GOLD */}
        <div
          className={itemStack(goldBump)}
          aria-label={`보유 골드 ${goldAnim.toLocaleString("ko-KR")}`}
        >
          <span className={chipCls} aria-hidden>
            🪙
          </span>
          {isLoading ? (
            <Skeleton
              className={cn(dense ? "h-3 w-14" : "h-3.5 w-16", "rounded-md")}
            />
          ) : (
            <span className={numCls}>{goldAnim.toLocaleString("ko-KR")}</span>
          )}
        </div>

        {/* POTATO */}
        <div
          className={itemStack(potatoBump)}
          aria-label={`보유 감자 ${potatoAnim.toLocaleString("ko-KR")}`}
        >
          <span className={chipCls} aria-hidden>
            🥔
          </span>
          {isLoading ? (
            <Skeleton
              className={cn(dense ? "h-3 w-14" : "h-3.5 w-16", "rounded-md")}
            />
          ) : (
            <span className={numCls}>{potatoAnim.toLocaleString("ko-KR")}</span>
          )}
        </div>
      </div>

      {/* 접근성: 모션 감소 대응 */}
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 0; transform: translate(-50%, 0) scale(0.92); filter: blur(0.25px); }
          18%  { opacity: 1; transform: translate(-50%, -5px) scale(1);   filter: blur(0); }
          100% { opacity: 0; transform: translate(-50%, -14px) scale(1);  filter: blur(0.25px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[floatUp_700ms_ease-out_forwards\\] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
