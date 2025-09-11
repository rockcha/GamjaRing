// src/features/fishing/ResultDialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

/** 공통 타입 */
export type Rarity = "일반" | "희귀" | "에픽" | "전설";

/** 결과 타입 */
export type FishResult =
  | { type: "FAIL"; reason?: string }
  | {
      type: "SUCCESS";
      id: string;
      labelKo: string;
      image: string;
      rarity: Rarity;
      ingredient?: string | null;
    };

/** 카드 테두리/링 효과 */
export const RARITY_STYLE: Record<Rarity, string> = {
  일반: "border-neutral-200 shadow-sm",
  희귀: "border-sky-300 ring-1 ring-sky-200",
  에픽: "border-violet-300 ring-1 ring-violet-200",
  전설: "border-amber-400 ring-2 ring-amber-200 shadow-lg",
};

/** 등급 Pill 색상 */
export const RARITY_PILL: Record<Rarity, string> = {
  일반: "border-neutral-200 bg-neutral-50 text-neutral-700",
  희귀: "border-sky-200 bg-sky-50 text-sky-800",
  에픽: "border-violet-200 bg-violet-50 text-violet-800",
  전설: "border-amber-300 bg-amber-50 text-amber-900",
};

/** 실패 멘트(이모지 다양) */
const DEFAULT_FAIL_REASONS = [
  "🐟 힘이 너무 좋아요.머리를 털어냈어요!",
  "🪝 미끼만 사라지고 빈바늘…",
  "🌊 갑작스런 파도에 놓쳐버렸어요!",
  "🎣 타이밍이 0.3초 빨랐어요. 아깝!",
  "😵 딴청 부리다 찰나를 놓쳤어요!",
  "💤 졸음 챌린지 실패… 알림을 못 들음!",
  "🧴 선크림 묻은 손—그립이 너무 매끈했습니다.",
  "🎏 작은 새끼들은 바다로 돌려보냈어요. 다음에 보자!",
  "🪨 암초에 줄이 걸렸습니다.",
  "🌪️ 돌풍에 줄이 춤추고, 제 멘탈도 춤췄어요.",
  "☕ 커피를 흘려 놓치고 말았어요.",
  "🪢 매듭이 살짝 풀려 있었네요.",
  "🛶 배가 흔들려 각도가 망가졌어요.",
  "🐦 갈매기 난입! 시선 뺏기고 찰나를 놓쳤어요.",
] as const;

/* ----------------------------- */
/* 🎆 Epic/Legend FX (은은한 효과) */
/* ----------------------------- */
function EpicLegendFX({ rarity }: { rarity: Rarity }) {
  const reduceMotion = useReducedMotion();
  const isLegend = rarity === "전설";
  const isEpic = rarity === "에픽";
  if (!isLegend && !isEpic) return null;

  const colorFrom = isLegend ? "from-amber-300/60" : "from-violet-300/60";
  const colorTo = isLegend ? "to-amber-500/20" : "to-violet-500/20";

  return (
    <>
      {/* Pulsing glow ring (뒤) */}
      <motion.div
        aria-hidden
        className={cn(
          "absolute inset-[-10%] rounded-full blur-md bg-gradient-to-br",
          colorFrom,
          colorTo
        )}
        initial={
          reduceMotion ? { opacity: 0.25 } : { scale: 0.92, opacity: 0.35 }
        }
        animate={
          reduceMotion
            ? { opacity: 0.25 }
            : { scale: [0.92, 1.12, 0.92], opacity: [0.35, 0.22, 0.35] }
        }
        transition={{ duration: isLegend ? 1.2 : 1.0, repeat: 1 }}
        style={{ zIndex: 1 }}
      />

      {/* Sparkle burst (뒤) */}
      <SparkleBurst rarity={rarity} />

      {/* Shine sweep (위) */}
      <ShineSweep rarity={rarity} />
    </>
  );
}

function SparkleBurst({ rarity }: { rarity: Rarity }) {
  const reduceMotion = useReducedMotion();
  const isLegend = rarity === "전설";
  const isEpic = rarity === "에픽";
  if (!isLegend && !isEpic) return null;
  if (reduceMotion) return null;

  const count = isLegend ? 28 : 16;
  const icons = isLegend
    ? ["✨", "🌟", "💎", "🎉", "🐠", "👑"]
    : ["✨", "🌟", "🐠"];

  const parts = React.useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = (isLegend ? 72 : 56) + Math.random() * (isLegend ? 28 : 20);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const delay = Math.random() * 0.08;
      const dur = 0.5 + Math.random() * 0.5;
      const scale = 0.8 + Math.random() * 0.8;
      const char = icons[Math.floor(Math.random() * icons.length)];
      return { id: i, dx, dy, delay, dur, scale, char };
    });
  }, [count, icons, isLegend]);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      {parts.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-1/2 text-xl"
          initial={{ x: "-50%", y: "-50%", opacity: 0, scale: p.scale }}
          animate={{
            x: `calc(-50% + ${p.dx}px)`,
            y: `calc(-50% + ${p.dy}px)`,
            opacity: [0, 1, 0],
            rotate: 20,
          }}
          transition={{ duration: p.dur, delay: p.delay, ease: "easeOut" }} // ✅ easeOut
          style={{ willChange: "transform, opacity" }}
        >
          {p.char}
        </motion.span>
      ))}
    </div>
  );
}

function ShineSweep({ rarity }: { rarity: Rarity }) {
  const reduceMotion = useReducedMotion();
  const isLegend = rarity === "전설";
  const isEpic = rarity === "에픽";
  if (!isLegend && !isEpic) return null;

  return (
    <motion.div
      aria-hidden
      className="absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-20deg] pointer-events-none"
      initial={reduceMotion ? { opacity: 0 } : { x: "-120%", opacity: 0 }}
      animate={
        reduceMotion ? { opacity: 0 } : { x: "160%", opacity: [0, 0.35, 0] }
      }
      transition={{ duration: 1.1, ease: "easeOut", delay: 0.05 }} // ✅ easeOut
      style={{
        zIndex: 3,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.55) 50%, rgba(255,255,255,0) 100%)",
        filter: "blur(1px)",
      }}
    />
  );
}

/* ----------------------------- */

function isSuccessResult(
  res: FishResult | null
): res is Extract<FishResult, { type: "SUCCESS" }> {
  return !!res && res.type === "SUCCESS";
}

export default function ResultDialog({
  open,
  result,
  onClose,
  failReasons,
}: {
  open: boolean;
  result: FishResult | null;
  onClose: () => void;
  failReasons?: readonly string[];
}) {
  const isSuccess = isSuccessResult(result);
  const reduceMotion = useReducedMotion();

  /** 실패 멘트 선택 */
  const [failMsg, setFailMsg] = React.useState<string>("");

  React.useEffect(() => {
    if (!open) return;
    if (isSuccess) {
      setFailMsg("");
      return;
    }
    const provided = (result as Extract<FishResult, { type: "FAIL" }>)?.reason;
    if (provided && provided.trim()) {
      setFailMsg(provided);
      return;
    }
    const list = (
      failReasons?.length ? failReasons : DEFAULT_FAIL_REASONS
    ) as readonly string[];
    setFailMsg(list[Math.floor(Math.random() * list.length)]!);
  }, [open, isSuccess, failReasons, result]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
        <div className="relative p-6 pb-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={isSuccess ? "ok" : "fail"}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="relative z-[1] text-center space-y-4"
            >
              {/* 상태 배지 */}
              <div className="flex justify-center">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-sm font-semibold",
                    isSuccess
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                      : "bg-rose-50 text-rose-900 border-rose-200"
                  )}
                >
                  {isSuccess ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {isSuccess ? "낚시 성공" : "낚시 실패"}
                </span>
              </div>

              {/* 콘텐츠 */}
              {isSuccess ? (
                <div className="space-y-3">
                  <div className="relative mx-auto w-24 h-24">
                    {/* 에픽/전설 이펙트 */}
                    <EpicLegendFX rarity={result.rarity} />

                    {/* 썸네일 */}
                    <motion.img
                      src={result.image || "/aquarium/fish_placeholder.png"}
                      alt={result.labelKo}
                      className={cn(
                        "relative z-[2] mx-auto w-24 h-24 object-contain rounded-lg border bg-white",
                        RARITY_STYLE[result.rarity] // ✅ 정확한 키 타입으로 인덱싱
                      )}
                      draggable={false}
                      initial={
                        reduceMotion ? false : { scale: 0.95, opacity: 0 }
                      }
                      animate={
                        reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }
                      }
                      transition={{ duration: 0.2 }}
                    />
                  </div>

                  <div className="text-lg font-bold inline-flex items-center gap-2 justify-center">
                    {result.labelKo}
                    <span
                      className={cn(
                        "inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
                        RARITY_PILL[result.rarity] // ✅ 정확한 키 타입으로 인덱싱
                      )}
                    >
                      {result.rarity}
                    </span>
                  </div>

                  {result.ingredient && (
                    <p className="text-xs text-muted-foreground">
                      사용 재료: {result.ingredient}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-foreground">
                  {failMsg || "아쉽! 다음엔 꼭 잡자 🎣"}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* 고정 하단 닫기 버튼 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-white/60" />
          <button
            autoFocus
            onClick={onClose}
            className={cn(
              "absolute bottom-3 right-3 inline-flex items-center rounded-md",
              "border px-3 py-1.5 text-sm hover:bg-gray-50 shadow-sm"
            )}
          >
            닫기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
