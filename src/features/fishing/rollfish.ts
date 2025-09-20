// src/features/aquarium/rollFish.ts
import supabase from "@/lib/supabase";
import type { IngredientTitle } from "@/features/kitchen/type";

export type FishRarity = "일반" | "희귀" | "에픽" | "전설";

const ROLL_TABLE: Array<{ key: "FAIL" | FishRarity; weight: number }> = [
  { key: "FAIL", weight: 60 },
  { key: "일반", weight: 30 },
  { key: "희귀", weight: 8.5 },
  { key: "에픽", weight: 1.3 },
  { key: "전설", weight: 0.2 },
];

function rollKey(): "FAIL" | FishRarity {
  const total = ROLL_TABLE.reduce((s, r) => s + r.weight, 0);
  let t = Math.random() * total;
  for (const r of ROLL_TABLE) {
    if (t < r.weight) return r.key;
    t -= r.weight;
  }
  return "FAIL";
}

export type RollResult =
  | { ok: true; rarity: FishRarity; fishId: string }
  | { ok: false };

export async function rollFishByIngredient(
  _ingredient: IngredientTitle // 현재 로직에서는 사용하지 않음 (호환성 유지)
): Promise<RollResult> {
  const key = rollKey();
  if (key === "FAIL") return { ok: false };

  // ✅ RPC로 희귀도 풀에서 DB가 랜덤 1개 선택
  const { data, error } = await supabase.rpc<string>(
    "pick_random_entity_by_rarity",
    { p_rarity: key }
  );

  if (error) {
    console.warn("rollFish rpc error:", error);
    return { ok: false };
  }
  if (!data) return { ok: false }; // 해당 희귀도에 후보가 없을 때

  return { ok: true, rarity: key, fishId: data };
}

/** id만 필요할 때 (실패 시 null) */
export async function rollFishIdByIngredient(
  ingredient: IngredientTitle
): Promise<string | null> {
  const r = await rollFishByIngredient(ingredient);
  return r.ok ? r.fishId : null;
}
