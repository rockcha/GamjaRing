/** ===== 기존 import에서 RELATED_DISHES, NAME_PRICE_FALLBACK, BASE_PRICE 등 정리 ===== */
import supabase from "@/lib/supabase";
import { INGREDIENTS, type IngredientTitle } from "@/features/cooking/type";

export const COOK_TARGET_MIN = 10;
export const COOK_TARGET_MAX = 15;

const BASE_PRICE = 60; // 가격 누락 시 기본값

function highPriceBias(total: number) {
  const over = Math.max(0, total - COOK_TARGET_MIN);
  const bonus = Math.min(0.06 * over, 0.4);
  return 1 + bonus;
}

function diversityBias(counts: Record<IngredientTitle, number>) {
  const kinds = Object.values(counts).filter((v) => v > 0).length;
  const bonus = Math.min(Math.max(0, kinds - 2) * 0.02, 0.14);
  return 1 + bonus;
}

function weightedPick<T extends { weight: number }>(items: T[]) {
  const sum = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * sum;
  for (const it of items) {
    if ((r -= it.weight) <= 0) return it;
  }
  return items[items.length - 1];
}

/** DB에서 대표재료 기준으로 요리 후보 읽기 (없으면 전체에서) */
async function fetchDishCandidates(rep: string) {
  // 1) 대표재료 일치하는 것 우선
  let { data, error } = await supabase
    .from("dish")
    .select("id, 이름, 이모지, 가격, 대표재료")
    .eq("대표재료", rep);

  if (error) throw new Error(`dish 후보 조회 실패: ${error.message}`);

  // 2) 만약 대표재료 매칭이 하나도 없다면 전체에서 후보기반
  if (!data || data.length === 0) {
    const all = await supabase
      .from("dish")
      .select("id, 이름, 이모지, 가격, 대표재료");
    if (all.error) throw new Error(`dish 전체 조회 실패: ${all.error.message}`);
    data = all.data ?? [];
  }
  return data.map((d) => ({
    id: d.id as number,
    name: d.이름 as string,
    emoji: (d.이모지 as string) ?? "🍽️",
    price: (d.가격 as number) ?? BASE_PRICE,
  }));
}

/** 결과 선택 */
export async function chooseResult({
  order,
  counts,
  failProb,
  coupleId,
}: {
  order: IngredientTitle[];
  counts: Record<IngredientTitle, number>;
  failProb: number;
  coupleId: string;
}): Promise<
  | { kind: "fail"; id: number; name: string; emoji: string; price: number }
  | { kind: "dish"; name: string; emoji: string; price: number }
> {
  // 1) 실패 처리 (기존 그대로)
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

  // 2) 대표 재료 산정 (기존 로직 유지)
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

  // 3) DB에서 후보 읽고 가격 기반 가중치 적용
  const candidates = await fetchDishCandidates(title);
  if (candidates.length === 0) {
    throw new Error(
      "선택 가능한 요리 후보가 없습니다. dish 테이블을 확인하세요."
    );
  }

  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  const hpb = highPriceBias(total);
  const dvb = diversityBias(counts);
  const ALPHA = 0.9;

  const weighted = candidates.map((d) => {
    const base = Math.pow(d.price ?? BASE_PRICE, ALPHA);
    return { ...d, weight: base * hpb * dvb };
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
