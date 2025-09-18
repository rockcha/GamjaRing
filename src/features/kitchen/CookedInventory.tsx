// src/features/kitchen/CookedInventory.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { RECIPES, RECIPE_EMOJI, getFoodDesc, type RecipeName } from "./type";
import { fetchKitchen, type FoodRow, addCookedFood } from "./kitchenApi";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Coins, Pizza } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function CookedInventory({ className }: { className?: string }) {
  const { couple, addGold } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [open, setOpen] = useState(false);
  const [selName, setSelName] = useState<RecipeName | null>(null);
  const [selling, setSelling] = useState(false);

  // name → recipe 매핑 (판매가 등)
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

  const selRecipe = selName ? RECIPE_BY_NAME[selName] : undefined;
  const selEmoji = selName ? RECIPE_EMOJI[selName] : undefined;
  const selDesc = selName ? getFoodDesc(selName) : "";
  const selCount = selName
    ? foods.find((f) => f.name === selName)?.num ?? 0
    : 0;

  useEffect(() => {
    if (!coupleId) return;
    (async () => {
      const k = await fetchKitchen(coupleId);
      setFoods(k.foods ?? []);
    })();
  }, [coupleId]);

  function openModal(name: string) {
    setSelName(name as RecipeName);
    setOpen(true);
  }

  async function onSell() {
    if (!coupleId || !selRecipe || !selName) return;
    if (selCount <= 0) return;

    try {
      setSelling(true);
      // 1) 골드 지급
      addGold?.(selRecipe.sell);
      // 2) DB 수량 -1
      await addCookedFood(coupleId, selName, -1);
      // 3) 로컬 상태 업데이트
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
    <section
      className={cn("w-full rounded-2xl border bg-white shadow-sm", className)}
    >
      <header>
        <div className="flex items-center justify-start text-amber-900 px-4 py-3">
          <Pizza className="h-6 w-6 mr-2 " />
          <h2 className="text-base font-semibold tracking-tight ">
            요리 인벤토리
          </h2>
        </div>
      </header>
      <Separator />

      <div className="p-3">
        <div className="px-1 pb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-800">요리</h3>
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
              grid gap-3
              grid-cols-3
              sm:grid-cols-5
              md:grid-cols-7
              lg:grid-cols-9
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
                    {getFoodDesc(selRecipe.name as RecipeName) || ""}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={onSell}
                  disabled={selling || selCount <= 0}
                >
                  {selling ? "판매 중..." : "판매하기"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={selling}
                >
                  닫기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
