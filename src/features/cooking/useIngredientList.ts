"use client";
import { useState } from "react";
import { normalize } from "./utils";
import type { IngredientItem } from "./utils";

/** 중복 허용: 같은 이름 여러 번 push */
export function useIngredientList() {
  const [items, setItems] = useState<IngredientItem[]>([]);

  const add = (name: string, source: IngredientItem["source"]) => {
    const v = normalize(name);
    if (!v) return;
    setItems((prev) => [...prev, { name: v, source }]);
  };

  /** 동일 이름이 여러 개면 '첫 번째 것'만 제거 */
  const removeAt = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clear = () => setItems([]);

  return { items, add, removeAt, clear };
}
