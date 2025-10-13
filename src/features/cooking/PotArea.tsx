// src/features/cooking/PotArea.tsx
"use client";

import * as React from "react";
import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { type IngredientTitle, INGREDIENTS } from "@/features/cooking/type";
import {
  COOK_TARGET_MIN,
  COOK_TARGET_MAX,
} from "@/features/cooking/cookingRules";
import { onPotEvent } from "@/features/cooking/potEventBus";
import { Button } from "@/components/ui/button";
import DonutDistribution from "./DonutDistribution";

/* ──────────────────────────────────────────────────────────────
   타입 & 고정값
────────────────────────────────────────────────────────────── */
type PotCounts = Record<IngredientTitle, number>;
type CookResult = { success: boolean; name: string; emoji: string } | null;

const REQUIRED_COUNT_MARK = 10;

/* 요리 액션(예시) */
const COOK_ACTIONS = [
  { key: "oil", label: "식용유 넣기", gif: "/cooking/oil.gif" },
  { key: "parsley", label: "파슬리 넣기", gif: "/cooking/parsley.gif" },
  { key: "mix", label: "잘 섞기", gif: "/cooking/mix.gif" },
  { key: "chop", label: "재료 잘 썰기", gif: "/cooking/chop.gif" },
  { key: "heat", label: "가열하기", gif: "/cooking/heat.gif" },
  { key: "season", label: "간 맞추기", gif: "/cooking/season.gif" },
  { key: "stirfry", label: "재료 볶기", gif: "/cooking/stirfry.gif" },
  { key: "oven", label: "오븐에 돌리기", gif: "/cooking/oven.gif" },
  { key: "stock", label: "육수 추가하기", gif: "/cooking/stock.gif" },
  { key: "simmer", label: "푹 찌기", gif: "/cooking/simmer.gif" },
];

/* ──────────────────────────────────────────────────────────────
   메인
────────────────────────────────────────────────────────────── */
export default function PotArea({
  total,
  canCook,
  counts,
  onRemoveOne,
  onCook,
  onReset,
}: {
  total: number;
  canCook: boolean;
  counts: PotCounts;
  onRemoveOne?: (title: IngredientTitle) => void;
  onCook?: () => void;
  onReset?: () => void;
}) {
  /* 중앙 GIF (액션/idle/요리중) */
  const [centerGif, setCenterGif] = useState<{
    src: string;
    key: number;
  } | null>(null);

  /* 제어 상태 */
  const [isActing, setIsActing] = useState(false);
  const [hasActed, setHasActed] = useState(false);
  const [isCooking, setIsCooking] = useState(false);
  const [cookResult, setCookResult] = useState<CookResult>(null);

  /* 타이머 refs */
  const fxTimeoutRef = useRef<number | null>(null);
  const resultTimeoutRef = useRef<number | null>(null);
  const cookTimeoutRef = useRef<number | null>(null);

  /* 10개 달성 감지 → 키 증가(이펙트 트리거) */
  const prevTotalRef = useRef<number>(total);
  const [milestonePulseKey, setMilestonePulseKey] = useState<number>(0);
  const [justHit10, setJustHit10] = useState(false); // 10개 달성 배지 잠깐 노출

  useEffect(() => {
    const prev = prevTotalRef.current;
    if (prev < REQUIRED_COUNT_MARK && total >= REQUIRED_COUNT_MARK) {
      setMilestonePulseKey((k) => k + 1);
      setJustHit10(true);
      window.setTimeout(() => setJustHit10(false), 1400);
    }
    prevTotalRef.current = total;
  }, [total]);

  /* 새로 추가된 개수만 하이라이트 */
  const prevCountsRef = useRef<PotCounts | null>(null);
  const [highlightCountMap, setHighlightCountMap] = useState<
    Record<IngredientTitle, number>
  >({});
  useEffect(() => {
    const prev = prevCountsRef.current;
    const nextMap: Record<IngredientTitle, number> = {};
    if (prev) {
      for (const ing of INGREDIENTS) {
        const t = ing.title as IngredientTitle;
        const delta = (counts[t] ?? 0) - (prev[t] ?? 0);
        if (delta > 0) nextMap[t] = delta;
      }
    }
    setHighlightCountMap(nextMap);
    prevCountsRef.current = { ...counts };
  }, [counts]);

  /* 결과 수신 */
  useEffect(() => {
    const off = onPotEvent((ev) => {
      if (ev.type === "cookResult") {
        setCookResult({
          success: !!ev.success,
          name: ev.name ?? "",
          emoji: ev.emoji ?? "🍽️",
        });

        if (cookTimeoutRef.current) {
          clearTimeout(cookTimeoutRef.current);
          cookTimeoutRef.current = null;
        }
        setIsCooking(false);
        setHasActed(false);

        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
        resultTimeoutRef.current = window.setTimeout(
          () => setCookResult(null),
          1200
        );
      }
    });

    return () => {
      off();
      if (fxTimeoutRef.current) clearTimeout(fxTimeoutRef.current);
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
      if (cookTimeoutRef.current) clearTimeout(cookTimeoutRef.current);
    };
  }, []);

  /* title → color */
  const colorMap = useMemo(() => {
    const m = {} as Record<IngredientTitle, string>;
    for (const ing of INGREDIENTS) m[ing.title] = ing.color ?? "#ddd";
    return m;
  }, []);

  const titlesInOrder = useMemo(
    () => Object.keys(counts) as IngredientTitle[],
    [counts]
  );

  /* 액션: 1.2s */
  const handleAction = (gifSrc: string) => {
    if (total < REQUIRED_COUNT_MARK || isActing || isCooking) return;
    setIsActing(true);
    setHasActed(true);
    setCenterGif({ src: gifSrc, key: Date.now() });

    if (fxTimeoutRef.current) clearTimeout(fxTimeoutRef.current);
    fxTimeoutRef.current = window.setTimeout(() => {
      setCenterGif(null);
      setIsActing(false);
    }, 1200);
  };

  /* 요리 완성 */
  const handleCookFinish = () => {
    // 조건: 재료 10개 이상 + 액션 1회 이상
    if (
      !(total >= REQUIRED_COUNT_MARK && hasActed) ||
      isActing ||
      isCooking ||
      !canCook
    )
      return;
    setIsCooking(true);
    onCook?.();

    if (cookTimeoutRef.current) clearTimeout(cookTimeoutRef.current);
    cookTimeoutRef.current = window.setTimeout(() => {
      setIsCooking(false);
      cookTimeoutRef.current = null;
    }, 4000);
  };

  /* 초기화 */
  const handleResetAll = () => {
    if (isActing || isCooking) return;
    onReset?.();
    setCenterGif(null);
    setCookResult(null);
    setHasActed(false);
    setIsActing(false);
    setIsCooking(false);
    setHighlightCountMap({});
    if (fxTimeoutRef.current) clearTimeout(fxTimeoutRef.current);
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    if (cookTimeoutRef.current) clearTimeout(cookTimeoutRef.current);
    fxTimeoutRef.current =
      resultTimeoutRef.current =
      cookTimeoutRef.current =
        null;
  };

  const interactionLocked = isActing || isCooking;
  const hasEnough = total >= REQUIRED_COUNT_MARK;

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-white p-5 shadow-sm",
        "border-neutral-200 transition-colors"
      )}
      aria-label="요리 냄비 영역"
    >
      {/* 상단 요구조건 체크리스트 + 진행바 */}
      <div className="space-y-3">
        <RequirementChecklist
          hasEnough={hasEnough}
          needed={Math.max(0, REQUIRED_COUNT_MARK - total)}
          hasActed={hasActed}
        />
        <div className="rounded-xl bg-white p-3 ring-1 ring-neutral-200">
          <PotProgressBar
            total={total}
            min={COOK_TARGET_MIN}
            max={COOK_TARGET_MAX}
            requiredMark={REQUIRED_COUNT_MARK}
            milestonePulseKey={milestonePulseKey}
          />
        </div>
      </div>

      {/* 10개 달성 즉시 배지 + 미세 콘페티 */}
      <AnimatePresence>
        {justHit10 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.24 }}
            className="mt-3 grid place-items-center"
          >
            <div className="rounded-full bg-emerald-600/90 text-white px-3 py-1 text-xs shadow-sm">
              재료 10개 달성! 요리 액션을 1회 수행하면 완성할 수 있어요.
            </div>
            <ConfettiMini centerYOffset={-6} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 도넛(좌) + 현재 재료(우) + 결과 이펙트 */}
      <div className="mt-4">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-6 md:flex-row md:items-start">
          <div className="relative">
            <DonutDistribution
              counts={counts}
              total={total}
              size={260}
              stroke={20}
              centerGif={centerGif}
              idleGifSrc="/cooking/default.gif"
            />
            <CookResultOverlay result={cookResult} />
          </div>

          {/* 현재 넣은 재료 */}
          <div className="w-full max-w-[320px] md:w-[320px]">
            <div className="mb-2 text-center md:text-left text-sm font-medium text-neutral-700">
              넣은 재료
            </div>

            <div className="flex flex-wrap gap-2">
              {titlesInOrder.map((title) => {
                const qty = counts[title] ?? 0;
                if (!qty) return null;

                const hlN = highlightCountMap[title] ?? 0;
                return Array.from({ length: qty }).map((_, idx) => {
                  const isHighlighted = idx >= qty - hlN;
                  const key = `${title}-${idx}-${isHighlighted ? "hl" : "n"}`;
                  const emoji =
                    INGREDIENTS.find((i) => i.title === title)?.emoji ?? "❓";

                  return (
                    <motion.button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (interactionLocked) return;
                        onRemoveOne?.(title);
                      }}
                      disabled={interactionLocked}
                      initial={isHighlighted ? { scale: 0.96 } : false}
                      animate={
                        isHighlighted ? { scale: [0.96, 1.02, 1.0] } : {}
                      }
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className={cn(
                        "relative grid h-10 w-10 place-items-center rounded-xl",
                        "border border-neutral-200 bg-white text-xl",
                        "transition",
                        interactionLocked
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-neutral-50 active:scale-[0.98]"
                      )}
                      title={
                        interactionLocked
                          ? "진행 중에는 불가해요."
                          : "클릭하면 1개 빼기"
                      }
                      aria-label={`${title} 1개 제거`}
                    >
                      <span
                        className="pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full ring-1 ring-white/80 opacity-90"
                        style={{ backgroundColor: colorMap[title] ?? "#ddd" }}
                        aria-hidden
                      />
                      {emoji}
                    </motion.button>
                  );
                });
              })}
            </div>
          </div>
        </div>

        {/* 액션 영역 */}
        <div className="mx-auto mt-6 w-full max-w-3xl">
          <div className="mb-2 text-center text-sm font-medium text-neutral-700">
            요리 액션 (최소 1회 필요)
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {COOK_ACTIONS.map((a) => (
              <Button
                key={a.key}
                size="sm"
                variant="outline"
                onClick={() => handleAction(a.gif)}
                disabled={!hasEnough || interactionLocked}
                className={cn(
                  "rounded-full",
                  (!hasEnough || interactionLocked) &&
                    "opacity-70 cursor-not-allowed"
                )}
                title={
                  !hasEnough
                    ? "재료를 10개 이상 넣으면 사용할 수 있어요."
                    : interactionLocked
                    ? "진행 중입니다."
                    : a.label
                }
              >
                {a.label}
              </Button>
            ))}
          </div>

          {/* 하단 액션 버튼 */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetAll}
              disabled={interactionLocked}
              className={cn(
                "rounded-lg",
                interactionLocked && "opacity-70 cursor-not-allowed"
              )}
            >
              재료 비우기
            </Button>

            <div className="relative">
              <Button
                size="sm"
                variant={
                  hasEnough && hasActed && !interactionLocked
                    ? "default"
                    : "outline"
                }
                disabled={
                  !(hasEnough && hasActed) || interactionLocked || !canCook
                }
                onClick={handleCookFinish}
                className={cn(
                  "rounded-lg",
                  (!(hasEnough && hasActed) || interactionLocked) &&
                    "opacity-80"
                )}
                title={
                  !hasEnough
                    ? "재료 10개가 필요해요."
                    : !hasActed
                    ? "요리 액션을 1회 이상 수행해야 해요."
                    : interactionLocked
                    ? "진행 중에는 완료할 수 없어요."
                    : "요리 완성"
                }
              >
                {isCooking ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-400/60 border-t-transparent" />
                    요리중…
                  </span>
                ) : (
                  "요리 완성"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 결과 오버레이는 별도 컴포넌트로 */}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   요구조건 체크리스트 (10개/액션)
────────────────────────────────────────────────────────────── */
function RequirementChecklist({
  hasEnough,
  needed,
  hasActed,
}: {
  hasEnough: boolean;
  needed: number;
  hasActed: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {/* 좌: 남은 개수 메시지 */}
      <motion.div
        key={`need-${needed}-${hasEnough}`}
        initial={{ opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-md px-2.5 py-1 text-[12px] tabular-nums",
          hasEnough
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-800",
          "ring-1",
          hasEnough ? "ring-emerald-200/70" : "ring-amber-200/70"
        )}
      >
        {hasEnough ? "재료 10개 충족" : `10개까지 ${needed}개 남음`}
      </motion.div>

      {/* 우: 체크 칩 2개 (10개 / 액션1회) */}
      <div className="flex items-center gap-2">
        <CheckChip ok={hasEnough} okText="재료 10개" nokText="재료 10개 필요" />
        <CheckChip
          ok={hasActed}
          okText="액션 1회 완료"
          nokText="액션 1회 필요"
        />
      </div>
    </div>
  );
}

function CheckChip({
  ok,
  okText,
  nokText,
}: {
  ok: boolean;
  okText: string;
  nokText: string;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ scale: ok ? 1 : 1 }}
      key={`${ok}-${okText}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ring-1",
        ok
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200/70"
          : "bg-neutral-50 text-neutral-700 ring-neutral-200"
      )}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          ok ? "bg-emerald-500" : "bg-neutral-400"
        )}
      />
      {ok ? okText : nokText}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────
   상단 10칸 세그먼트 진행바 (미니멀 + 10개 마커 FX)
────────────────────────────────────────────────────────────── */
function PotProgressBar({
  total,
  min,
  max,
  segments = 10,
  requiredMark,
  milestonePulseKey,
}: {
  total: number;
  min: number;
  max: number;
  segments?: number;
  requiredMark?: number;
  milestonePulseKey?: number;
}) {
  const pct = Math.max(0, Math.min(1, total / max));
  const segs = Array.from({ length: segments }, (_, i) => i);
  const perSeg = max / segments;
  const thumbLeft = `${pct * 100}%`;
  const goodStart = Math.max(0, Math.min(1, min / max)) * 100;
  const requiredPct = requiredMark
    ? Math.max(0, Math.min(1, requiredMark / max)) * 100
    : null;

  return (
    <div className="w-full">
      <div className="relative">
        {/* 적정 범위 하이라이트 */}
        <div
          className="absolute inset-y-0 rounded-xl"
          style={{
            left: `${goodStart}%`,
            width: `${100 - goodStart}%`,
            background: "rgba(22,163,74,0.08)", // emerald-600 @ 8%
          }}
        />

        {/* 10개 지점 마커 + 펄스 + "10" 라벨 */}
        {requiredPct !== null && (
          <>
            <div
              className="absolute inset-y-0"
              style={{
                left: `${requiredPct}%`,
                width: 0,
                borderLeft: "2px dashed rgba(0,0,0,0.14)",
              }}
            />
            <div
              className="absolute -bottom-5 -translate-x-1/2 text-[10px] text-neutral-600"
              style={{ left: `${requiredPct}%` }}
            >
              <div
                className="mx-auto h-0 w-0"
                style={{
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "6px solid rgba(0,0,0,0.25)",
                }}
              />
              <div className="mt-0.5 tabular-nums">10개</div>
            </div>

            <MilestonePulse
              key={`ms-${milestonePulseKey}`}
              leftPct={requiredPct}
            />
          </>
        )}

        {/* 세그먼트 바 (단색) */}
        <div
          className={cn(
            "relative grid overflow-hidden rounded-xl ring-1 ring-neutral-200"
          )}
          style={{
            gridTemplateColumns: `repeat(${segments}, 1fr)`,
            height: 16,
            background: "#FAFAFA",
          }}
        >
          {segs.map((i) => {
            const frac =
              total >= (i + 1) * perSeg
                ? 1
                : total <= i * perSeg
                ? 0
                : (total - i * perSeg) / perSeg;
            return (
              <div
                key={i}
                className="relative h-full border-r border-neutral-200 last:border-r-0"
              >
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: frac }}
                  transition={{
                    type: "tween",
                    duration: 0.18,
                    delay: i * 0.015,
                  }}
                  className="origin-left h-full"
                  style={{ background: "#F59E0B" }} // amber-500
                />
              </div>
            );
          })}
        </div>

        {/* 현재값 배지(thumb) */}
        <motion.div
          initial={false}
          animate={{ left: thumbLeft }}
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 28,
            mass: 0.4,
          }}
          className="absolute -top-6"
          style={{ translateX: "-50%" }}
        >
          <div className="select-none rounded-md bg-neutral-900 text-white px-2 py-0.5 text-[11px] tabular-nums shadow-sm">
            <span className="font-semibold">{total}</span>/{max}
          </div>
          <div className="mx-auto h-2 w-[2px] rounded bg-neutral-800/70" />
        </motion.div>
      </div>

      {/* 라벨 */}
      <div className="mt-1 flex justify-between text-[10px] text-neutral-600">
        <span>0</span>
        <span className="tabular-nums">max {max}</span>
      </div>
    </div>
  );
}

function MilestonePulse({ leftPct }: { leftPct: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute top-1/2 h-6 w-6 -translate-y-1/2 -translate-x-1/2 rounded-full"
      style={{
        left: `${leftPct}%`,
        background:
          "radial-gradient(rgba(16,185,129,0.18), rgba(16,185,129,0))",
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1.4, opacity: [0, 1, 0] }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────
   결과 오버레이 (미니멀)
────────────────────────────────────────────────────────────── */
function CookResultOverlay({ result }: { result: CookResult }) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          key={`cook-result-${result.name}-${result.success}`}
          initial={{ opacity: 0, scale: 0.98, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 4 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          {result.success ? <ConfettiMini /> : <FailSmokeMini />}

          <motion.div
            className={cn(
              "rounded-xl px-3 py-2 text-center bg-white/90 backdrop-blur-sm shadow-sm"
            )}
          >
            <div className="text-2xl">{result.emoji}</div>
            <div className="mt-0.5 text-xs font-medium text-neutral-800">
              {result.name}
            </div>
            <div
              className={cn(
                "mt-0.5 text-[11px]",
                result.success ? "text-emerald-700" : "text-red-600"
              )}
            >
              {result.success ? "성공!" : "실패"}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* 작은 콘페티 (10개 달성/성공 공용) */
function ConfettiMini({ centerYOffset = 0 }: { centerYOffset?: number }) {
  const dots = Array.from({ length: 12 });
  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{ pointerEvents: "none" }}
    >
      {dots.map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{
            background: i % 2 ? "#10B981" : "#F59E0B",
            top: `calc(50% + ${centerYOffset}px)`,
          }}
          initial={{ opacity: 0, scale: 0.7, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.7, 1, 0.9],
            x: 28 * Math.cos((i / dots.length) * Math.PI * 2),
            y: 28 * Math.sin((i / dots.length) * Math.PI * 2),
          }}
          transition={{ duration: 0.48, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/* 실패: 짧은 연무 */
function FailSmokeMini() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <motion.div
        initial={{ opacity: 0.0, scale: 0.9 }}
        animate={{ opacity: [0, 0.5, 0], scale: [0.9, 1.08, 1.14] }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-2xl"
      >
        💨
      </motion.div>
    </div>
  );
}
