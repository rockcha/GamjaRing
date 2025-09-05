// src/features/fishing/IngredientFishingSection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { fetchKitchen } from "@/features/kitchen/kitchenApi";
import {
  INGREDIENTS,
  INGREDIENT_TITLES,
  type IngredientTitle,
} from "@/features/kitchen/type";
import { FISHES, type FishRarity } from "@/features/aquarium/fishes";
import { PackageOpen, Fish as FishIcon } from "lucide-react";

const DND_MIME = "application/x-ingredient";

type Props = {
  className?: string;
  /** 낚시 중일 때 true로 전달 → 드래그 비활성 */
  dragDisabled?: boolean;
};

type IngredientCell = {
  title: IngredientTitle;
  emoji: string;
  count: number;
};

export default function IngredientFishingSection({
  className,
  dragDisabled = false,
}: Props) {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [invMap, setInvMap] = useState<Record<IngredientTitle, number>>(
    {} as any
  );
  const [selected, setSelected] = useState<{
    title: IngredientTitle;
    emoji: string;
  } | null>(null);

  const EMOJI_BY_TITLE = useMemo(
    () =>
      Object.fromEntries(
        INGREDIENTS.map(
          (it) => [it.title as IngredientTitle, it.emoji] as const
        )
      ) as Record<IngredientTitle, string>,
    []
  );

  // 인벤 불러오기
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!coupleId) {
        setInvMap({} as any);
        setSelected(null);
        return;
      }
      try {
        setLoading(true);
        const k = await fetchKitchen(coupleId);
        const next: Record<IngredientTitle, number> = {} as any;
        for (const t of INGREDIENT_TITLES) next[t] = 0;
        for (const row of k.ingredients ?? []) {
          const t = row.title as IngredientTitle;
          if (t in next) next[t] = row.num ?? 0;
        }
        if (mounted) setInvMap(next);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [coupleId]);

  // 페이지에서 소비 성공 시 덜어내도록 이벤트 구독
  useEffect(() => {
    function onConsumed(e: Event) {
      const detail = (e as CustomEvent<{ title: IngredientTitle }>).detail;
      if (!detail?.title) return;
      setInvMap((prev) => {
        const cur = prev[detail.title] ?? 0;
        const nextCount = Math.max(0, cur - 1);
        const next = { ...prev, [detail.title]: nextCount };
        if (selected?.title === detail.title && nextCount <= 0)
          setSelected(null);
        return next;
      });
    }
    window.addEventListener("ingredient-consumed", onConsumed as any);
    return () =>
      window.removeEventListener("ingredient-consumed", onConsumed as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.title]);

  const cells: IngredientCell[] = useMemo(() => {
    const list = INGREDIENT_TITLES.map((t) => ({
      title: t,
      emoji: EMOJI_BY_TITLE[t] ?? "📦",
      count: invMap[t] ?? 0,
    }))
      .filter((c) => c.count > 0)
      .sort((a, b) =>
        b.count !== a.count
          ? b.count - a.count
          : a.title.localeCompare(b.title, "ko")
      )
      .slice(0, 15);
    return list;
  }, [invMap, EMOJI_BY_TITLE]);

  // 선택 재료로 포획 가능한 "모든 어종" (야생 포함)
  const capturable = useMemo(() => {
    if (!selected) return [];
    return FISHES.filter((f) => f.ingredient === selected.title);
  }, [selected]);

  const rarityCardCls = (r: FishRarity) =>
    r === "일반"
      ? "bg-neutral-50 border-neutral-200"
      : r === "희귀"
      ? "bg-sky-50 border-sky-200"
      : r === "에픽"
      ? "bg-violet-50 border-violet-200"
      : "bg-amber-50 border-amber-200";

  // 최대 8개만 미리보기
  const MAX_SHOW = 8;
  const shown = useMemo(
    () => (selected ? capturable.slice(0, MAX_SHOW) : []),
    [selected, capturable]
  );

  // 드래그 스타트
  const handleDragStart = (e: React.DragEvent, cell: IngredientCell) => {
    if (dragDisabled || cell.count <= 0) {
      e.preventDefault();
      return;
    }
    const payload = JSON.stringify({ title: cell.title, emoji: cell.emoji });
    e.dataTransfer.setData(DND_MIME, payload);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {/* 헤더 */}
      <div className="flex items-center">
        <span className="inline-flex h-8 w-8 items-center justify-center">
          <PackageOpen className="h-4 w-4 text-amber-700" />
        </span>
        <h3 className="text-sm font-semibold text-zinc-800">재료</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {loading
            ? "불러오는 중…"
            : `보유 중: ${
                Object.values(invMap).reduce((a, b) => a + (b || 0), 0) ?? 0
              }개`}
        </span>
      </div>

      {/* 반응형 재료 그리드: auto-fill + 정사각형 칸 */}
      <div className="grid gap-2 rounded-2xl grid-cols-[repeat(auto-fill,minmax(72px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(80px,1fr))]">
        {cells.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground border rounded-xl p-4 text-center">
            보유한 재료가 없어요.
          </div>
        )}

        {cells.map((c) => {
          const isSel = selected?.title === c.title;
          const disabled = dragDisabled || c.count <= 0;
          return (
            <button
              key={c.title}
              onClick={() => setSelected({ title: c.title, emoji: c.emoji })}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, c)}
              className={cn(
                "relative w-full aspect-square rounded-xl border bg-white shadow-sm overflow-hidden",
                "flex flex-col items-center justify-center gap-1 p-2",
                "transition will-change-transform hover:shadow-md hover:-translate-y-0.5",
                isSel
                  ? "ring-2 ring-amber-500 border-amber-300 bg-amber-50"
                  : "border-zinc-200",
                disabled
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-grab active:cursor-grabbing"
              )}
              title={`${c.title} ×${c.count}`}
            >
              {/* 이모지 크기도 반응형 */}
              <span className="leading-none select-none text-[clamp(20px,4.2vw,28px)]">
                {c.emoji}
              </span>

              <span className="absolute right-1.5 bottom-1.5 text-[10px] text-amber-700 font-semibold tabular-nums">
                ×{c.count}
              </span>

              {dragDisabled && (
                <span
                  className="absolute inset-0 bg-white/50 backdrop-blur-[1px]"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 선택 정보 & 포획 가능 어종 */}
      <div className="flex gap-2 mt-4">
        <FishIcon className="w-4 h-4 text-sky-600" />
        <span className="text-sm font-semibold text-zinc-800">
          포획 가능 어종
        </span>
      </div>

      <div className="rounded-2xl border p-3 flex flex-col min-h-[280px] sm:min-h-[280px] lg:min-h-[220px]">
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-amber-700 font-semibold">
            {`${Math.min(capturable.length, MAX_SHOW)}종 / 최대 8종`}
          </span>
        </div>

        {/* 반응형 프리뷰: 2/3/4열 + 정사각형 카드 */}
        <div className="mt-2 flex-1">
          {selected ? (
            capturable.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {shown.map((f) => (
                  <div
                    key={f.id}
                    className={cn(
                      "rounded-xl border p-2",
                      "w-full aspect-square",
                      rarityCardCls(f.rarity as FishRarity)
                    )}
                    title={f.labelKo}
                  >
                    <div className="rounded-lg overflow-hidden border bg-white w-full h-full">
                      <img
                        src={f.image}
                        alt={f.labelKo}
                        className="w-full h-full object-contain"
                        draggable={false}
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                이 재료로 표시할 어종이 없어요.
              </div>
            )
          ) : (
            <div className="text-xs text-muted-foreground">
              재료를 선택하면 어종이 보여요.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
