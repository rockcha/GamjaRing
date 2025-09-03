// src/features/kitchen/RightPotList.tsx
"use client";

import { INGREDIENT_EMOJI, type IngredientTitle } from "./type";
import { Button } from "@/components/ui/button";

export default function RightPotList({
  potMap,
  potPotatoes,
  onRemoveIngredient,
  onRemovePotato,
  onCook,
  canCook,
}: {
  potMap: Record<IngredientTitle, number>;
  potPotatoes: number;
  onRemoveIngredient: (t: IngredientTitle) => void;
  onRemovePotato: () => void;
  onCook: () => void;
  canCook: boolean;
}) {
  const entries = Object.entries(potMap).filter(([, n]) => n > 0) as [
    IngredientTitle,
    number
  ][];

  return (
    <div className="space-y-3">
      {/* 냄비에 담은 내용 */}
      <div className="grid grid-cols-2 gap-2">
        {potPotatoes > 0 && (
          <Button
            variant="outline"
            className="rounded-lg h-12 flex items-center justify-between"
            onClick={onRemovePotato}
            title="감자 빼기"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🥔</span>
              <span className="text-sm">감자</span>
            </div>
            <span className="font-semibold tabular-nums">×{potPotatoes}</span>
          </Button>
        )}

        {entries.length === 0 && potPotatoes === 0 && (
          <div className="col-span-2 text-sm text-muted-foreground">
            아직 넣은 재료가 없어요.
          </div>
        )}

        {entries.map(([t, n]) => (
          <Button
            key={t}
            variant="outline"
            className="rounded-lg h-12 flex items-center justify-between"
            onClick={() => onRemoveIngredient(t)}
            title={`${t} 빼기`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{INGREDIENT_EMOJI[t]}</span>
              <span className="text-sm">{t}</span>
            </div>
            <span className="font-semibold tabular-nums">×{n}</span>
          </Button>
        ))}
      </div>

      {/* 요리하기 */}
      <Button className="w-full" onClick={onCook} disabled={!canCook}>
        요리하기
      </Button>
    </div>
  );
}
