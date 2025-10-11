// src/features/kitchen/Inventory.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type IngredientTitle, INGREDIENTS } from "./type";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ShoppingBasket } from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   타입 & 옵션 Props
   - 기존 필수 props는 동일
   - 아래 옵션들은 주면 켜지고, 안 주면 기존과 동일하게 렌더
──────────────────────────────────────────────────────────────────────────── */
type InventoryProps = {
  potatoCount: number;
  potPotatoes: number; // 남은 감자 계산용(인벤토리 총량 - 스테이징이 아니라면 0으로 넘겨도 무관)
  invMap: Record<string, number>;
  stagedIngredients: Record<IngredientTitle, number>;
  stagedPotatoes: number;
  onClickIngredient: (title: IngredientTitle, emoji: string) => void;
  onClickPotato: () => void;

  /* ⬇️ 선택 옵션들 (전부 주지 않아도 됨) */
  /** 각 재료별 '필요 수량'을 표시하고 싶을 때 전달 */
  requiredMap?: Partial<Record<IngredientTitle, number>>;
  /** 감자 필요 수(진행도 표시용 배지) */
  potatoNeed?: number;
  /** 헤더 우측에 컨트롤(필요만 보기/정렬) 표시할지 */
  showControls?: boolean;
  /** 컨트롤 기본값: 필요한 것만 보기 */
  defaultShowNeededOnly?: boolean;
  /** 컨트롤 기본값: 정렬 모드 */
  defaultSortMode?: "default" | "neededFirst" | "lowStockFirst";
  /** 재고 0 카드 클릭 시 상점/낚시 등으로 보내고 싶을 때 */
  onMissingIngredientClick?: (title: IngredientTitle) => void;
};

export default function Inventory(props: InventoryProps) {
  const {
    potatoCount,
    potPotatoes,
    invMap,
    stagedIngredients,
    stagedPotatoes,
    onClickIngredient,
    onClickPotato,

    // 옵션
    requiredMap,
    potatoNeed,
    showControls = false,
    defaultShowNeededOnly = false,
    defaultSortMode = "default",
    onMissingIngredientClick,
  } = props;

  const potatoLeft = Math.max(0, potatoCount - stagedPotatoes);

  /* ────────────────────────────────────────────────────────────────────────
     내부 상태(옵션 컨트롤용) — 옵션 비노출 시 기본값으로만 동작
  ───────────────────────────────────────────────────────────────────────── */
  const [showNeededOnly, setShowNeededOnly] = useState(defaultShowNeededOnly);
  const [sortMode, setSortMode] = useState<
    "default" | "neededFirst" | "lowStockFirst"
  >(defaultSortMode);

  /* ────────────────────────────────────────────────────────────────────────
     재료 목록 가공: need/have/staged/left/lack 계산 + 필터 + 정렬
  ───────────────────────────────────────────────────────────────────────── */
  type Row = {
    idx: number;
    title: IngredientTitle;
    emoji: string;
    need: number;
    have: number;
    staged: number;
    left: number;
    lack: number; // need - (staged + left) 가 양수면 부족
  };

  const rows: Row[] = useMemo(() => {
    const list = INGREDIENTS.map((it, idx) => {
      const have = invMap[it.title] ?? 0;
      const staged = stagedIngredients[it.title as IngredientTitle] ?? 0;
      const left = Math.max(0, have - staged);
      const need =
        (requiredMap &&
          typeof requiredMap[it.title as IngredientTitle] === "number" &&
          (requiredMap[it.title as IngredientTitle] as number)) ||
        0;
      const lack = Math.max(0, need - (staged + left));
      return {
        idx,
        title: it.title as IngredientTitle,
        emoji: it.emoji,
        have,
        staged,
        left,
        need,
        lack,
      };
    });

    // 필요한 것만 보기
    const filtered =
      showControls && showNeededOnly ? list.filter((r) => r.need > 0) : list;

    // 정렬 모드
    if (showControls) {
      if (sortMode === "neededFirst") {
        filtered.sort((a, b) => {
          const aKey = a.need > 0 ? 0 : 1;
          const bKey = b.need > 0 ? 0 : 1;
          if (aKey !== bKey) return aKey - bKey;
          // 필요 > 0 그룹 내에서는 남은 left 오름차순(부족한 것 먼저 시선)
          if (aKey === 0) return a.left - b.left;
          return a.idx - b.idx;
        });
      } else if (sortMode === "lowStockFirst") {
        filtered.sort((a, b) => a.left - b.left || a.idx - b.idx);
      } else {
        // default: 원래 순서 유지
        filtered.sort((a, b) => a.idx - b.idx);
      }
    } else {
      filtered.sort((a, b) => a.idx - b.idx);
    }

    return filtered;
  }, [
    invMap,
    stagedIngredients,
    requiredMap,
    showControls,
    showNeededOnly,
    sortMode,
  ]);

  /* ────────────────────────────────────────────────────────────────────────
     롱프레스/Shift-클릭, 키보드 단축키(1~9)
  ───────────────────────────────────────────────────────────────────────── */
  const pressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 롱프레스 시작: 현재 left 기준으로 최대 반복 횟수 cap
  function onPressStart(row: Row) {
    if (row.left <= 0) return;
    let cap = row.left; // 현재 시점의 left만큼만
    clearInterval(pressTimerRef.current as any);
    pressTimerRef.current = setInterval(() => {
      if (cap <= 0) {
        clearInterval(pressTimerRef.current as any);
        return;
      }
      onClickIngredient(row.title, row.emoji);
      cap -= 1;
    }, 120);
  }
  function onPressEnd() {
    clearInterval(pressTimerRef.current as any);
  }

  // 숫자키 1~9 → rows[0..8] 빠른 투입
  const gridRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      const n = parseInt(e.key, 10);
      if (!Number.isFinite(n)) return;
      if (n < 1 || n > 9) return;
      const row = rows[n - 1];
      if (!row) return;
      if (row.left <= 0) return;
      onClickIngredient(row.title, row.emoji);
    }

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [rows, onClickIngredient]);

  // SR용 라이브 업데이트 문장 (현재 넣은 재료 요약)
  const liveStagedSummary = useMemo(() => {
    const parts: string[] = [];
    if (stagedPotatoes > 0) parts.push(`🥔×${stagedPotatoes}`);
    rows.forEach((r) => {
      if (r.staged > 0) parts.push(`${r.emoji}×${r.staged}`);
    });
    return parts.length
      ? `현재 넣은 재료: ${parts.join(", ")}`
      : "아직 넣은 재료가 없어요.";
  }, [rows, stagedPotatoes]);

  return (
    <Card className="relative flex flex-col rounded-2xl bg-[#FAF7F2] shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 ring-1 ring-black/5">
              <ShoppingBasket className="h-5 w-5 text-amber-700" />
            </span>
            <CardTitle className="text-base font-semibold tracking-tight text-amber-900">
              재료 인벤토리
            </CardTitle>
          </div>

          {/* 옵션 컨트롤(필요할 때만 노출) */}
          {showControls && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={cn(
                  "text-xs rounded-full border px-2 py-1 transition",
                  showNeededOnly
                    ? "bg-amber-100/80 border-amber-200 text-amber-900"
                    : "bg-white/70 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                )}
                onClick={() => setShowNeededOnly((v) => !v)}
              >
                필요한 것만
              </button>

              <select
                className="text-xs rounded-full border bg-white/70 border-zinc-200 px-2 py-1"
                value={sortMode}
                onChange={(e) =>
                  setSortMode(
                    e.target.value as
                      | "default"
                      | "neededFirst"
                      | "lowStockFirst"
                  )
                }
              >
                <option value="default">기본</option>
                <option value="neededFirst">필요 우선</option>
                <option value="lowStockFirst">재고적은순</option>
              </select>
            </div>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="p-3">
        <TooltipProvider delayDuration={150}>
          {/* 감자 버튼 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "group relative mb-4 w-full h-24 rounded-2xl overflow-hidden",
                  "flex items-center justify-between px-4 border",
                  "transition will-change-transform hover:-translate-y-0.5 hover:shadow-md",
                  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  typeof potatoNeed === "number" &&
                    potatoNeed > stagedPotatoes &&
                    "ring-1 ring-red-200/80"
                )}
                onClick={() => potatoLeft > 0 && onClickPotato()}
                disabled={potatoLeft <= 0}
                aria-label={
                  potatoLeft <= 0
                    ? "감자 없음"
                    : typeof potatoNeed === "number"
                    ? `감자 추가, 필요 ${potatoNeed}, 남음 ${potatoLeft}`
                    : "감자 추가"
                }
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl grid place-items-center text-4xl select-none">
                    🥔
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="text-xs text-muted-foreground leading-tight">
                      클릭해서 냄비에 넣기
                    </div>

                    {/* 감자 필요/남음 배지(옵션) */}
                    {typeof potatoNeed === "number" && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white/70 px-2 py-0.5 text-[11px] text-amber-900/80 tabular-nums">
                        필요 {potatoNeed} · 남음 {potatoLeft}
                      </div>
                    )}
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className="shrink-0 rounded-full bg-amber-100/80 border border-amber-200 px-2 py-1 text-xs text-amber-900 shadow tabular-nums"
                >
                  ×{potatoLeft}
                </Badge>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {potatoLeft <= 0 ? "감자 없음" : "냄비에 감자 넣기"}
            </TooltipContent>
          </Tooltip>

          {/* 재료 그리드 */}
          <div
            ref={gridRef}
            tabIndex={0}
            className={cn(
              "grid gap-2 focus:outline-none",
              "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5"
            )}
            aria-label="재료 목록"
          >
            {rows.map((row, i) => {
              const disabled = row.left <= 0;
              const show3Chips =
                requiredMap && typeof requiredMap[row.title] === "number";

              // 키 힌트(1~9)
              const keyHint = i < 9 ? String(i + 1) : null;

              return (
                <Tooltip key={row.title}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "group relative h-20 rounded-2xl border bg-white shadow-sm overflow-hidden",
                        "flex flex-col items-center justify-center gap-1 px-2",
                        "transition will-change-transform hover:shadow-md hover:-translate-y-0.5",
                        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500",
                        "disabled:opacity-45 disabled:cursor-not-allowed",
                        !disabled && "ring-1 ring-zinc-200/70",
                        row.lack > 0 && "ring-1 ring-red-200/70 bg-red-50/40"
                      )}
                      onClick={(e) => {
                        if (disabled) {
                          onMissingIngredientClick?.(row.title);
                          return;
                        }
                        const addN = e.shiftKey ? Math.min(5, row.left) : 1;
                        for (let k = 0; k < addN; k++) {
                          onClickIngredient(row.title, row.emoji);
                        }
                      }}
                      onMouseDown={() => onPressStart(row)}
                      onMouseUp={onPressEnd}
                      onMouseLeave={onPressEnd}
                      disabled={disabled && !onMissingIngredientClick}
                      aria-label={
                        disabled
                          ? `${row.title} 재고 없음`
                          : `${row.title} 넣기, 남은 ${row.left}개`
                      }
                    >
                      {/* 상단 그라데이션 살짝 */}
                      <div
                        className="pointer-events-none absolute inset-x-0 -top-10 h-16 bg-gradient-to-b from-zinc-200/45 to-transparent"
                        aria-hidden
                      />

                      {/* 키 힌트 */}
                      {keyHint && (
                        <span className="absolute top-1 left-1 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded bg-amber-100/80 border border-amber-200 text-[10px] text-amber-900/90">
                          {keyHint}
                        </span>
                      )}

                      {/* 부족 레드 바 */}
                      {row.lack > 0 && (
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-red-300/80" />
                      )}

                      <span className="text-3xl leading-none select-none">
                        {row.emoji}
                      </span>

                      {/* 기본 재고 배지 (남은 개수) */}
                      <Badge
                        variant="secondary"
                        className={cn(
                          "absolute right-0.5 bottom-0.5",
                          "px-1 py-0.5 text-[9px] leading-none rounded",
                          "font-normal tabular-nums",
                          "border border-amber-200 bg-amber-50 text-amber-800"
                        )}
                      >
                        ×{row.left}
                      </Badge>

                      {/* 하단 3칩(필요/보유/스테이징) — requiredMap 있을 때만 */}
                      {show3Chips && (
                        <div className="absolute left-1 right-1 bottom-1 flex items-center justify-between gap-1">
                          <MiniStat label="필요" value={row.need} tone="need" />
                          <MiniStat label="보유" value={row.have} tone="have" />
                          <MiniStat
                            label="스테"
                            value={row.staged}
                            tone="staged"
                          />
                        </div>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {row.left <= 0
                      ? onMissingIngredientClick
                        ? "재고 없음 (획득하러 가기)"
                        : "재고 없음"
                      : "냄비에 넣기"}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* 현재 넣은 재료 섹션 */}
          <Separator className="my-4" />
          <div aria-live="polite">
            <div className="text-sm font-medium text-amber-900 mb-2">
              현재 넣은 재료
            </div>
            <div className="flex flex-wrap gap-2">
              {stagedPotatoes > 0 && (
                <Badge className="bg-white text-amber-900 border-amber-200 tabular-nums">
                  🥔 ×{stagedPotatoes}
                </Badge>
              )}
              {rows.map((r) => {
                if (r.staged <= 0) return null;
                return (
                  <Badge
                    key={`staged-${r.title}`}
                    className="bg-white text-amber-900 border-amber-200 tabular-nums"
                  >
                    {r.emoji} ×{r.staged}
                  </Badge>
                );
              })}
              {stagedPotatoes === 0 && rows.every((r) => r.staged === 0) && (
                <span className="text-xs text-muted-foreground">
                  아직 넣은 재료가 없어요.
                </span>
              )}
            </div>
            {/* SR 전용 요약 문장 */}
            <span className="sr-only">{liveStagedSummary}</span>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   로컬 마이크로 컴포넌트: MiniStat (필요/보유/스테이징)
──────────────────────────────────────────────────────────────────────────── */
function MiniStat({
  label,
  value,
  tone = "have",
}: {
  label: string;
  value: number | string;
  tone?: "need" | "have" | "staged";
}) {
  const cls =
    tone === "need"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "staged"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-zinc-200 bg-white/70 text-zinc-700";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] leading-none border",
        "tabular-nums",
        cls
      )}
    >
      {label} {value}
    </span>
  );
}
