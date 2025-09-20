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
   
  );
}
