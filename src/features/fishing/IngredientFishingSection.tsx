// src/features/fishing/IngredientFishingSection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCoupleContext } from "@/contexts/CoupleContext";
import {
  fetchKitchen,
  consumeIngredients,
} from "@/features/kitchen/kitchenApi";
import {
  INGREDIENTS,
  INGREDIENT_TITLES,
  type IngredientTitle,
} from "@/features/kitchen/type";
import { FISHES, type FishRarity } from "@/features/aquarium/fishes";
import { PackageOpen, Fish as FishIcon } from "lucide-react";

type Props = {
  className?: string;
  onStart: (ingredient: { title: IngredientTitle; emoji: string }) => void;
};

type IngredientCell = {
  title: IngredientTitle;
  emoji: string;
  count: number;
};

export default function IngredientFishingSection({
  className,
  onStart,
}: Props) {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [consuming, setConsuming] = useState(false);
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

  // ✅ 야생 필터 제거: 선택 재료에 맞는 "모든" 어종
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

  const canStart =
    !!selected &&
    !!coupleId &&
    (invMap[selected?.title as IngredientTitle] ?? 0) > 0 &&
    !loading &&
    !consuming;

  const handleStart = async () => {
    if (!selected || !coupleId) return;
    const t = selected.title;
    try {
      setConsuming(true);
      await consumeIngredients(coupleId, { [t]: 1 } as Record<
        IngredientTitle,
        number
      >);
      setInvMap((prev) => {
        const cur = prev[t] ?? 0;
        const nextCount = Math.max(0, cur - 1);
        const next = { ...prev, [t]: nextCount };
        if (nextCount <= 0) setSelected(null);
        return next;
      });
      onStart(selected);
    } catch (e) {
      console.error("재료 차감 실패:", e);
      alert("재료 차감에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setConsuming(false);
    }
  };

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 border border-amber-200">
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

      {/* 5 × 3 재료 그리드 (최대 15개) */}
      <div className="grid grid-cols-5 gap-2 rounded-2xl">
        {cells.length === 0 && (
          <div className="col-span-5 text-sm text-muted-foreground border rounded-xl p-4 text-center">
            보유한 재료가 없어요.
          </div>
        )}

        {cells.map((c) => {
          const isSel = selected?.title === c.title;
          return (
            <button
              key={c.title}
              onClick={() => setSelected({ title: c.title, emoji: c.emoji })}
              className={cn(
                "relative h-20 rounded-xl border bg-white shadow-sm overflow-hidden",
                "flex flex-col items-center justify-center gap-1 px-2",
                "transition will-change-transform hover:shadow-md hover:-translate-y-0.5",
                isSel
                  ? "ring-2 ring-amber-500 border-amber-300 bg-amber-50"
                  : "border-zinc-200"
              )}
              title={`${c.title} ×${c.count}`}
            >
              <span className="text-2xl leading-none select-none">
                {c.emoji}
              </span>
              <span className="text-[11px] font-medium text-zinc-700">
                {c.title}
              </span>
              <span className="absolute right-2 bottom-1 text-[10px] text-amber-700 font-semibold tabular-nums">
                ×{c.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 선택 정보 & 포획 가능 어종 (3줄 높이 확보 + 버튼 위치 고정) */}
      <div className="flex gap-2 mt-4 ">
        <FishIcon className="w-4 h-4 text-sky-600" />
        <span className="text-sm font-semibold text-zinc-800">
          포획 가능 어종
        </span>
      </div>

      <div
        className=" rounded-2xl border p-3 flex flex-col
                      min-h-[520px] sm:min-h-[420px] lg:min-h-[360px]"
      >
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-amber-700 font-semibold">
            {`${capturable.length}종`}
          </span>
        </div>

        {/* 그리드: 남은 공간을 차지하도록 flex-1 + overflow-auto */}
        <div className="mt-2 flex-1 overflow-auto">
          {selected ? (
            capturable.length > 0 ? (
              <div
                className="
                  grid gap-2
                  grid-cols-2
                  sm:grid-cols-3
                  lg:grid-cols-4
                  [grid-auto-rows:minmax(0,1fr)]
                "
              >
                {capturable.map((f) => (
                  <div
                    key={f.id}
                    className={cn(
                      "rounded-xl border p-2",
                      rarityCardCls(f.rarity as FishRarity)
                    )}
                    title={f.labelKo}
                  >
                    <div className="rounded-lg overflow-hidden border bg-white">
                      <img
                        src={f.image}
                        alt={f.labelKo}
                        className="w-full aspect-square object-contain"
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

      {/* 낚시 시작 버튼 */}
      <div className="flex justify-end">
        <Button onClick={handleStart} disabled={!canStart}>
          {consuming ? "처리 중…" : "낚시 시작"}
        </Button>
      </div>
    </section>
  );
}
