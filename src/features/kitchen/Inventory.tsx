// src/features/kitchen/Inventory.tsx
"use client";

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

export default function Inventory({
  potatoCount,
  potPotatoes,
  invMap,
  stagedIngredients,
  stagedPotatoes,
  onClickIngredient,
  onClickPotato,
}: {
  potatoCount: number;
  potPotatoes: number; // 남은 감자 계산용(인벤토리 총량 - 스테이징이 아니라면 0으로 넘겨도 무관)
  invMap: Record<string, number>;
  stagedIngredients: Record<IngredientTitle, number>;
  stagedPotatoes: number;
  onClickIngredient: (title: IngredientTitle, emoji: string) => void;
  onClickPotato: () => void;
}) {
  const potatoLeft = Math.max(0, potatoCount - stagedPotatoes);

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
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                onClick={() => potatoLeft > 0 && onClickPotato()}
                disabled={potatoLeft <= 0}
                aria-label={potatoLeft <= 0 ? "감자 없음" : "감자 추가"}
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl grid place-items-center text-4xl select-none">
                    🥔
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="text-xs text-muted-foreground leading-tight">
                      클릭해서 냄비에 넣기
                    </div>
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
            className={cn(
              "grid gap-2",
              "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5"
            )}
          >
            {INGREDIENTS.map((it) => {
              const have = invMap[it.title] ?? 0;
              const staged =
                stagedIngredients[it.title as IngredientTitle] ?? 0;
              const left = Math.max(0, have - staged);
              const disabled = left <= 0;

              return (
                <Tooltip key={it.title}>
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
                        !disabled && "ring-1 ring-zinc-200/70"
                      )}
                      onClick={() =>
                        !disabled &&
                        onClickIngredient(it.title as IngredientTitle, it.emoji)
                      }
                      disabled={disabled}
                      aria-label={
                        disabled ? `${it.title} 재고 없음` : `${it.title} 추가`
                      }
                    >
                      <div
                        className="pointer-events-none absolute inset-x-0 -top-10 h-16 bg-gradient-to-b from-zinc-200/45 to-transparent"
                        aria-hidden
                      />
                      <span className="text-3xl leading-none select-none">
                        {it.emoji}
                      </span>

                      <Badge
                        variant="secondary"
                        className={cn(
                          "absolute right-0.5 bottom-0.5",
                          "px-1 py-0.5 text-[9px] leading-none rounded",
                          "font-normal tabular-nums",
                          "border border-amber-200 bg-amber-50 text-amber-800"
                        )}
                      >
                        ×{left}
                      </Badge>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {disabled ? "재고 없음" : "냄비에 넣기"}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* 현재 넣은 재료 섹션 */}
          <Separator className="my-4" />
          <div>
            <div className="text-sm font-medium text-amber-900 mb-2">
              현재 넣은 재료
            </div>
            <div className="flex flex-wrap gap-2">
              {stagedPotatoes > 0 && (
                <Badge className="bg-white text-amber-900 border-amber-200">
                  🥔 ×{stagedPotatoes}
                </Badge>
              )}
              {INGREDIENTS.map((it) => {
                const cnt = stagedIngredients[it.title as IngredientTitle] ?? 0;
                if (cnt <= 0) return null;
                return (
                  <Badge
                    key={`staged-${it.title}`}
                    className="bg-white text-amber-900 border-amber-200"
                  >
                    {it.emoji} ×{cnt}
                  </Badge>
                );
              })}
              {stagedPotatoes === 0 &&
                INGREDIENTS.every(
                  (it) =>
                    (stagedIngredients[it.title as IngredientTitle] ?? 0) === 0
                ) && (
                  <span className="text-xs text-muted-foreground">
                    아직 넣은 재료가 없어요.
                  </span>
                )}
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
