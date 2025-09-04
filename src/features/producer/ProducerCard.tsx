// src/features/producer/ProducerCard.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { startProduction, collectAndReset } from "./index";
import type { FieldProducer } from "./index";
import { toast } from "sonner";
import {
  INGREDIENT_EMOJI,
  type IngredientTitle,
} from "@/features/kitchen/type";
import { PRODUCERS } from "./type";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// 인벤토리 추가
import { addIngredients } from "@/features/kitchen/kitchenApi";

// shadcn tooltip
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ───────── helpers ───────── */
function computeProgress(
  state: FieldProducer["state"],
  startedAt: string | null | undefined,
  timeSecHours: number
) {
  if (state !== "producing" || !startedAt) return 0;
  const startMs = new Date(startedAt).getTime();
  if (Number.isNaN(startMs)) return 0;
  const now = Date.now();
  const durMs = Math.max(1, Math.round(timeSecHours * 3600 * 1000));
  const ratio = (now - startMs) / durMs;
  return Math.max(0, Math.min(1, ratio));
}

function formatRemaining(ms: number) {
  if (ms <= 0) return "곧 완료";
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0 && m > 0) return `남은 시간: ${h}시간 ${m}분`;
  if (h > 0) return `남은 시간: ${h}시간`;
  if (m > 0) return `남은 시간: ${m}분`;
  return `남은 시간: ${s}초`;
}

/** 20% 확률로 1개 썩음(다중 생산의 경우 어떤 재료가 썩을지 랜덤) */
function decideRottenIndex(total: number) {
  const willRot = Math.random() < 0.2;
  if (!willRot || total <= 0) return null;
  return Math.floor(Math.random() * total);
}

/* ───────── component ───────── */
export default function ProducerCard({
  coupleId,
  index,
  data,
  className,
}: {
  coupleId: string;
  index: number;
  data: FieldProducer;
  className?: string;
}) {
  const [local, setLocal] = useState<FieldProducer>(data);
  const [progress, setProgress] = useState(0);

  // 결과 모달 상태
  const [open, setOpen] = useState(false);
  const [rottenIndex, setRottenIndex] = useState<number | null>(null);
  const [awarding, setAwarding] = useState(false); // 중복 방지

  useEffect(() => setLocal(data), [data]);

  const meta = useMemo(
    () => PRODUCERS.find((p) => p.name === local.title),
    [local.title]
  );

  const titles = meta?.produces ?? [];
  const emojiList = useMemo(
    () => titles.map((t) => INGREDIENT_EMOJI[t as IngredientTitle] ?? "❓"),
    [titles]
  );

  useEffect(() => {
    if (local.state !== "producing" || !meta?.timeSec) {
      setProgress(local.state === "ready" ? 1 : 0);
      return;
    }
    setProgress(computeProgress(local.state, local.started_at, meta.timeSec));

    const id = setInterval(() => {
      const r = computeProgress(local.state, local.started_at, meta.timeSec);
      if (r >= 1) {
        setProgress(1);
        setLocal((p) => ({ ...p, state: "ready" }));
        clearInterval(id);
      } else {
        setProgress(r);
      }
    }, 10000);

    return () => clearInterval(id);
  }, [local.state, local.started_at, meta?.timeSec]);

  const borderGlow =
    local.state === "producing"
      ? "ring-2 ring-orange-400/40"
      : local.state === "ready"
      ? "ring-2 ring-emerald-400/40"
      : "ring-1 ring-neutral-200";

  // 항상 보이도록: producing 최소 6%, idle 0%, ready 100%
  const pct = useMemo(() => {
    if (local.state === "ready") return 100;
    if (local.state === "producing")
      return Math.max(6, Math.round(progress * 100));
    return 0;
  }, [local.state, progress]);

  const remainingText = useMemo(() => {
    if (local.state !== "producing" || !meta?.timeSec || !local.started_at)
      return "";
    const startMs = new Date(local.started_at).getTime();
    const durMs = Math.max(1, Math.round(meta.timeSec * 3600 * 1000));
    const remainMs = Math.max(0, startMs + durMs - Date.now());
    return formatRemaining(remainMs);
  }, [local.state, local.started_at, meta?.timeSec, progress]);

  /** 클릭 동작:
   *  idle  → 생산 시작
   *  producing → 아무 동작 없음(즉시 수확 제거)
   *  ready → 즉시 수확 + 결과 모달
   */
  const handleClick = async () => {
    try {
      if (local.state === "idle") {
        await startProduction(coupleId, index);
        setLocal((p) => ({
          ...p,
          state: "producing",
          started_at: new Date().toISOString(),
        }));
        setProgress(0);
        toast.success(`${local.title} 생산을 시작했어요!`);
        return;
      }

      if (local.state === "producing") {
        // 즉시 수확 제거: 아무 것도 하지 않음
        return;
      }

      // state === "ready"
      if (awarding) return;
      setAwarding(true);

      // 1) 썩은 인덱스 결정
      const rotten = decideRottenIndex(titles.length);
      setRottenIndex(rotten);

      // 2) 지급할 재료 목록(썩은 것 제외)
      const keptTitles = titles.filter(
        (_, i) => i !== rotten
      ) as IngredientTitle[];

      // 3) 인벤토리에 즉시 추가
      if (keptTitles.length > 0) {
        await addIngredients(coupleId, keptTitles);
      }

      // 4) 프로듀서 상태 초기화 (DB + 로컬)
      await collectAndReset(coupleId, index);
      setLocal((p) => ({ ...p, state: "idle", started_at: null }));
      setProgress(0);

      // 5) 결과 모달 오픈
      setOpen(true);

      // 6) 토스트
      const gained = keptTitles
        .map((t) => INGREDIENT_EMOJI[t] ?? "❓")
        .join(" ");
      toast.success(
        keptTitles.length > 0
          ? `재료 획득! ${gained}`
          : "앗, 이번엔 모두 상했어요…"
      );
    } catch (e) {
      console.error(e);
      toast.error("수확에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setAwarding(false);
    }
  };

  const CardInner = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-white p-3 pb-10 transition",
        borderGlow,
        className
      )}
      role="button"
      onClick={handleClick}
    >
      {/* 1줄: 이름 */}
      <div className="font-semibold text-neutral-800 truncate">
        {local.title}
      </div>

      {/* 3줄: Progress (항상 표시) */}
      <div className="mt-2 h-2 w-full rounded-full bg-neutral-200 overflow-hidden relative z-[1]">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            local.state === "producing"
              ? "bg-orange-400"
              : local.state === "ready"
              ? "bg-emerald-400"
              : "bg-neutral-300"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* 4줄: 이미지 + 좌상단 이모지 배지 */}
      <div className="mt-3 relative z-0">
        <img
          src={meta?.image ?? "/producers/placeholder.png"}
          alt={local.title}
          className="w-full h-auto rounded-lg object-contain"
          draggable={false}
          loading="lazy"
        />

        {emojiList.length > 0 && (
          <span
            className="
              absolute top-0 left-0
              inline-flex items-center gap-1 rounded-xl
              border bg-white/90 backdrop-blur px-2 py-1
              text-sm shadow-sm
            "
          >
            {emojiList.join(" ")}
          </span>
        )}

        {/* idle → 호버시에만 오버레이 */}
        {local.state === "idle" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-lg bg-black/0 opacity-0 transition group-hover:bg-black/10 group-hover:opacity-100">
            <span className="rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-neutral-800 shadow-sm">
              재료 생산하기
            </span>
          </div>
        )}

        {/* ready → 호버시에만 오버레이 */}
        {local.state === "ready" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-lg bg-black/0 opacity-0 transition group-hover:bg-black/10 group-hover:opacity-100">
            <span className="rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-neutral-800 shadow-sm">
              재료 얻기
            </span>
          </div>
        )}
      </div>

      {/* 하단 라인: 상태별 텍스트 */}
      <div className="absolute left-0 right-0 rounded-xl bottom-0 z-[2]">
        <div className="mx-3 bg-white/95 px-3 py-2 text-xs text-neutral-700">
          {local.state === "idle" && <>ZZZZZZZ....😴</>}
          {local.state === "producing" && <>{meta?.line ?? "생산 중…"} ⏳</>}
          {local.state === "ready" && <>✅ 재료 생산 완료</>}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Tooltip: 생산 중에만 남은 시간 표시 */}
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>{CardInner}</TooltipTrigger>
          {local.state === "producing" && remainingText && (
            <TooltipContent side="top" align="center">
              {remainingText}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* ───────── 재료획득 모달 (자동 지급 결과만 표시, 버튼 없음) ───────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>재료 획득</DialogTitle>
          </DialogHeader>

          {/* 이모지 + 재료명 (썩은 건 비활성화 스타일) */}
          <div className="mt-2 grid grid-cols-1 gap-2">
            {titles.map((name, i) => {
              const emoji = INGREDIENT_EMOJI[name as IngredientTitle] ?? "❓";
              const rotten = rottenIndex === i;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1",
                    rotten && "opacity-45 grayscale"
                  )}
                >
                  <span className="text-2xl leading-none">{emoji}</span>
                  <span className="text-sm text-neutral-800">{name}</span>
                  {rotten && (
                    <span className="ml-auto text-xs text-rose-500">
                      (상함)
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 메시지 */}
          <p className="mt-3 text-sm text-neutral-700">
            {rottenIndex === null
              ? "전부 온전하게 생성했어요!"
              : `이런! ${
                  titles[rottenIndex] ?? "어느 재료"
                }이(가) 썩고 말았어요.`}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
