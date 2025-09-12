// src/features/aquarium/rollFish.ts
import supabase from "@/lib/supabase";
import type { IngredientTitle } from "@/features/kitchen/type";

export type FishRarity = "일반" | "희귀" | "에픽" | "전설";

const ROLL_TABLE: Array<{ key: "FAIL" | FishRarity; weight: number }> = [
  { key: "FAIL", weight: 40 },
  { key: "일반", weight: 40 },
  { key: "희귀", weight: 15 },
  { key: "에픽", weight: 4 },
  { key: "전설", weight: 1 },
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
  ingredient: IngredientTitle
): Promise<RollResult> {
  const key = rollKey();
  if (key === "FAIL") return { ok: false };

  // DB에서 후보 풀 조회 (필요한 칼럼만)
  const { data, error } = await supabase
    .from("aquarium_entities")
    .select("id")
    .eq("rarity", key) // enum/텍스트 컬럼에 맞춰 그대로 비교
    .eq("food", ingredient);

  if (error) {
    console.warn("rollFish query error:", error);
    return { ok: false };
  }
  if (!data || data.length === 0) return { ok: false };

  const pick = data[Math.floor(Math.random() * data.length)];
  return { ok: true, rarity: key, fishId: pick?.id };
}

/** id만 원하면 이 헬퍼 사용 (실패 시 null) */
export async function rollFishIdByIngredient(
  ingredient: IngredientTitle
): Promise<string | null> {
  const r = await rollFishByIngredient(ingredient);
  return r.ok ? r.fishId : null;
}
