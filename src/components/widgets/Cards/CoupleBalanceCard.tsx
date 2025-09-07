// src/components/CoupleBalanceCard.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useCoupleContext } from "@/contexts/CoupleContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import AvatarWidget from "@/components/widgets/AvatarWidget";

/* ───────────────────────────────────────────────────────────
   Hook: 부드러운 카운트업(숫자 보간)
   ─────────────────────────────────────────────────────────── */
function useAnimatedNumber(value: number, duration = 280) {
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
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return display;
}

/* ───────────────────────────────────────────────────────────
   Component
   ─────────────────────────────────────────────────────────── */
type CoupleBalanceCardProps = {
  className?: string;
  dense?: boolean; // 더 컴팩트하게
  showDelta?: boolean; // +N/-N 떠오르는 배지
  showTooltip?: boolean; // 툴팁 표시
  onClick?: () => void; // 카드 클릭
};

export default function CoupleBalanceCard({
  className,
  dense = false,
  showDelta = true,
  showTooltip = true,
  onClick,
}: CoupleBalanceCardProps) {
  const { gold, potatoCount } = useCoupleContext() as {
    gold?: number;
    potatoCount?: number;
  };

  const isLoading = typeof gold !== "number" || typeof potatoCount !== "number";
  const goldSafe = typeof gold === "number" ? gold : 0;
  const potatoSafe = typeof potatoCount === "number" ? potatoCount : 0;

  // 애니메이션 숫자
  const goldAnim = useAnimatedNumber(goldSafe);
  const potatoAnim = useAnimatedNumber(potatoSafe);

  // 바운스 & 델타
  const [goldBump, setGoldBump] = React.useState(false);
  const [potatoBump, setPotatoBump] = React.useState(false);
  const prevGold = React.useRef(goldSafe);
  const prevPotato = React.useRef(potatoSafe);

  const [goldDelta, setGoldDelta] = React.useState<number | null>(null);
  const [potatoDelta, setPotatoDelta] = React.useState<number | null>(null);
  const goldDeltaTimer = React.useRef<number | null>(null);
  const potatoDeltaTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!isLoading && prevGold.current !== goldSafe) {
      const diff = goldSafe - prevGold.current;
      prevGold.current = goldSafe;

      setGoldBump(true);
      window.setTimeout(() => setGoldBump(false), 180);

      if (showDelta && diff !== 0) {
        setGoldDelta(diff);
        if (goldDeltaTimer.current) window.clearTimeout(goldDeltaTimer.current);
        goldDeltaTimer.current = window.setTimeout(
          () => setGoldDelta(null),
          900
        );
      }
    }
    return () => {
      if (goldDeltaTimer.current) window.clearTimeout(goldDeltaTimer.current);
    };
  }, [goldSafe, isLoading, showDelta]);

  React.useEffect(() => {
    if (!isLoading && prevPotato.current !== potatoSafe) {
      const diff = potatoSafe - prevPotato.current;
      prevPotato.current = potatoSafe;

      setPotatoBump(true);
      window.setTimeout(() => setPotatoBump(false), 180);

      if (showDelta && diff !== 0) {
        setPotatoDelta(diff);
        if (potatoDeltaTimer.current)
          window.clearTimeout(potatoDeltaTimer.current);
        potatoDeltaTimer.current = window.setTimeout(
          () => setPotatoDelta(null),
          900
        );
      }
    }
    return () => {
      if (potatoDeltaTimer.current)
        window.clearTimeout(potatoDeltaTimer.current);
    };
  }, [potatoSafe, isLoading, showDelta]);

  const cardCls = cn(
    "relative rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition",
    dense ? "p-2.5" : "p-3 sm:p-3.5",
    onClick &&
      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
    className
  );

  const lineCls = (bump: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 transition-transform will-change-transform",
      bump ? "scale-[1.03]" : "scale-100"
    );

  // 숫자: 살짝 더 작게
  const numCls =
    "font-semibold tabular-nums text-amber-900 text-[13px] sm:text-sm leading-none";

  // 델타 배지 공통
  const badgeBase =
    "absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full border shadow-sm text-[11px] font-semibold tabular-nums animate-[floatUp_800ms_ease-out_forwards]";
  const goldBadgeTone =
    goldDelta && goldDelta > 0
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-rose-50 text-rose-700 border-rose-200";
  const potatoBadgeTone =
    potatoDelta && potatoDelta > 0
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  // 툴팁 컴포넌트 스위칭
  const TT = showTooltip ? TooltipProvider : (React.Fragment as any);
  const Wrap = showTooltip ? Tooltip : (React.Fragment as any);
  const Trg = showTooltip ? TooltipTrigger : (React.Fragment as any);
  const Cnt = showTooltip ? TooltipContent : (React.Fragment as any);

  return (
    <TT>
      <Wrap>
        <Trg asChild>
          <div
            className={cardCls}
            role={onClick ? "button" : "group"}
            tabIndex={onClick ? 0 : -1}
            onClick={onClick}
            aria-label="보유 골드와 감자 정보"
          >
            {/* 델타 배지: 골드 */}
            {showDelta && goldDelta !== null && (
              <span
                className={cn(
                  badgeBase,
                  goldBadgeTone,
                  dense ? "-top-3" : "-top-3.5 sm:-top-4"
                )}
                aria-hidden
              >
                🪙 {goldDelta > 0 ? "+" : ""}
                {goldDelta.toLocaleString("ko-KR")}
              </span>
            )}

            {/* 델타 배지: 감자 (골드와 겹치지 않게 조금 더 아래) */}
            {showDelta && potatoDelta !== null && (
              <span
                className={cn(
                  badgeBase,
                  potatoBadgeTone,
                  dense ? "top-8" : "top-9 sm:top-10"
                )}
                aria-hidden
              >
                🥔 {potatoDelta > 0 ? "+" : ""}
                {potatoDelta.toLocaleString("ko-KR")}
              </span>
            )}

            <div className="flex items-center gap-3">
              {/* 좌측: 아바타 (계정 아이콘 대체) */}
              <AvatarWidget size="sm" />

              {/* 우측: 두 줄 (골드 / 감자) */}
              <div className="flex flex-col justify-center min-w-0">
                {/* 골드 줄 */}
                <div
                  className={lineCls(goldBump)}
                  aria-label={`보유 골드 ${goldAnim.toLocaleString("ko-KR")}`}
                >
                  <span className="leading-none">🪙</span>
                  {isLoading ? (
                    <Skeleton className="h-3.5 w-14" />
                  ) : (
                    <span className={numCls}>
                      {goldAnim.toLocaleString("ko-KR")}
                    </span>
                  )}
                </div>

                {/* 감자 줄 */}
                <div
                  className={cn(lineCls(potatoBump), "mt-0.5")}
                  aria-label={`보유 감자 ${potatoAnim.toLocaleString("ko-KR")}`}
                >
                  <span className="leading-none">🥔</span>
                  {isLoading ? (
                    <Skeleton className="h-3.5 w-14" />
                  ) : (
                    <span className={numCls}>
                      {potatoAnim.toLocaleString("ko-KR")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 키프레임 */}
            <style>{`
              @keyframes floatUp {
                0%   { opacity: 0; transform: translate(-50%, 0) scale(0.9); filter: blur(0.3px); }
                15%  { opacity: 1; transform: translate(-50%, -6px) scale(1);   filter: blur(0); }
                100% { opacity: 0; transform: translate(-50%, -18px) scale(1);  filter: blur(0.3px); }
              }
            `}</style>
          </div>
        </Trg>

        {showTooltip && (
          <Cnt side="bottom" align="center" className="max-w-[220px] text-xs">
            <div className="space-y-1">
              <div>
                <b className="text-amber-800">🪙 골드</b>: 상점/시설에 사용해요.
              </div>
              <div>
                <b className="text-amber-800">🥔 감자</b>: 재료/요리/이벤트 보상
                등으로 활용돼요.
              </div>
            </div>
          </Cnt>
        )}
      </Wrap>
    </TT>
  );
}
