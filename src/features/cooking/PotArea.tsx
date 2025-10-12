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

type PotCounts = Record<IngredientTitle, number>;

const REQUIRED_COUNT_MARK = 10;

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

type CookResult = { success: boolean; name: string; emoji: string } | null;

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
  // 중앙 GIF (액션/idle/요리중)
  const [centerGif, setCenterGif] = useState<{
    src: string;
    key: number;
  } | null>(null);

  // 제어 상태
  const [isActing, setIsActing] = useState(false);
  const [hasActed, setHasActed] = useState(false);
  const [isCooking, setIsCooking] = useState(false);

  const [cookResult, setCookResult] = useState<CookResult>(null);

  // 타이머 refs
  const fxTimeoutRef = useRef<number | null>(null);
  const resultTimeoutRef = useRef<number | null>(null);
  const cookTimeoutRef = useRef<number | null>(null);

  // 진행바 10개 달성 이펙트 트리거
  const prevTotalRef = useRef<number>(total);
  const [milestonePulseKey, setMilestonePulseKey] = useState<number>(0);

  useEffect(() => {
    const prev = prevTotalRef.current;
    if (prev < REQUIRED_COUNT_MARK && total >= REQUIRED_COUNT_MARK) {
      setMilestonePulseKey((k) => k + 1);
    }
    prevTotalRef.current = total;
  }, [total]);

  // 새로 추가된 개수만 하이라이트하기 위한 계산
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
        const prevQty = prev[t] ?? 0;
        const nowQty = counts[t] ?? 0;
        const delta = nowQty - prevQty;
        if (delta > 0) nextMap[t] = delta; // 이번에 늘어난 개수만 표시
      }
    }
    setHighlightCountMap(nextMap);
    prevCountsRef.current = { ...counts };
  }, [counts]);

  // 결과/이벤트 버스 수신
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
          1800
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

  /** title → color 매핑 */
  const colorMap = useMemo(() => {
    const m = {} as Record<IngredientTitle, string>;
    for (const ing of INGREDIENTS) m[ing.title] = ing.color ?? "#ddd";
    return m;
  }, []);

  // 버튼 렌더링용 리스트(타이틀별 묶음)
  const titlesInOrder = useMemo(
    () => Object.keys(counts) as IngredientTitle[],
    [counts]
  );

  // 액션 클릭 → 중앙 GIF 2초
  const handleAction = (gifSrc: string) => {
    if (total < REQUIRED_COUNT_MARK || isActing || isCooking) return;
    setIsActing(true);
    setHasActed(true);
    setCenterGif({ src: gifSrc, key: Date.now() });

    if (fxTimeoutRef.current) clearTimeout(fxTimeoutRef.current);
    fxTimeoutRef.current = window.setTimeout(() => {
      setCenterGif(null);
      setIsActing(false);
    }, 2000);
  };

  // 요리 완성
  const handleCookFinish = () => {
    if (!canCook || !hasActed || isActing || isCooking) return;
    setIsCooking(true);
    onCook?.();

    if (cookTimeoutRef.current) clearTimeout(cookTimeoutRef.current);
    cookTimeoutRef.current = window.setTimeout(() => {
      setIsCooking(false); // 페일세이프
      cookTimeoutRef.current = null;
    }, 6000);
  };

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

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-white p-5",
        "transition-colors"
      )}
      aria-label="요리 냄비 영역"
    >
      {/* 상단 진행바 */}
      <div className="sticky -top-5 z-10 bg-white/90 pb-3">
        <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200/60">
          <PotProgressBar
            total={total}
            min={COOK_TARGET_MIN}
            max={COOK_TARGET_MAX}
            requiredMark={REQUIRED_COUNT_MARK}
            milestonePulseKey={milestonePulseKey}
          />
        </div>
      </div>

      {/* 도넛(좌) + 현재 재료(우) + 결과 이펙트 */}
      <div className="mt-4">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-6 md:flex-row md:items-start">
          <div className="relative">
            <DonutDistribution
              counts={counts}
              total={total}
              size={240}
              stroke={22}
              centerGif={centerGif} // 액션 중이면 액션 GIF, 아니면 idle GIF
              idleGifSrc="/cooking/default.gif"
            />
            <CookResultOverlay result={cookResult} />
          </div>

          {/* 현재 넣은 재료 (새로 추가된 개수만 빛남) */}
          <div className="w-full max-w-[320px] md:w-[320px]">
            <div className="mb-2 text-center md:text-left text-sm font-medium text-amber-900">
              넣은 재료
            </div>

            <div className="flex flex-wrap gap-2">
              {titlesInOrder.map((title) => {
                const qty = counts[title] ?? 0;
                if (!qty) return null;

                // 이번 렌더에서 새로 추가된 개수
                const hlN = highlightCountMap[title] ?? 0;
                // 각 타이틀 그룹을 0..qty-1 로 렌더 → 마지막 hlN 개만 하이라이트
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
                      initial={
                        isHighlighted
                          ? {
                              scale: 0.88,
                              boxShadow: "0 0 0 rgba(16,185,129,0)",
                            }
                          : false
                      }
                      animate={
                        isHighlighted
                          ? {
                              scale: [0.88, 1.08, 1.0],
                              boxShadow: [
                                "0 0 0 rgba(16,185,129,0)",
                                "0 0 24px rgba(16,185,129,0.28)",
                                "0 0 0 rgba(16,185,129,0)",
                              ],
                            }
                          : {}
                      }
                      transition={{ duration: isHighlighted ? 0.55 : 0.2 }}
                      className={cn(
                        "relative grid h-10 w-10 place-items-center rounded-xl",
                        "border border-amber-200 bg-white text-xl",
                        "transition",
                        interactionLocked
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-amber-50 active:scale-[0.98]"
                      )}
                      title={
                        interactionLocked
                          ? "진행 중에는 불가해요."
                          : "클릭하면 1개 빼기"
                      }
                      aria-label={`${title} 1개 제거`}
                    >
                      <span
                        className="pointer-events-none absolute right-1 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white"
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

        {/* 도넛 아래: 요리 액션 */}
        <div className="mx-auto mt-5 w-full max-w-3xl">
          <div className="mb-2 text-center text-sm font-medium text-amber-900">
            요리 액션
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {COOK_ACTIONS.map((a) => (
              <Button
                key={a.key}
                size="sm"
                variant="secondary"
                onClick={() => handleAction(a.gif)}
                disabled={total < REQUIRED_COUNT_MARK || interactionLocked}
                className={cn(
                  "rounded-full",
                  (total < REQUIRED_COUNT_MARK || interactionLocked) &&
                    "opacity-70 cursor-not-allowed"
                )}
                title={
                  total < REQUIRED_COUNT_MARK
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

          {/* 액션 아래: 비우기 / 요리 완성 */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetAll}
              disabled={interactionLocked}
              className={cn(
                "rounded-full",
                interactionLocked && "opacity-70 cursor-not-allowed"
              )}
            >
              재료 비우기
            </Button>
            <Button
              size="sm"
              variant={
                canCook && hasActed && !interactionLocked
                  ? "default"
                  : "secondary"
              }
              disabled={!canCook || !hasActed || interactionLocked}
              onClick={handleCookFinish}
              className={cn(
                "rounded-full",
                (!canCook || !hasActed || interactionLocked) && "opacity-80"
              )}
              title={
                !hasActed
                  ? "요리 액션을 하나 이상 수행해야 완성할 수 있어요."
                  : interactionLocked
                  ? "진행 중에는 완성할 수 없어요."
                  : "요리 완성"
              }
            >
              {isCooking ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                  요리중…
                </span>
              ) : (
                "요리 완성"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 진행 중 전역 클릭 차단 */}
      <AnimatePresence>
        {interactionLocked && (
          <motion.div
            className="absolute inset-0 z-20 cursor-wait"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────── 상단 10칸 세그먼트 진행바 (그라데이션 & 글로스 + 10개 이펙트) ─────────── */
function PotProgressBar({
  total,
  min,
  max,
  segments = 10,
  requiredMark,
  milestonePulseKey, // 10개 달성 순간 증가하는 키
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
            background:
              "linear-gradient(to right, rgba(16,185,129,0.16), rgba(16,185,129,0.10))",
          }}
        />

        {/* 10개 지점 마커 + 이펙트 */}
        {requiredPct !== null && (
          <>
            <div
              className="absolute inset-y-0"
              style={{
                left: `${requiredPct}%`,
                width: 0,
                borderLeft: "2px dashed rgba(120,85,40,0.35)",
              }}
            />
            <div
              className="absolute -bottom-5 -translate-x-1/2 text-[10px] text-amber-900/80"
              style={{ left: `${requiredPct}%` }}
            >
              <div
                className="mx-auto h-0 w-0"
                style={{
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "6px solid rgba(120,85,40,0.55)",
                }}
              />
              <div className="mt-0.5 tabular-nums">10개</div>
            </div>

            {/* 10개 달성 순간 펄스 & 스파클 */}
            <MilestoneFx
              key={`ms-${milestonePulseKey}`}
              leftPct={requiredPct}
            />
          </>
        )}

        {/* 세그먼트 바 */}
        <div
          className={cn(
            "relative grid overflow-hidden rounded-xl",
            "ring-1 ring-amber-200/70"
          )}
          style={{
            gridTemplateColumns: `repeat(${segments}, 1fr)`,
            height: 16,
            background: "linear-gradient(180deg, #FFF7E6 0%, #FFE8B3 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[45%]"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0))",
            }}
          />
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
                className="relative h-full border-r border-amber-200/60 last:border-r-0"
              >
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: frac }}
                  transition={{
                    type: "tween",
                    duration: 0.22,
                    delay: i * 0.02,
                  }}
                  className="origin-left h-full"
                  style={{
                    background:
                      "linear-gradient(90deg, #FFC24D 0%, #FFB300 50%, #FFA000 100%)",
                  }}
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
          <div className="select-none rounded-md bg-amber-900 text-amber-50 px-2 py-0.5 text-[11px] tabular-nums shadow-sm">
            <span className="font-semibold">{total}</span>/{max}
          </div>
          <div className="mx-auto h-2 w-[2px] rounded bg-amber-900/70" />
        </motion.div>
      </div>

      {/* 라벨 */}
      <div className="mt-1 flex justify-between text-[10px] text-amber-900/70">
        <span>0</span>

        <span className="tabular-nums">max {max}</span>
      </div>
    </div>
  );
}

/* 10개 달성 FX: 마커 주변 스파클 + 원형 펄스 */
function MilestoneFx({ leftPct }: { leftPct: number }) {
  const dots = Array.from({ length: 10 });
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* 원형 펄스 */}
      <motion.div
        className="absolute top-1/2 h-6 w-6 -translate-y-1/2 -translate-x-1/2 rounded-full"
        style={{
          left: `${leftPct}%`,
          background:
            "radial-gradient(rgba(16,185,129,0.35), rgba(16,185,129,0))",
        }}
        initial={{ scale: 0.6, opacity: 0.0 }}
        animate={{ scale: [0.6, 1.4, 1.8], opacity: [0.0, 0.35, 0] }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      {/* 스파클 */}
      {dots.map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{
            left: `${leftPct}%`,
            top: "50%",
            background: i % 2 ? "#10B981" : "#F59E0B",
          }}
          initial={{ opacity: 0, scale: 0.6, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.6, 1, 0.8],
            x: 16 * Math.cos((i / dots.length) * Math.PI * 2),
            y: 16 * Math.sin((i / dots.length) * Math.PI * 2),
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/* ─────────── 요리 결과 카드 오버레이 + 성공/실패 이펙트 ─────────── */
function CookResultOverlay({ result }: { result: CookResult }) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          key={`cook-result-${result.name}-${result.success}`}
          initial={{ opacity: 0, scale: 0.9, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 4 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          {result.success ? <ConfettiBurst /> : <FailSmoke />}

          <motion.div
            className={cn(
              "rounded-2xl px-4 py-3 text-center bg-white/90 backdrop-blur-sm"
            )}
            animate={
              result.success
                ? {
                    boxShadow: [
                      "0 0 0 rgba(0,0,0,0)",
                      "0 0 32px rgba(16,185,129,0.25)",
                      "0 0 0 rgba(0,0,0,0)",
                    ],
                  }
                : { x: [0, -6, 6, -4, 4, 0] }
            }
            transition={{ duration: result.success ? 0.9 : 0.4 }}
          >
            <div className="text-3xl">{result.emoji}</div>
            <div className="mt-1 text-sm font-semibold text-amber-900">
              {result.name}
            </div>
            <div
              className={cn(
                "mt-0.5 text-xs",
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

/* 성공: 간단 컨페티 버스트 */
function ConfettiBurst() {
  const dots = Array.from({ length: 12 });
  return (
    <div className="absolute inset-0 grid place-items-center">
      {dots.map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-2 w-2 rounded-full"
          style={{ background: i % 2 ? "#10B981" : "#F59E0B" }}
          initial={{ opacity: 0, scale: 0.6, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.6, 1, 0.8],
            x: 40 * Math.cos((i / dots.length) * Math.PI * 2),
            y: 40 * Math.sin((i / dots.length) * Math.PI * 2),
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/* 실패: 연무(💨) 펄스 */
function FailSmoke() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <motion.div
        initial={{ opacity: 0.0, scale: 0.8 }}
        animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.1, 1.2] }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="text-3xl"
      >
        💨
      </motion.div>
    </div>
  );
}
