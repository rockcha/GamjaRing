// src/features/kitchen/Inventory.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCoupleContext } from "@/contexts/CoupleContext";
import {
  INGREDIENTS,
  type IngredientTitle,
  RECIPES,
  RECIPE_EMOJI,
  getFoodDesc,
  type RecipeName,
} from "./type";
import { fetchKitchen, type FoodRow, addCookedFood } from "./kitchenApi";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Coins, ShoppingBasket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Inventory({
  potatoCount,
  potPotatoes,
  invMap,
  potMap,
  onClickIngredient,
  onClickPotato,
}: {
  potatoCount: number;
  potPotatoes: number;
  invMap: Record<string, number>;
  potMap: Record<IngredientTitle, number>;
  onClickIngredient: (title: IngredientTitle, emoji: string) => void;
  onClickPotato: () => void;
}) {
  const potatoLeft = Math.max(0, potatoCount - potPotatoes);

  // 컨텍스트
  const { couple, addGold } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  // 내 요리 불러오기
  const [foods, setFoods] = useState<FoodRow[]>([]);
  useEffect(() => {
    if (!coupleId) return;
    (async () => {
      const k = await fetchKitchen(coupleId);
      setFoods(k.foods ?? []);
    })();
  }, [coupleId]);

  // 맵들
  const RECIPE_BY_NAME = useMemo(
    () =>
      Object.fromEntries(RECIPES.map((r) => [r.name, r] as const)) as Record<
        string,
        (typeof RECIPES)[number]
      >,
    []
  );

  const cookedList = useMemo(
    () => foods.filter((f) => (f?.num ?? 0) > 0),
    [foods]
  );

  // 모달 상태
  const [open, setOpen] = useState(false);
  const [selName, setSelName] = useState<RecipeName | null>(null);
  const [selling, setSelling] = useState(false);

  const selRecipe = selName ? RECIPE_BY_NAME[selName] : undefined;
  const selEmoji = selName ? RECIPE_EMOJI[selName] : undefined;
  const selDesc = selName ? getFoodDesc(selName) : "";
  const selCount = selName
    ? foods.find((f) => f.name === selName)?.num ?? 0
    : 0;

  function openModal(name: string) {
    setSelName(name as RecipeName);
    setOpen(true);
  }

  async function onSell() {
    if (!coupleId || !selRecipe || !selName) return;
    if (selCount <= 0) return;

    try {
      setSelling(true);
      // 1) 골드 추가
      addGold?.(selRecipe.sell);
      // 2) DB 수량 -1
      await addCookedFood(coupleId, selName, -1);
      // 3) 로컬 상태 즉시 반영
      setFoods((prev) =>
        prev.map((f) =>
          f.name === selName ? { ...f, num: Math.max(0, f.num - 1) } : f
        )
      );
      setOpen(false);
    } finally {
      setSelling(false);
    }
  }

  return (
    <section className="relative flex flex-col rounded-2xl border bg-[#FAF7F2] shadow-sm">
      {/* 헤더 */}
      <header>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center">
              <ShoppingBasket className="h-6 w-6 text-amber-700" />
            </span>
            <h2 className="text-base font-semibold tracking-tight text-amber-900">
              인벤토리
            </h2>
          </div>
        </div>
      </header>
      <Separator />

      {/* 콘텐츠 */}
      <div className="p-3">
        {/* 재료 섹션 타이틀 */}
        <div className="px-1 pb-2">
          <h3 className="text-sm font-semibold text-zinc-800">재료</h3>
        </div>

        {/* 감자 카드 */}
        <Button
          variant="outline"
          className={cn(
            "group relative mb-4 w-full h-24 rounded-2xl border overflow-hidden",
            "flex items-center justify-between px-4",
            "transition will-change-transform hover:-translate-y-0.5"
          )}
          onClick={() => potatoLeft > 0 && onClickPotato()}
          disabled={potatoLeft <= 0}
          aria-label={potatoLeft <= 0 ? "감자 없음" : "감자 추가"}
          title={potatoLeft <= 0 ? "감자 없음" : "냄비에 감자 넣기"}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-14 w-14 rounded-xl flex items-center justify-center text-4xl"
              aria-hidden
            >
              🥔
            </div>
            <div className="flex flex-col items-start">
              <div className="text-xs text-muted-foreground leading-tight">
                클릭해서 냄비에 넣기
              </div>
            </div>
          </div>

          <span className="shrink-0 rounded-full bg-amber-100/80 border border-amber-200 px-2 py-1 text-xs text-amber-900 shadow tabular-nums">
            ×{potatoLeft}
          </span>
        </Button>

        {/* 재료 그리드 */}
        <div
          className="
            grid gap-2
            grid-cols-3
            sm:grid-cols-4
            lg:grid-cols-5
          "
        >
          {INGREDIENTS.map((it) => {
            const have = invMap[it.title] ?? 0;
            const used = potMap[it.title as IngredientTitle] ?? 0;
            const left = Math.max(0, have - used);
            const disabled = left <= 0;

            return (
              <Button
                key={it.title}
                variant="outline"
                className={cn(
                  "group relative h-20 rounded-2xl border bg-white shadow-sm overflow-hidden",
                  "flex flex-col items-center justify-center gap-1 px-2",
                  "transition will-change-transform hover:shadow-md hover:-translate-y-0.5",
                  !disabled && "ring-1 ring-zinc-200/70",
                  disabled && "opacity-45 cursor-not-allowed"
                )}
                onClick={() =>
                  !disabled &&
                  onClickIngredient(it.title as IngredientTitle, it.emoji)
                }
                disabled={disabled}
                aria-label={
                  disabled ? `${it.title} 재고 없음` : `${it.title} 추가`
                }
                title={disabled ? "재고 없음" : "냄비에 넣기"}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 -top-10 h-16 bg-gradient-to-b from-zinc-200/45 to-transparent"
                  aria-hidden
                />
                <span className="text-3xl leading-none select-none">
                  {it.emoji}
                </span>

                <span className="absolute right-1 bottom-0 text-[10px] text-amber-700 font-semibold tabular-nums">
                  ×{left}
                </span>
              </Button>
            );
          })}
        </div>

        {/* === 완성된 요리 섹션 === */}
        <div className="mt-6">
          <div className="px-1 pb-2 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-800">완성된 요리</h3>
            <span className="text-xs text-muted-foreground">
              {cookedList.length > 0 ? `${cookedList.length}종` : "아직 없어요"}
            </span>
          </div>

          {cookedList.length === 0 ? (
            <div className="text-xs text-muted-foreground px-1">
              요리를 완성하면 이곳에 모여요.
            </div>
          ) : (
            <div
              className="
                grid gap-2
                grid-cols-2
                sm:grid-cols-3
                lg:grid-cols-4
              "
            >
              {cookedList.map((f) => {
                const emoji = RECIPE_EMOJI[f.name as RecipeName] ?? "🍽️";
                return (
                  <button
                    key={f.name}
                    onClick={() => openModal(f.name)}
                    className="relative h-20 rounded-2xl border bg-white shadow-sm overflow-hidden
                               flex flex-col items-center justify-center gap-1 px-2 hover:shadow-md hover:-translate-y-0.5 transition"
                    title={f.name}
                  >
                    <span className="text-3xl leading-none select-none">
                      {emoji}
                    </span>

                    <span className="absolute right-2 bottom-1 text-[10px] text-amber-700 font-semibold tabular-nums">
                      ×{f.num}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 모달: 완성된 요리 보기 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>완성된 요리 보기</DialogTitle>
          </DialogHeader>

          {selRecipe && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-16 w-16 rounded-2xl border bg-[#FAF7F2] grid place-items-center text-4xl">
                  {selEmoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold leading-tight">
                      {selRecipe.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-amber-800 bg-amber-50">
                      <Coins className="h-3.5 w-3.5" />
                      판매가 {selRecipe.sell}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selDesc}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={selling}
                >
                  닫기
                </Button>
                <Button onClick={onSell} disabled={selling || selCount <= 0}>
                  {selling ? "판매 중..." : "판매하기"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
