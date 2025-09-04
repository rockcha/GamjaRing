// src/features/aquarium/rollFish.ts
import { FISHES, type FishRarity } from "./fishes";
import type { IngredientTitle } from "@/features/kitchen/type";

/** 등급/실패 가중치 (합 100) */
const ROLL_TABLE: Array<{ key: "FAIL" | FishRarity; weight: number }> = [
  { key: "FAIL", weight: 40 },
  { key: "일반", weight: 40 },
  { key: "희귀", weight: 15 },
  { key: "에픽", weight: 4 },
  { key: "전설", weight: 1 },
];

export type RollOptions = {
  /** 야생 포함 여부 (기본 true) */
  includeWild?: boolean;
  /** 테스트/리플레이용 RNG 주입 (기본 Math.random) */
  rng?: () => number;
};

export type RollResult =
  | { ok: true; rarity: FishRarity; fishId: string }
  | { ok: false }; // 실패

/** 내부: 가중치 추첨 */
function rollKey(rng: () => number): "FAIL" | FishRarity {
  const total = ROLL_TABLE.reduce((s, r) => s + r.weight, 0); // 100
  let t = rng() * total; // [0, 100)
  for (const row of ROLL_TABLE) {
    if (t < row.weight) return row.key;
    t -= row.weight;
  }
  return "FAIL";
}

/**
 * 재료를 넣고 확률 기반으로 물고기 id를 뽑는다.
 * 1) 등급/실패 가챠 → 2) 등급+재료 풀에서 랜덤 선택 → 3) id 반환
 *    ※ 선택 등급에 재료 매칭 풀이 없으면 무조건 실패 처리
 */
export function rollFishByIngredient(
  ingredient: IngredientTitle,
  opts: RollOptions = {}
): RollResult {
  const { includeWild = true, rng = Math.random } = opts;

  const key = rollKey(rng);
  if (key === "FAIL") return { ok: false };

  // (선택된 등급) + (재료 일치) + (야생 포함 옵션)
  const pool = FISHES.filter(
    (f) =>
      f.rarity === key &&
      f.ingredient === ingredient &&
      (includeWild || !f.isWild)
  );

  if (pool.length === 0) return { ok: false };

  const pick = pool[Math.floor(rng() * pool.length)];
  return { ok: true, rarity: key, fishId: pick.id };
}

/** id만 원하면 이 헬퍼 사용 (실패 시 null) */
export function rollFishIdByIngredient(
  ingredient: IngredientTitle,
  opts?: RollOptions
): string | null {
  const res = rollFishByIngredient(ingredient, opts);
  return res.ok ? res.fishId : null;
}
