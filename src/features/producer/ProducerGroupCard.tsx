// src/features/producer/ProducerGroupCard.tsx
"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PRODUCERS } from "./type";
import {
  INGREDIENT_EMOJI,
  type IngredientTitle,
} from "@/features/kitchen/type";

type ProducerGroup = {
  title: string;
  indices: number[];
  idleIdx: number[];
  prodIdx: number[];
  readyIdx: number[];
  meta: (typeof PRODUCERS)[number] | null;
  minProgress?: number; // 운영중일 때 최소 진행률(표시용)
  minRemainText?: string; // 가장 먼저 끝나는 유닛 기준 남은시간
};

// 최대 2개 이모지로 축약
function compactEmojiBadge(list: IngredientTitle[] | undefined) {
  if (!list || list.length === 0) return "";
  const emojis = list.map((t) => INGREDIENT_EMOJI[t] ?? "❓");
  return emojis.slice(0, 2).join(" ");
}

export default function ProducerGroupCard({
  group,
  className,
}: {
  group: ProducerGroup;
  className?: string;
}) {
  const count = group.indices.length;
  const prodN = group.prodIdx.length;
  const readyN = group.readyIdx.length;

  const ring =
    prodN > 0
      ? "ring-2 ring-orange-400/50"
      : readyN > 0
      ? "ring-2 ring-emerald-400/50"
      : "ring-[1.5px] ring-neutral-200";

  const emojiBadge = compactEmojiBadge(
    (group.meta?.produces as IngredientTitle[] | undefined) ?? []
  );

  const displayImage = group.meta?.image ?? "/producers/placeholder.png";

  return (
    <div
      className={cn(
        "group relative rounded-2xl border bg-white/95 p-4 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.15)] backdrop-blur supports-[backdrop-filter]:bg-white/80 transition-all duration-300",
        "hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.25)]",
        ring,
        className
      )}
    >
      {/* 헤더: 타이틀 + 이모지 배지 (개수는 아래 우측 하단에 크게 표시) */}
      <div className="flex items-start gap-2">
        <div className="font-semibold text-neutral-900">
          {group.title}
          {group.meta?.timeSec ? (
            <div className="mt-0.5 text-[11px] text-neutral-500">
              소요 : {group.meta.timeSec}시간
            </div>
          ) : null}
        </div>

        <div className="ml-auto inline-flex gap-1">
          {emojiBadge && (
            <span className="rounded-full border bg-white/90 px-2 py-0.5 text-sm">
              {emojiBadge}
            </span>
          )}
        </div>
      </div>

      {/* 진행바(운영중일 때만) — 클릭/포커스 시 Tooltip으로 남은시간 표시 */}
      {prodN > 0 && (
        <TooltipProvider delayDuration={120}>
          <div className="mt-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="relative h-2.5 w-full cursor-pointer overflow-hidden rounded-full bg-neutral-200 outline-none"
                  tabIndex={0}
                  role="button"
                  aria-label="남은 시간 보기"
                  onClick={(e) => (e.currentTarget as HTMLElement).focus()}
                >
                  <div
                    className="h-full rounded-full bg-orange-400 transition-all"
                    style={{
                      width: `${Math.round((group.minProgress ?? 0) * 100)}%`,
                    }}
                  />
                  {/* 은은한 펄스 하이라이트 */}
                  <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
              </TooltipTrigger>
              {group.minRemainText && (
                <TooltipContent side="top" align="center">
                  {group.minRemainText}
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </TooltipProvider>
      )}

      {/* 썸네일 — 스택 느낌 + 우하단 큰 개수 배지 */}
      <div className="mt-3 relative">
        <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-xl bg-neutral-200/60" />
        <img
          src={displayImage}
          alt={group.title}
          className="relative w-full h-auto rounded-xl object-contain border-[3px] border-neutral-100 bg-white shadow-[0_10px_0_0_rgba(0,0,0,0.04)]"
          draggable={false}
          loading="lazy"
        />

        {/* 우하단 큰 개수 배지 */}
        <div
          className="absolute bottom-2 right-2 select-none rounded-2xl border-2 border-neutral-300 bg-white/95 px-3 py-1.5 shadow-[0_8px_16px_-10px_rgba(0,0,0,0.25)] backdrop-blur-sm"
          aria-label={`보유 수량 ${count}`}
          title={`보유 수량 ${count}`}
        >
          <span className="text-xl font-extrabold tabular-nums tracking-tight text-rose-400 align-middle">
            ×{count}
          </span>
        </div>
      </div>
    </div>
  );
}
