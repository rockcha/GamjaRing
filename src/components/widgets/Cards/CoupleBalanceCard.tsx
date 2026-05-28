// src/components/widgets/Cards/CoupleBalanceCard.tsx
"use client";

import * as React from "react";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { cn } from "@/lib/utils";

type CoupleBalanceCardProps = {
  className?: string;
  dense?: boolean;
  showDelta?: boolean;
  onClick?: () => void;
};

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

    const step = (time: number) => {
      if (startRef.current == null) startRef.current = time;
      const progress = Math.min(1, (time - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));

      if (progress < 1) {
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
  }, [duration, value]);

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

  const goldSafe = goldReady ? gold : 0;
  const potatoSafe = potatoReady ? potatoCount : 0;

  const [skipToken, setSkipToken] = useState(0);
  const wasLoadingRef = React.useRef(true);

  React.useEffect(() => {
    if (wasLoadingRef.current && !isLoading) setSkipToken((token) => token + 1);
    wasLoadingRef.current = isLoading;
  }, [isLoading]);

  const goldAnim = useAnimatedNumber(goldSafe, 220, skipToken);
  const potatoAnim = useAnimatedNumber(potatoSafe, 220, skipToken);

  const [goldBump, setGoldBump] = useState(false);
  const [potatoBump, setPotatoBump] = useState(false);
  const [goldDelta, setGoldDelta] = useState<number | null>(null);
  const [potatoDelta, setPotatoDelta] = useState<number | null>(null);

  const prevGold = React.useRef(goldSafe);
  const prevPotato = React.useRef(potatoSafe);
  const ignoreFirstGoldChangeRef = React.useRef(true);
  const ignoreFirstPotatoChangeRef = React.useRef(true);
  const goldDeltaTimer = React.useRef<number | null>(null);
  const potatoDeltaTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!goldReady || prevGold.current === goldSafe) return;

    if (ignoreFirstGoldChangeRef.current) {
      ignoreFirstGoldChangeRef.current = false;
      prevGold.current = goldSafe;
      return;
    }

    const diff = goldSafe - prevGold.current;
    prevGold.current = goldSafe;
    setGoldBump(true);
    window.setTimeout(() => setGoldBump(false), 160);

    if (showDelta && diff !== 0) {
      setGoldDelta(diff);
      if (goldDeltaTimer.current != null) {
        window.clearTimeout(goldDeltaTimer.current);
      }
      goldDeltaTimer.current = window.setTimeout(() => {
        setGoldDelta(null);
        goldDeltaTimer.current = null;
      }, 1200);
    }
  }, [goldReady, goldSafe, showDelta]);

  React.useEffect(() => {
    if (!potatoReady || prevPotato.current === potatoSafe) return;

    if (ignoreFirstPotatoChangeRef.current) {
      ignoreFirstPotatoChangeRef.current = false;
      prevPotato.current = potatoSafe;
      return;
    }

    const diff = potatoSafe - prevPotato.current;
    prevPotato.current = potatoSafe;
    setPotatoBump(true);
    window.setTimeout(() => setPotatoBump(false), 160);

    if (showDelta && diff !== 0) {
      setPotatoDelta(diff);
      if (potatoDeltaTimer.current != null) {
        window.clearTimeout(potatoDeltaTimer.current);
      }
      potatoDeltaTimer.current = window.setTimeout(() => {
        setPotatoDelta(null);
        potatoDeltaTimer.current = null;
      }, 1200);
    }
  }, [potatoReady, potatoSafe, showDelta]);

  React.useEffect(() => {
    return () => {
      if (goldDeltaTimer.current != null) window.clearTimeout(goldDeltaTimer.current);
      if (potatoDeltaTimer.current != null) {
        window.clearTimeout(potatoDeltaTimer.current);
      }
    };
  }, []);

  const totalGold = goldAnim.toLocaleString("ko-KR");
  const totalPotato = potatoAnim.toLocaleString("ko-KR");

  return (
    <button
      type="button"
      className={cn(
        "group relative inline-flex items-center gap-1 rounded-xl",
        "bg-transparent text-slate-900 transition",
        "hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70",
        "disabled:pointer-events-none",
        dense ? "px-2 py-1" : "px-2.5 py-1.5",
        className,
      )}
      onClick={onClick}
      aria-label={`보유 골드 ${totalGold}, 감자 ${totalPotato}`}
    >
      <BalanceItem
        emoji="🪙"
        label="골드"
        value={totalGold}
        loading={!goldReady}
        bump={goldBump}
        delta={showDelta ? goldDelta : null}
        dense={dense}
      />

      <span className="h-5 w-px bg-slate-200/80" aria-hidden />

      <BalanceItem
        emoji="🥔"
        label="감자"
        value={totalPotato}
        loading={!potatoReady}
        bump={potatoBump}
        delta={showDelta ? potatoDelta : null}
        dense={dense}
      />
    </button>
  );
}

function BalanceItem({
  emoji,
  label,
  value,
  loading,
  bump,
  delta,
  dense,
}: {
  emoji: string;
  label: string;
  value: string;
  loading: boolean;
  bump: boolean;
  delta: number | null;
  dense: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex min-w-0 items-center gap-1.5",
        dense ? "px-1" : "px-1.5",
      )}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-lg bg-amber-50",
          dense ? "size-6 text-sm" : "size-7 text-base",
        )}
        aria-hidden
      >
        {emoji}
      </span>

      <span className="min-w-0">
        <span className="sr-only">{label}</span>
        {loading ? (
          <Skeleton className={cn("rounded-md", dense ? "h-3 w-11" : "h-4 w-14")} />
        ) : (
          <span
            className={cn(
              "block max-w-[72px] truncate text-left font-semibold tabular-nums leading-none text-slate-800",
              dense ? "text-xs" : "text-sm",
              bump && "scale-105 text-amber-700",
              "transition-transform",
            )}
          >
            {value}
          </span>
        )}
      </span>

      {delta !== null && (
        <span
          className={cn(
            "absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border px-1.5 py-0.5",
            "bg-white text-[10px] font-semibold shadow-sm",
            delta > 0
              ? "border-emerald-200 text-emerald-700"
              : "border-rose-200 text-rose-700",
          )}
          aria-hidden
        >
          {delta > 0 ? "+" : "-"}
          {Math.abs(delta).toLocaleString("ko-KR")}
        </span>
      )}
    </span>
  );
}
