// src/components/GoldDisplay.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Coins,
  MessageSquare,
  Sparkles,
  Heart,
  UtensilsCrossed,
  Info,
} from "lucide-react";
import { useCoupleContext } from "@/contexts/CoupleContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Props = {
  className?: string;
};

export default function GoldDisplay({ className = "" }: Props) {
  const { gold } = useCoupleContext();

  const [bump, setBump] = useState(false);
  const prev = useRef<number>(gold);

  // ✅ 떠오르는 델타 이펙트
  const [delta, setDelta] = useState<number | null>(null);
  const deltaTimer = useRef<number | null>(null);

  useEffect(() => {
    if (prev.current !== gold) {
      const diff = gold - prev.current;
      prev.current = gold;

      // 튕김
      setBump(true);
      window.setTimeout(() => setBump(false), 180);

      // 델타 표시
      if (diff !== 0) {
        setDelta(diff);
        // 이전 타이머 정리
        if (deltaTimer.current) {
          window.clearTimeout(deltaTimer.current);
        }
        deltaTimer.current = window.setTimeout(() => setDelta(null), 900);
      }
    }
    return () => {
      if (deltaTimer.current) window.clearTimeout(deltaTimer.current);
    };
  }, [gold]);

  const [open, setOpen] = useState(false);
  const formatted = useMemo(() => gold.toLocaleString("ko-KR"), [gold]);

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
              "px-2 py-0.5 rounded-full border shadow-sm",
              "text-xs font-semibold tabular-nums",
              "animate-[goldFloat_700ms_ease-out_forwards]",
              deltaColor,
            ].join(" ")}
            aria-hidden
          >
            🪙 {deltaText}
          </span>
        )}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className={[
            "inline-flex items-center gap-2 px-3 py-1.5 ",

            "select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
            bump ? "scale-[1.03]" : "scale-100",
            className,
          ].join(" ")}
          aria-label={`보유 골드 ${formatted}. 골드 획득 방법 보기`}
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-200">
            <Coins className="w-3.5 h-3.5 text-amber-700" />
          </div>
          <span className="text-sm font-bold text-amber-800 tabular-nums">
            {formatted}
          </span>
        </button>
      </div>

      {/* ✅ shadcn Dialog (기존 내용 그대로) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[560px] rounded-2xl p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
                <Coins className="w-5 h-5 text-amber-700" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-lg">골드 획득 방법</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="p-4 sm:p-5 space-y-4">
            <SectionItem
              icon={<MessageSquare className="w-5 h-5" />}
              title="1. 질문 답변"
              badge="+15"
              desc="오늘의 질문에 성실히 답하면 보상을 받아요. "
            />
            <SectionItem
              icon={<Sparkles className="w-5 h-5" />}
              title="2. 타로카드 확인하기"
              badge="+5"
              desc="매일 타로카드를 확인하면 소소한 골드를 지급해요. ‘초대박’이면 추가 보너스!"
            />
            <SectionItem
              icon={<Heart className="w-5 h-5" />}
              title="3. 반응 추가하기(아직 구현 예정) "
              badge="+5"
              desc="서로의 답변에 리액션을 남기면 커플 활동 점수와 함께 골드가 들어와요."
            />
            <SectionItem
              icon={<UtensilsCrossed className="w-5 h-5" />}
              title="4. 음식 공유하기"
              badge="-5~5"
              desc="직접 제작한 요리를 공유하면 랜덤 보상을 지급해요."
            />

            <div className="rounded-lg border bg-amber-50/60 px-3 py-2.5 text-amber-900 text-sm flex gap-2">
              <Info className="w-4.5 h-4.5 mt-0.5 shrink-0" />
              <p>
                모은 골드는 <b>상점</b>에서 물고기를 구매하거나, 수초/산호/장식
                아이템으로 <b>아쿠아리움 커스터마이징</b>에 사용할 수 있어요.
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
  @keyframes goldFloat {
    0% {
      opacity: 0;
      transform: translate(-50%, 0) scale(0.9);
      filter: blur(0.5px);
    }
    15% {
      opacity: 1;
      transform: translate(-50%, -6px) scale(1);
      filter: blur(0);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -18px) scale(1);
      filter: blur(0.5px);
    }
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
            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold border border-amber-200">
              {badge} 골드
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
