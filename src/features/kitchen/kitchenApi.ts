// src/features/kitchen/kitchenApi.ts
"use client";

import supabase from "@/lib/supabase";
import {
  INGREDIENT_TITLES,
  type IngredientTitle,
  RECIPES_NORM,
  type Recipe,
} from "./type";

export type IngredientRow = { title: string; num: number };
export type FoodRow = { name: string; num: number };

type KitchenRow = {
  couple_id: string;
  ingredients: IngredientRow[];
  foods: FoodRow[];
};

const DEFAULT_INGREDIENTS: IngredientRow[] = INGREDIENT_TITLES.map((t) => ({
  title: t,
  num: 0,
}));
const DEFAULT_FOODS: FoodRow[] = RECIPES_NORM.map((r) => ({
  name: r.name,
  num: 0,
}));

/** couple_kitchen 행 보장 (DB RPC 사용) */
export async function ensureKitchenRow(coupleId: string): Promise<void> {
  const { error } = await supabase.rpc("initialize_couple_kitchen", {
    p_couple_id: coupleId,
  });
  if (error) throw error;
}

/** 인벤토리 조회 */
export async function fetchKitchen(coupleId: string): Promise<KitchenRow> {
  await ensureKitchenRow(coupleId);
  const { data, error } = await supabase
    .from("couple_kitchen")
    .select("couple_id, ingredients, foods")
    .eq("couple_id", coupleId)
    .single();
  if (error) throw error;

  const normIng: IngredientRow[] = Array.isArray(data.ingredients)
    ? data.ingredients
    : DEFAULT_INGREDIENTS;
  const normFoods: FoodRow[] = Array.isArray(data.foods)
    ? data.foods
    : DEFAULT_FOODS;

  return { couple_id: coupleId, ingredients: normIng, foods: normFoods };
}

/** 재료 '여러 개' 추가: items 배열의 각 재료를 +1 */
export async function addIngredients(
  coupleId: string,
  items: IngredientTitle[]
): Promise<void> {
  if (!coupleId || !items || items.length === 0) return;

  const cur = await fetchKitchen(coupleId);

  const tally = items.reduce<Record<IngredientTitle, number>>((acc, t) => {
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {} as Record<IngredientTitle, number>);

  const nextIngredients = cur.ingredients.map((row) => {
    const title = row.title as IngredientTitle;
    const inc = tally[title] ?? 0;
    return inc > 0 ? { ...row, num: row.num + inc } : row;
  });

  const { error } = await supabase
    .from("couple_kitchen")
    .update({ ingredients: nextIngredients })
    .eq("couple_id", coupleId);
  if (error) throw error;
}

/** 재료 차감(need: {title: 수량}) */
export async function consumeIngredients(
  coupleId: string,
  need: Record<IngredientTitle, number>
) {
  const cur = await fetchKitchen(coupleId);
  const next = cur.ingredients.map((it) =>
    need[it.title as IngredientTitle]
      ? { ...it, num: Math.max(0, it.num - need[it.title as IngredientTitle]) }
      : it
  );
  const { error } = await supabase
    .from("couple_kitchen")
    .update({ ingredients: next })
    .eq("couple_id", coupleId);
  if (error) throw error;
}

/** 완성 요리 +delta (foods 배열에서 name으로 증가) */
export async function addCookedFood(coupleId: string, name: string, delta = 1) {
  const cur = await fetchKitchen(coupleId);
  const found = cur.foods.find((f) => f.name === name);

  const next = found
    ? cur.foods.map((f) =>
        f.name === name ? { ...f, num: Math.max(0, f.num + delta) } : f
      )
    : [...cur.foods, { name, num: Math.max(0, delta) }];

  const { error } = await supabase
    .from("couple_kitchen")
    .update({ foods: next })
    .eq("couple_id", coupleId);

  if (error) throw error;
  return next;
}

/** 감자 개수 조회 */
export async function getPotatoCount(coupleId: string): Promise<number> {
  const { data, error } = await supabase
    .from("couple_potato_field")
    .select("harvested_count")
    .eq("couple_id", coupleId)
    .maybeSingle();
  if (error) throw error;
  return (data?.harvested_count ?? 0) as number;
}

/** 감자 차감 (요리 시) */
export async function usePotatoes(
  coupleId: string,
  delta: number
): Promise<void> {
  if (delta <= 0) return;
  const { data, error } = await supabase
    .from("couple_potato_field")
    .select("harvested_count")
    .eq("couple_id", coupleId)
    .maybeSingle();
  if (error) throw error;
  const current = data?.harvested_count ?? 0;
  const next = Math.max(0, current - delta);
  const { error: e2 } = await supabase
    .from("couple_potato_field")
    .update({ harvested_count: next })
    .eq("couple_id", coupleId);
  if (e2) throw e2;
}

/** 레시피 요구량 → 맵으로 */
export function recipeNeedMap(r: Recipe): Record<IngredientTitle, number> {
  const m: Record<IngredientTitle, number> = {} as any;
  for (const { title, qty } of r.ingredients) {
    m[title] = (m[title] ?? 0) + qty;
  }
  return m;
}

/** 현재 냄비 재료 조합이 어떤 레시피와 '정확히' 일치하는지 (수량 포함) */
export function matchRecipe(
  potMap: Record<IngredientTitle, number>,
  recipes: readonly Recipe[] = RECIPES_NORM
): Recipe | null {
  const entries = Object.entries(potMap).filter(([, n]) => n > 0) as [
    IngredientTitle,
    number
  ][];

  for (const r of recipes) {
    if (r.ingredients.length !== entries.length) continue;
    const ok = r.ingredients.every(
      ({ title, qty }) => (potMap[title] ?? 0) === qty
    );
    if (ok) return r;
  }
  return null;
}

/** 요리 가능 판정(≥ 규칙) */
export function canCookWith(
  r: Recipe,
  potMap: Record<IngredientTitle, number>,
  potatoCount: number
) {
  if (potatoCount < r.potato) return false;
  return r.ingredients.every(({ title, qty }) => (potMap[title] ?? 0) >= qty);
}

/** 요리 확정: 감자/재료 차감 + 완성 요리 증가 */
export async function cookRecipe(coupleId: string, recipe: Recipe) {
  await usePotatoes(coupleId, recipe.potato);
  await consumeIngredients(coupleId, recipeNeedMap(recipe));
  await addCookedFood(coupleId, recipe.name, 1);
}

/** 이모지 스티커 수집 */
export async function addFoodEmojiToCollection(
  coupleId: string,
  recipeName: string,
  emoji: string
) {
  const title = `food:${recipeName}`;
  const now = new Date().toISOString();

  const { data: exists, error: selErr } = await supabase
    .from("sticker_inventory")
    .select("qty")
    .eq("couple_id", coupleId)
    .eq("title", title)
    .maybeSingle();

  if (selErr) throw selErr;

  if (exists) {
    const { error: updErr } = await supabase
      .from("sticker_inventory")
      .update({
        qty: (exists.qty ?? 0) + 1,
        updated_at: now as any,
      })
      .eq("couple_id", coupleId)
      .eq("title", title);
    if (updErr) throw updErr;
  } else {
    const { error: insErr } = await supabase.from("sticker_inventory").insert({
      couple_id: coupleId,
      title,
      type: "emoji",
      emoji,
      url: null,
      qty: 1,
      base_w: 80,
      base_h: 80,
      created_at: now as any,
      updated_at: now as any,
    });
    if (insErr) throw insErr;
  }
}
