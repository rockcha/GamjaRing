// src/features/kitchen/Inventory.tsx
"use client";

import { useMemo } from "react";
import { type IngredientTitle, INGREDIENTS } from "./type";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ShoppingBasket } from "lucide-react";

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
              재료 인벤토리
            </h2>
          </div>
        </div>
      </header>
      <Separator />

      {/* 콘텐츠 */}
      <div className="p-3">
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
      </div>
    </section>
  );
}
