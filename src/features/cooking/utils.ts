export type IngredientItem = { name: string; source: "preset" | "custom" };

export const COMMON_INGREDIENTS = [
  "감자",
  "고구마",
  "당근",
  "양파",
  "마늘",
  "대파",
  "버섯",
  "토마토",
  "달걀",
  "우유",
  "치즈",
  "돼지고기",
  "소고기",
  "닭고기",
  "두부",
  "김치",
  "라면",
  "쌀",
  "파스타면",
  "참치캔",
  "스팸",
  "고추장",
  "된장",
  "간장",
  "카레가루",
] as const;

const EMOJI_MAP: Record<string, string> = {
  감자: "🥔",
  고구마: "🍠",
  당근: "🥕",
  양파: "🧅",
  마늘: "🧄",
  대파: "🥬",
  버섯: "🍄",
  토마토: "🍅",
  달걀: "🥚",
  우유: "🥛",
  치즈: "🧀",
  돼지고기: "🍖",
  소고기: "🥩",
  닭고기: "🍗",
  두부: "🍲",
  김치: "🥬",
  라면: "🍜",
  쌀: "🍚",
  파스타면: "🍝",
  참치캔: "🥫",
  스팸: "🥫",
  고추장: "🌶️",
  된장: "🥣",
  간장: "🧂",
  카레가루: "🍛",
};
const fallbackEmoji = "🍳";

export const getEmoji = (name: string): string => {
  for (const k of Object.keys(EMOJI_MAP)) {
    if (name.includes(k)) return EMOJI_MAP[k] ?? fallbackEmoji;
  }
  return fallbackEmoji;
};

export const normalize = (s: string) => s.trim();

/* ---------- 랜덤 레시피 이름 (중복횟수=가중치) ---------- */
const METHODS = [
  "구이",
  "볶음",
  "조림",
  "전",
  "스튜",
  "샐러드",
  "덮밥",
  "파스타",
  "전골",
  "튀김",
  "찜",
  "탕",
  "국",
  "수프",
  "나베",
  "카레",
  "리소토",
  "솥밥",
  "볶음밥",
  "죽",
  "오므라이스",
  "비빔",
  "무침",
  "비빔국수",
  "비빔면",
  "라면볶이",
  "구운채소",
  "오븐구이",
  "바베큐",
  "로스트",
  "스테이크",
  "그라탱",
  "수비드",
  "소테",
  "마리네이드",
  "절임",
  "피클",
] as const;

const VIBES = [
  "든든한",
  "가벼운",
  "매콤한",
  "달큼한",
  "고소한",
  "촉촉한",
  "바삭한",
  "담백한",
  "진한",
  "향긋한",
  "구수한",
  "얼큰한",
  "시원한",
  "새콤한",
  "짭짤한",
  "감칠맛나는",
  "부드러운",
  "쫄깃한",
  "포슬한",
  "풍미가득한",
  "은은한",
  "버터향가득한",
  "마늘향가득한",
  "달콤짭짤한",
  "매콤달콤한",
  "훈연향나는",
  "깔끔한",
  "포근한",
  "따뜻한",
  "화끈한",
] as const;

const pick = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]!;
const shuffle = <T>(arr: readonly T[]) =>
  [...arr].sort(() => Math.random() - 0.5);

export function makeRecipeName(items: IngredientItem[]): string {
  // 중복 허용: 배열 그대로 사용 → 등장 횟수만큼 확률 ↑
  const customs = items.filter((i) => i.source === "custom").map((i) => i.name);
  const all = items.map((i) => i.name);

  // 커스텀이 하나라도 있으면 커스텀 pool 위주
  const pool = customs.length ? customs : all;
  if (pool.length === 0) return "랜덤 미니 요리";

  const base = pick(pool); // 가중치 선택
  // 보조 재료는 겹치지 않게 최대 3개 (표시는 유니크)
  const uniqueOthers = Array.from(new Set(pool.filter((n) => n !== base)));
  const others = shuffle(uniqueOthers).slice(
    0,
    Math.min(3, uniqueOthers.length)
  );

  const vibe = pick(VIBES);
  const method = pick(METHODS);
  const tail = others.length ? `와(과) ${others.join(", ")}` : "";
  return `${vibe} ${base}${tail} ${method}`;
}
