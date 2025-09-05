// src/components/PotatoDisplay.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Info, Sprout, Droplets, Gift } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCoupleContext } from "@/contexts/CoupleContext";

type Props = {
  className?: string;
};

export default function PotatoDisplay({ className = "" }: Props) {
  // ✅ 컨텍스트에서 전역 감자값/유틸 사용
  const { couple, potatoCount, refreshPotatoCount } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [open, setOpen] = useState(false);

  // 이펙트용 상태
  const [bump, setBump] = useState(false);
  const prev = useRef<number>(potatoCount);
  const [delta, setDelta] = useState<number | null>(null);
  const deltaTimer = useRef<number | null>(null);

  // ✅ 컨텍스트 값이 바뀌면 자동 리렌더 + 이펙트
  useEffect(() => {
    let bumpTimer: number | null = null;

    if (prev.current !== potatoCount) {
      const diff = potatoCount - prev.current;
      prev.current = potatoCount;

      setBump(true);
      bumpTimer = window.setTimeout(() => setBump(false), 180);

      if (diff !== 0) {
        setDelta(diff);
        if (deltaTimer.current) window.clearTimeout(deltaTimer.current);
        deltaTimer.current = window.setTimeout(() => setDelta(null), 900);
      }
    }

    return () => {
      if (bumpTimer) window.clearTimeout(bumpTimer);
      if (deltaTimer.current) window.clearTimeout(deltaTimer.current);
    };
  }, [potatoCount]);

  useEffect(() => {
    if (!coupleId) return;
    let called = false;
    if (!called) {
      called = true;
      void refreshPotatoCount?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  const formatted = useMemo(
    () => potatoCount.toLocaleString("ko-KR"),
    [potatoCount]
  );

  const deltaText =
    delta === null
      ? ""
      : `${delta > 0 ? "+" : ""}${delta.toLocaleString("ko-KR")}`;

  const deltaColor =
    delta === null
      ? ""
      : delta > 0
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : "text-rose-700 bg-rose-50 border-rose-200";

  const disabled = !coupleId;

  return (
    <>
      {/* 상대 배치용 래퍼 */}
      <div className="relative inline-block">
        {/* 떠오르는 델타 배지 */}
        {delta !== null && (
          <span
            className={[
              "pointer-events-none absolute left-1/2 -translate-x-1/2",
              "-top-3 sm:-top-4",
              "px-2 rounded-full border shadow-sm",
              "text-xs font-semibold tabular-nums",
              "animate-[potatoFloat_700ms_ease-out_forwards]",
              deltaColor,
            ].join(" ")}
            aria-hidden
          >
            🥔 {deltaText}
          </span>
        )}

        <button
          type="button"
          onClick={() => !disabled && setOpen(true)}
          className={[
            "inline-flex items-center gap-2 px-3 py-1.5",
            "select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
            disabled
              ? "opacity-60 cursor-not-allowed"
              : bump
              ? "scale-[1.03]"
              : "scale-100",
            className,
          ].join(" ")}
          aria-label={
            disabled
              ? "커플 정보가 없어 감자 정보를 볼 수 없어요."
              : `보유 감자 ${formatted}. 감자 획득 방법 보기`
          }
          disabled={disabled}
        >
          <div className="flex items-center justify-center w-6 h-6 ">
            <span className="text-sm leading-none">🥔</span>
          </div>
          <span className="text-sm font-bold text-amber-800 tabular-nums">
            {formatted}
          </span>
        </button>
      </div>

      {/* 안내 Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[560px] rounded-2xl p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
                <Sprout className="w-5 h-5 text-amber-700" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-lg">
                  감자(🥔) 획득 방법
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="p-4 sm:p-5 space-y-4">
            <SectionItem
              icon={<Sprout className="w-5 h-5" />}
              title="1. 씨앗 심기 & 수확"
              badge="+랜덤"
              desc="감자밭에 씨앗을 심고 일정 시간이 지나면 수확할 수 있어요. 연속 수확 보너스가 적용될 수 있어요."
            />
            <SectionItem
              icon={<Droplets className="w-5 h-5" />}
              title="2. 물 주기 미션"
              badge="+소량"
              desc="정해진 간격으로 밭에 물을 주면 소소한 감자를 보상으로 줍니다."
            />
            <SectionItem
              icon={<Gift className="w-5 h-5" />}
              title="3. 특별 이벤트"
              badge="+변동"
              desc="기간 한정 이벤트나 퀘스트 달성 시 추가 감자를 획득할 수 있어요."
            />

            <div className="rounded-lg border bg-amber-50/60 px-3 py-2.5 text-amber-900 text-sm flex gap-2">
              <Info className="w-4.5 h-4.5 mt-0.5 shrink-0" />
              <p>
                모은 감자는 <b>요리 재료</b>로 쓰거나, <b>재료 구매</b>시 사용할
                수 있어요.
              </p>
            </div>
          </div>

          <DialogFooter className="p-4 border-t">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm"
            >
              닫기
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 키프레임 정의 */}
      <style>{`
        @keyframes potatoFloat {
          0% { opacity: 0; transform: translate(-50%, 0) scale(0.9); filter: blur(0.5px); }
          15% { opacity: 1; transform: translate(-50%, -6px) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translate(-50%, -18px) scale(1); filter: blur(0.5px); }
        }
      `}</style>
    </>
  );
}

/** 리스트 아이템(아이콘 + 타이틀 + 배지 + 설명) */
function SectionItem({
  icon,
  title,
  badge,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border p-3 hover:bg-slate-50 transition-colors">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{title}</h4>
          {badge && (
            <span className="inline-flex items-center text-amber-800 px-2 py-0.5 text-xs font-semibold border border-amber-200">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
