"use client";

import supabase from "@/lib/supabase";
import {
  RELATED_DISHES,
  // FAIL_RESULTS 제거! (이제 DB에서 뽑음)
  INGREDIENTS,
  type IngredientTitle,
} from "@/features/cooking/type";

/** 옵션: 권장 투입량 범위 (UI 라벨/가중치 근거로도 사용) */
export const COOK_TARGET_MIN = 10;
export const COOK_TARGET_MAX = 15;

/** 요리 가격을 안전하게 얻는 헬퍼(데이터가 없을 때 기본값 사용) */
const BASE_PRICE = 60;
const NAME_PRICE_FALLBACK: Record<string, number> = {
  // "감자스튜": 80,
  // "특제감자그라탱": 120,
};

/** 총 투입량이 많을수록 '고가 요리'의 가중치를 올려주는 함수 */
function highPriceBias(total: number) {
  // 10개부터 보너스 시작, 개당 6%씩, 최댓값 +40% (캡)
  const over = Math.max(0, total - COOK_TARGET_MIN);
  const bonus = Math.min(0.06 * over, 0.4);
  return 1 + bonus; // 1.0 ~ 1.4
}

/** (선택) 다양성 보너스: 서로 다른 재료 종류가 많으면 살짝 가산점 */
function diversityBias(counts: Record<IngredientTitle, number>) {
  const kinds = Object.values(counts).filter((v) => v > 0).length;
  // 3종 이상부터 2%씩, 최대 +14%
  const bonus = Math.min(Math.max(0, kinds - 2) * 0.02, 0.14);
  return 1 + bonus; // 1.0 ~ 1.14
}

/** 가중치 랜덤 선택 */
function weightedPick<T extends { weight: number }>(items: T[]) {
  const sum = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * sum;
  for (const it of items) {
    if ((r -= it.weight) <= 0) return it;
  }
  return items[items.length - 1];
}

/** 결과 선택 (실패시 DB에서 랜덤 실패물 뽑고, 바로 인벤토리에 +1) */
export async function chooseResult({
  order,
  counts,
  failProb,
  coupleId,
}: {
  order: IngredientTitle[];
  counts: Record<IngredientTitle, number>;
  failProb: number;
  coupleId: string; // 실패 처리 위해 필수
}): Promise<
  | { kind: "fail"; id: number; name: string; emoji: string; price: number }
  | { kind: "dish"; name: string; emoji: string; price: number }
> {
  // 1) 실패 판정 → DB RPC로 랜덤 실패물 지급
  if (Math.random() < failProb) {
    const { data, error } = await supabase.rpc(
      "give_random_fail_to_inventory",
      { p_couple_id: coupleId }
    );
    if (error || !data || data.length === 0) {
      throw new Error(
        `랜덤 실패 아이템 지급 오류: ${error?.message ?? "no data"}`
      );
    }
    const f = data[0] as {
      id: number;
      name: string;
      emoji: string;
      price: number;
    };
    return {
      kind: "fail",
      id: f.id,
      name: f.name,
      emoji: f.emoji,
      price: f.price,
    };
  }

  // 2) 대표 재료(최다 + 동률 시 먼저 넣은 것) 결정
  const entries = Object.entries(counts) as [IngredientTitle, number][];
  let best: { title: IngredientTitle; cnt: number; firstIndex: number } | null =
    null;
  for (const [t, c] of entries) {
    const firstIndex = order.indexOf(t);
    if (!best) best = { title: t, cnt: c, firstIndex };
    else if (c > best.cnt || (c === best.cnt && firstIndex < best.firstIndex))
      best = { title: t, cnt: c, firstIndex };
  }
  const title = best?.title ?? INGREDIENTS[0].title;

  // 3) 해당 재료의 요리 후보 리스트
  const rlist = (RELATED_DISHES[title] ?? []) as Array<{
    name: string;
    emoji: string;
    sellPrice?: number; // 있으면 사용, 없으면 기본가
  }>;

  // 4) "많이 넣을수록 고가 요리 확률↑" 가중치 부여
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  const hpb = highPriceBias(total);
  const dvb = diversityBias(counts);

  // 가격 기반 가중치: price^α 를 베이스로 하고 highPriceBias/diversityBias 곱
  const ALPHA = 0.9;
  const weighted = rlist.map((d) => {
    const price = d.sellPrice ?? NAME_PRICE_FALLBACK[d.name] ?? BASE_PRICE;
    const base = Math.pow(price, ALPHA);
    return { ...d, price, weight: base * hpb * dvb };
  });

  const picked = weightedPick(weighted);
  return {
    kind: "dish",
    name: picked.name,
    emoji: picked.emoji,
    price: picked.price,
  };
}

export async function getDishIdByName(name: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("dish")
    .select("id")
    .eq("이름", name)
    .maybeSingle();
  if (error) return null;
  return data?.id ?? null;
}

/** 호환용: 더 이상 사용하지 않지만, 외부 코드가 import 중이면 유지 */
export async function getFailIdByName(_name: string): Promise<number | null> {
  // 이름 기반 조회는 더 이상 쓰지 않음 (DB 랜덤 RPC로 전환)
  return null;
}
