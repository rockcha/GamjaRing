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
import { Clock } from "lucide-react";

type ProducerGroup = {
  title: string;
  indices: number[];
  idleIdx: number[];
  prodIdx: number[];
  readyIdx: number[];
  meta: (typeof PRODUCERS)[number] | null;
  minProgress?: number; // 운영중 최소 진행률(0~1)
  minRemainText?: string; // 가장 먼저 끝나는 유닛 기준 남은시간 (준비완료면 undefined)
};

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

  // 완료 상태면 진행바/툴팁을 숨김
  const showProgress = prodN > 0 && readyN === 0;

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-white/95 p-2 text-[12px] leading-tight shadow-[0_8px_22px_-12px_rgba(0,0,0,0.12)] backdrop-blur supports-[backdrop-filter]:bg-white/80 transition-all duration-300",
        "hover:shadow-[0_18px_36px_-18px_rgba(0,0,0,0.25)]",
        "md:rounded-2xl md:p-4 md:text-[14px] md:leading-snug",
        ring,
        className
      )}
    >
      {/* 헤더 */}
      <div className="flex items-start gap-1.5 md:gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-neutral-900 truncate max-w-[70%] md:max-w-none">
            {group.title}
          </div>

          {/* 소요시간: 작은 시계 아이콘 */}
          {group.meta?.timeSec ? (
            <div className="mt-0.5 flex items-center gap-1 text-[10px] md:text-[11px] text-neutral-500">
              <Clock className="h-[12px] w-[12px] md:h-[14px] md:w-[14px]" />
              <span>{group.meta.timeSec}시간</span>
            </div>
          ) : null}
        </div>

        {/* 모바일: 2개 이모지 배지 / 데탑: 가로 리스트로 별도 표시 */}
        {emojiBadge && (
          <span className="ml-auto md:hidden rounded-full border bg-white/90 px-1.5 py-0.5 text-xs">
            {emojiBadge}
          </span>
        )}
      </div>

      {/* 데스크탑 전용: 재료 가로 나열 (이모지 전부) */}
      {group.meta?.produces && group.meta.produces.length > 0 && (
        <div className="mt-1.5 hidden md:block">
          <div className="flex items-center  scrollbar-none border rounded-lg px-1">
            {group.meta.produces.map((t) => (
              <span
                key={`${group.title}-${t}`}
                className="inline-flex shrink-0 items-center  bg-white/90 px-1 py-0.5 text-sm"
                title={t}
              >
                {INGREDIENT_EMOJI[t as IngredientTitle] ?? "❓"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 진행바(운영중일 때만) */}
      {showProgress && (
        <TooltipProvider delayDuration={120}>
          <div className="mt-2 md:mt-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="relative h-1.5 md:h-2.5 w-full cursor-pointer overflow-hidden rounded-full bg-neutral-200 outline-none"
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
                  <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
              </TooltipTrigger>

              {/* 남은 시간이 0이면 툴팁 숨김 */}
              {group.minRemainText && (
                <TooltipContent side="top" align="center">
                  {group.minRemainText}
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </TooltipProvider>
      )}

      {/* 썸네일 */}
      <div className="mt-2 md:mt-3 relative">
        <div className="absolute inset-0 translate-x-[2px] translate-y-[2px] rounded-lg md:rounded-xl bg-neutral-200/60" />
        <img
          src={displayImage}
          alt={group.title}
          className={cn(
            "relative w-full rounded-lg md:rounded-xl object-contain border-2 md:border-[3px] border-neutral-100 bg-white",
            "h-24 md:h-auto shadow-[0_8px_0_0_rgba(0,0,0,0.04)]"
          )}
          draggable={false}
          loading="lazy"
        />

        {/* 보유 개수 */}
        <div
          className="absolute bottom-1.5 right-1.5 select-none rounded-xl md:rounded-2xl border border-neutral-300 bg-white/95 px-2 md:px-3 py-1 md:py-1.5 shadow-[0_8px_16px_-10px_rgba(0,0,0,0.25)] backdrop-blur-sm"
          aria-label={`보유 수량 ${group.indices.length}`}
          title={`보유 수량 ${group.indices.length}`}
        >
          <span className="text-base md:text-xl font-extrabold tabular-nums tracking-tight text-rose-400 align-middle">
            ×{group.indices.length}
          </span>
        </div>
      </div>
    </div>
  );
}
