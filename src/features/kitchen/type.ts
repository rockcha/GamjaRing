// src/features/kitchen/type.ts

/**
 * Kitchen domain (refactored)
 * - 재료: 15종 고정
 * - 레시피: 감자 1|2, 재료는 {title, qty}
 * - 등급별 총 재료수: 초급 6, 중급 10, 고급 14 (레시피별 합계 기준)
 */

export const INGREDIENTS = [
  { title: "소금", emoji: "🧂" },
  { title: "버터", emoji: "🧈" },
  { title: "꿀", emoji: "🍯" },
  { title: "우유", emoji: "🥛" },
  { title: "치즈", emoji: "🧀" },
  { title: "베이컨", emoji: "🥓" },
  { title: "계란", emoji: "🥚" },
  { title: "양파", emoji: "🧅" },
  { title: "밀", emoji: "🌾" },
  { title: "얼음", emoji: "🧊" },
  { title: "플랫브레드", emoji: "🫓" },
  { title: "고기", emoji: "🍖" },
  { title: "망고", emoji: "🥭" },
  { title: "케찹", emoji: "🥫" },
  { title: "녹색채소", emoji: "🥬" },
] as const;

export type IngredientTitle = (typeof INGREDIENTS)[number]["title"];
export type Ingredient = (typeof INGREDIENTS)[number];

export const INGREDIENT_TITLES: readonly IngredientTitle[] = INGREDIENTS.map(
  (i) => i.title
) as IngredientTitle[];

export const INGREDIENT_EMOJI: Record<IngredientTitle, string> =
  Object.fromEntries(INGREDIENTS.map((i) => [i.title, i.emoji])) as Record<
    IngredientTitle,
    string
  >;

/** 난이도(등급) */
export type RecipeGrade = "초급" | "중급" | "고급";
export const GRADE_LABEL: Record<RecipeGrade, string> = {
  초급: "쉬움",
  중급: "보통",
  고급: "어려움",
};

/** 레시피 모델 */
export type RecipeIngredient = { title: IngredientTitle; qty: number };
export type Recipe = {
  name: string;
  emoji: string; // 단일 이모지
  grade: RecipeGrade;
  potato: 1 | 2; // ✅ 1~2
  ingredients: RecipeIngredient[]; // ✅ 수량 포함
  sell: number; // 판매가(골드)
};

/**
 * 재료 수량 규칙
 * - 초급: 합계 6 → (2재료면 3,3) / (3재료면 2,2,2)
 * - 중급: 합계 10 → (3재료 4,3,3) / (4재료 3,3,2,2)
 * - 고급: 합계 14 → (4재료 4,4,3,3) / (5재료 3,3,3,3,2)
 */
export const RECIPES: readonly Recipe[] = [
  // ── 초급(합계 6) ──
  {
    name: "프렌치 프라이",
    emoji: "🍟",
    grade: "초급",
    potato: 1,
    ingredients: [
      { title: "케찹", qty: 3 },
      { title: "소금", qty: 3 },
    ],
    sell: 35,
  },
  {
    name: "감자 바게트",
    emoji: "🥖",
    grade: "초급",
    potato: 2,
    ingredients: [
      { title: "밀", qty: 3 },
      { title: "우유", qty: 3 },
    ],
    sell: 35,
  },
  {
    name: "감자 토스트",
    emoji: "🍞",
    grade: "초급",
    potato: 1,
    ingredients: [
      { title: "밀", qty: 3 },
      { title: "꿀", qty: 3 },
    ],
    sell: 34,
  },
  {
    name: "감자 아이스크림",
    emoji: "🍦",
    grade: "초급",
    potato: 1,
    ingredients: [
      { title: "얼음", qty: 3 },
      { title: "꿀", qty: 3 },
    ],
    sell: 33,
  },
  {
    name: "감자전",
    emoji: "🥘",
    grade: "초급",
    potato: 2,
    ingredients: [
      { title: "밀", qty: 3 },
      { title: "계란", qty: 3 },
    ],
    sell: 34,
  },
  {
    name: "망고쥬스",
    emoji: "🍹",
    grade: "초급",
    potato: 1,
    ingredients: [
      { title: "망고", qty: 3 },
      { title: "얼음", qty: 3 },
    ],
    sell: 31,
  },
  {
    name: "감자맥주",
    emoji: "🍺",
    grade: "초급",
    potato: 2,
    ingredients: [
      { title: "밀", qty: 3 },
      { title: "얼음", qty: 3 },
    ],
    sell: 33,
  },
  {
    name: "감자초콜렛",
    emoji: "🍫",
    grade: "초급",
    potato: 1,
    ingredients: [
      { title: "꿀", qty: 3 },
      { title: "얼음", qty: 3 },
    ],
    sell: 28,
  },
  {
    name: "감자도넛",
    emoji: "🍩",
    grade: "초급",
    potato: 1,
    ingredients: [
      { title: "버터", qty: 2 },
      { title: "꿀", qty: 2 },
      { title: "밀", qty: 2 },
    ],
    sell: 38,
  },
  {
    name: "감자버블티",
    emoji: "🧋",
    grade: "초급",
    potato: 1,
    ingredients: [
      { title: "우유", qty: 2 },
      { title: "꿀", qty: 2 },
      { title: "얼음", qty: 2 },
    ],
    sell: 37,
  },

  // ── 중급(합계 10) ──
  {
    name: "감자 샌드위치",
    emoji: "🥪",
    grade: "중급",
    potato: 2,
    ingredients: [
      { title: "밀", qty: 3 },
      { title: "치즈", qty: 3 },
      { title: "케찹", qty: 2 },
      { title: "녹색채소", qty: 2 },
    ],
    sell: 62,
  },
  {
    name: "감자 와플",
    emoji: "🧇",
    grade: "중급",
    potato: 2,
    ingredients: [
      { title: "계란", qty: 4 },
      { title: "우유", qty: 3 },
      { title: "버터", qty: 3 },
    ],
    sell: 59,
  },
  {
    name: "감자 핫도그",
    emoji: "🌭",
    grade: "중급",
    potato: 1,
    ingredients: [
      { title: "밀", qty: 4 },
      { title: "고기", qty: 3 },
      { title: "케찹", qty: 3 },
    ],
    sell: 55,
  },
  {
    name: "감자 샐러드",
    emoji: "🥗",
    grade: "중급",
    potato: 2,
    ingredients: [
      { title: "망고", qty: 3 },
      { title: "양파", qty: 3 },
      { title: "녹색채소", qty: 4 },
    ],
    sell: 60,
  },
  {
    name: "감자 오믈렛",
    emoji: "🍳",
    grade: "중급",
    potato: 2,
    ingredients: [
      { title: "계란", qty: 4 },
      { title: "버터", qty: 3 },
      { title: "양파", qty: 3 },
    ],
    sell: 63,
  },
  {
    name: "감자버거",
    emoji: "🍔",
    grade: "중급",
    potato: 2,
    ingredients: [
      { title: "녹색채소", qty: 3 },
      { title: "양파", qty: 3 },
      { title: "플랫브레드", qty: 4 },
    ],
    sell: 64,
  },
  {
    name: "감자만두",
    emoji: "🥟",
    grade: "중급",
    potato: 2,
    ingredients: [
      { title: "밀", qty: 6 },
      { title: "고기", qty: 4 },
    ],
    sell: 62,
  },
  {
    name: "감자 팬케이크",
    emoji: "🥞",
    grade: "중급",
    potato: 1,
    ingredients: [
      { title: "플랫브레드", qty: 2 },
      { title: "꿀", qty: 2 },
      { title: "버터", qty: 3 },
      { title: "계란", qty: 3 },
    ],
    sell: 68,
  },
  {
    name: "감자 소금빵",
    emoji: "🥐",
    grade: "중급",
    potato: 1,
    ingredients: [
      { title: "소금", qty: 3 },
      { title: "밀", qty: 3 },
      { title: "계란", qty: 4 },
    ],
    sell: 65,
  },
  {
    name: "감자 냉사케",
    emoji: "🍶",
    grade: "중급",
    potato: 1,
    ingredients: [{ title: "얼음", qty: 10 }],
    sell: 60,
  },

  // ── 고급(합계 14) ──
  {
    name: "포테이토 피자",
    emoji: "🍕",
    grade: "고급",
    potato: 2,
    ingredients: [
      { title: "플랫브레드", qty: 4 },
      { title: "치즈", qty: 4 },
      { title: "양파", qty: 3 },
      { title: "베이컨", qty: 3 },
    ],
    sell: 80,
  },
  {
    name: "감자 타코",
    emoji: "🌮",
    grade: "고급",
    potato: 2,
    ingredients: [
      { title: "플랫브레드", qty: 3 },
      { title: "고기", qty: 3 },
      { title: "녹색채소", qty: 4 },
      { title: "치즈", qty: 4 },
    ],
    sell: 82,
  },
  {
    name: "감자 부리또",
    emoji: "🌯",
    grade: "고급",
    potato: 2,
    ingredients: [
      { title: "플랫브레드", qty: 3 },
      { title: "고기", qty: 4 },
      { title: "치즈", qty: 3 },
      { title: "녹색채소", qty: 4 },
    ],
    sell: 86,
  },
  {
    name: "감자 퐁듀",
    emoji: "🫕",
    grade: "고급",
    potato: 2,
    ingredients: [
      { title: "치즈", qty: 4 },
      { title: "우유", qty: 4 },
      { title: "밀", qty: 3 },
      { title: "버터", qty: 3 },
    ],
    sell: 85,
  },
  {
    name: "감자 망고빙수",
    emoji: "🍨",
    grade: "고급",
    potato: 1,
    ingredients: [
      { title: "꿀", qty: 3 },
      { title: "얼음", qty: 3 },
      { title: "망고", qty: 4 },
      { title: "우유", qty: 4 },
    ],
    sell: 90,
  },
  {
    name: "감자면",
    emoji: "🍜",
    grade: "고급",
    potato: 1,
    ingredients: [
      { title: "밀", qty: 4 },
      { title: "소금", qty: 3 },
      { title: "계란", qty: 3 },
      { title: "고기", qty: 4 },
    ],
    sell: 84,
  },
  {
    name: "감자카레",
    emoji: "🍛",
    grade: "고급",
    potato: 2,
    ingredients: [
      { title: "소금", qty: 3 },
      { title: "고기", qty: 3 },
      { title: "녹색채소", qty: 4 },
      { title: "베이컨", qty: 4 },
    ],
    sell: 88,
  },
  {
    name: "감자케밥",
    emoji: "🥙",
    grade: "고급",
    potato: 2,
    ingredients: [
      { title: "플랫브레드", qty: 3 },
      { title: "고기", qty: 4 },
      { title: "녹색채소", qty: 3 },
      { title: "양파", qty: 4 },
    ],
    sell: 90,
  },
  {
    name: "감자전골탕",
    emoji: "🍲",
    grade: "고급",
    potato: 2,
    ingredients: [
      { title: "소금", qty: 4 },
      { title: "고기", qty: 5 },
      { title: "양파", qty: 5 },
    ],
    sell: 86,
  },
  {
    name: "감자경단",
    emoji: "🍡",
    grade: "고급",
    potato: 1,
    ingredients: [
      { title: "계란", qty: 3 },
      { title: "고기", qty: 3 },
      { title: "밀", qty: 4 },
      { title: "베이컨", qty: 2 },
      { title: "꿀", qty: 2 },
    ],
    sell: 80,
  },
] as const;

/** 등급별 그룹 */
export const RECIPES_BY_GRADE: Record<RecipeGrade, Recipe[]> = {
  초급: RECIPES.filter((r) => r.grade === "초급"),
  중급: RECIPES.filter((r) => r.grade === "중급"),
  고급: RECIPES.filter((r) => r.grade === "고급"),
};

/** 이름 유니온 */
export type RecipeName = (typeof RECIPES)[number]["name"];

/** 이름 → 이모지 매핑 (UI 재사용) */
export const RECIPE_EMOJI: Record<RecipeName, string> = Object.fromEntries(
  RECIPES.map((r) => [r.name as RecipeName, r.emoji])
) as Record<RecipeName, string>;

/** 음식 한줄 설명 (기존 유지) */
export type FoodInfo = { name: RecipeName; desc: string };
export const FOOD_META: Record<RecipeName, FoodInfo> = {
  "프렌치 프라이": {
    name: "프렌치 프라이",
    desc: "겉은 바삭, 속은 크리미. 케찹 한 점에 사라지는 시간 도둑.",
  },
  "감자 바게트": {
    name: "감자 바게트",
    desc: "밀향 가득한 바게트에 감자의 담백함을 더했다.",
  },
  "감자 토스트": {
    name: "감자 토스트",
    desc: "달큰한 꿀과 바삭한 토스트, 그 위에 포근한 감자 풍미.",
  },
  "감자 아이스크림": {
    name: "감자 아이스크림",
    desc: "차갑지만 마음은 따뜻해지는 달달한 감자 크림 디저트.",
  },
  감자전: {
    name: "감자전",
    desc: "노릇노릇, 뒤집는 순간이 하이라이트인 국민 간식.",
  },
  망고쥬스: {
    name: "망고쥬스",
    desc: "잘 익은 망고와 살얼음이 만든 열대의 한 컵, 달콤 상큼 쭉—.",
  },
  감자맥주: {
    name: "감자맥주",
    desc: "맥아 향에 감자의 고소함 한 스푼, 시원하게 털어 넣는 별미.",
  },
  감자초콜렛: {
    name: "감자초콜렛",
    desc: "달콤함 속에 감자의 담백함이 스며든 이색 초콜릿 바.",
  },
  감자도넛: {
    name: "감자도넛",
    desc: "겉은 바삭, 속은 포슬—감자 반죽의 든든한 도넛.",
  },
  감자버블티: {
    name: "감자버블티",
    desc: "쫀득함은 기본, 고소한 우유에 감자풍미 스며든 한 잔.",
  },

  "감자 샌드위치": {
    name: "감자 샌드위치",
    desc: "손안의 피크닉. 아삭한 채소와 치즈가 감자를 감싸요.",
  },
  "감자 와플": {
    name: "감자 와플",
    desc: "해시브라운이 와플기계와 만난 바삭·쫀득 브런치.",
  },
  "감자 핫도그": {
    name: "감자 핫도그",
    desc: "한 입에 케찹과 고기가 터지는 길거리의 행복.",
  },
  "감자 샐러드": {
    name: "감자 샐러드",
    desc: "상큼한 망고와 포근한 감자의 의외로 찰떡 케미.",
  },
  "감자 오믈렛": {
    name: "감자 오믈렛",
    desc: "부드러운 계란 속에 숨겨둔 포근한 감자—브런치의 정석.",
  },
  감자버거: {
    name: "감자버거",
    desc: "두툼한 감자 패티와 신선한 채소, 한입에 꽉 찬 포만감.",
  },
  감자만두: {
    name: "감자만두",
    desc: "쫄깃피 속 포슬 감자와 고기, 김이 모락모락.",
  },
  "감자 팬케이크": {
    name: "감자 팬케이크",
    desc: "버터 향 가득한 아침, 달콤·짭짤의 황금비.",
  },
  "감자 소금빵": {
    name: "감자 소금빵",
    desc: "소금 알갱이 톡톡, 버터와 감자가 만드는 바삭결.",
  },
  "감자 냉사케": {
    name: "감자 냉사케",
    desc: "얼음 사이로 스며드는 깔끔한 향—차게 즐기는 사케.",
  },

  "포테이토 피자": {
    name: "포테이토 피자",
    desc: "치즈의 행복 위에 든든한 감자를 얹은 한 조각의 호사.",
  },
  "감자 타코": {
    name: "감자 타코",
    desc: "따뜻한 플랫브레드에 감자를 포근히 감싼 한 손 요리.",
  },
  "감자 부리또": {
    name: "감자 부리또",
    desc: "묵직하지만 균형 잡힌 포만감 폭탄. 든든함의 끝.",
  },
  "감자 퐁듀": {
    name: "감자 퐁듀",
    desc: "녹은 치즈 바다에 감자를 풍덩—위험하고도 달콤한 선택.",
  },
  "감자 망고빙수": {
    name: "감자 망고빙수",
    desc: "감자를 곁들인 이쁜사람들만 좋아한다는 이색 빙수.",
  },
  감자면: {
    name: "감자면",
    desc: "쫄깃한 감자면에 깊은 육수 한 젓가락, 면치기의 즐거움.",
  },
  감자카레: {
    name: "감자 카레",
    desc: "부드러운 감자와 진한 카레 소스의 안정적 한 그릇.",
  },
  감자케밥: {
    name: "감자 케밥",
    desc: "불향 고기와 신선한 채소, 감자를 품은 플랫브레드 롤.",
  },
  감자전골탕: {
    name: "감자 전골탕",
    desc: "진한 국물에 고기와 감자가 우러난 뜨끈한 한 냄비.",
  },
  감자경단: { name: "감자 경단", desc: "여러가지 재료와 쫀득함을 한번에." },
} as const;

/** 헬퍼 */
export const getFoodMeta = (name: RecipeName): FoodInfo => FOOD_META[name]!;
export const getFoodDesc = (name: RecipeName): string => FOOD_META[name]!.desc;
export const getIngredientEmoji = (title: IngredientTitle) =>
  INGREDIENT_EMOJI[title];

/** 호환: 기존 코드가 RECIPES_NORM를 import하는 경우를 위해 alias 제공 */
export const RECIPES_NORM = RECIPES;
