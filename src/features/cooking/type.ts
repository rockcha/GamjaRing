export type Tier = "beginner" | "intermediate" | "advanced";

export type Ingredient = {
  title:
    | "소금"
    | "버터"
    | "꿀"
    | "우유"
    | "치즈"
    | "베이컨"
    | "계란"
    | "양파"
    | "밀"
    | "얼음"
    | "플랫브레드"
    | "고기"
    | "망고"
    | "케찹"
    | "녹색채소";
  emoji: string;
  /** 도넛 조각용 고정 컬러 */
  color: string;
};

export const INGREDIENTS: readonly Ingredient[] = [
  { title: "소금", emoji: "🧂", color: "#A0AEC0" }, // slate gray
  { title: "버터", emoji: "🧈", color: "#F6D365" }, // butter yellow
  { title: "꿀", emoji: "🍯", color: "#F4B400" }, // honey amber
  { title: "우유", emoji: "🥛", color: "#B3E5FC" }, // baby blue
  { title: "치즈", emoji: "🧀", color: "#FFD166" }, // cheese yellow
  { title: "베이컨", emoji: "🥓", color: "#EF6C6C" }, // bacon red
  { title: "계란", emoji: "🥚", color: "#FFE8A1" }, // egg shell
  { title: "양파", emoji: "🧅", color: "#D6A9E3" }, // onion purple
  { title: "밀", emoji: "🌾", color: "#E6C17D" }, // wheat
  { title: "얼음", emoji: "🧊", color: "#9AD0F5" }, // ice blue
  { title: "플랫브레드", emoji: "🫓", color: "#F1C27D" }, // flatbread tan
  { title: "고기", emoji: "🍖", color: "#C76B5E" }, // meat brown-red
  { title: "망고", emoji: "🥭", color: "#FF9F68" }, // mango orange
  { title: "케찹", emoji: "🥫", color: "#E63946" }, // ketchup red
  { title: "녹색채소", emoji: "🥬", color: "#84CC16" }, // veggie green
] as const;

export type IngredientTitle = (typeof INGREDIENTS)[number]["title"];

export type Dish = {
  name: string;
  emoji: string;
  meta?: Record<string, unknown>;
};
export type RelatedDishes = Record<IngredientTitle, readonly Dish[]>;

export const RELATED_DISHES: RelatedDishes = {
  소금: [
    { name: "프레첼", emoji: "🥨" },
    { name: "도시락", emoji: "🍱" },
    { name: "오뎅꼬치", emoji: "🍢" },
  ],
  버터: [
    { name: "와플", emoji: "🧇" },
    { name: "크루아상", emoji: "🥐" },
    { name: "팝콘", emoji: "🍿" },
  ],
  꿀: [
    { name: "허니치킨", emoji: "🍗" },
    { name: "허니팬케이크", emoji: "🥞" },
    { name: "허니티", emoji: "🍵" },
  ],
  우유: [
    { name: "아이스크림", emoji: "🍦" },
    { name: "푸딩", emoji: "🍮" },
    { name: "시리얼", emoji: "🥣" },
  ],
  치즈: [
    { name: "피자", emoji: "🍕" },
    { name: "치즈파스타", emoji: "🍝" },
    { name: "치즈카레", emoji: "🍛" },
  ],
  베이컨: [
    { name: "아침식사 플레이트", emoji: "🍳" },
    { name: "베이컨부리또", emoji: "🌯" },
    { name: "베이컨샐러드", emoji: "🥗" },
  ],
  계란: [
    { name: "에그샌드위치", emoji: "🥪" },
    { name: "계란주먹밥", emoji: "🍙" },
    { name: "에그팬케이크", emoji: "🥞" },
  ],
  양파: [
    { name: "스튜", emoji: "🍲" },
    { name: "양파피자", emoji: "🍕" },
    { name: "타코", emoji: "🌮" },
  ],
  밀: [
    { name: "바게트", emoji: "🥖" },
    { name: "크래커", emoji: "🥨" },
    { name: "만두피", emoji: "🥟" },
  ],
  얼음: [
    { name: "아이스티", emoji: "🧉" },
    { name: "셔벗", emoji: "🍧" },
    { name: "젤라또", emoji: "🍨" },
  ],
  플랫브레드: [
    { name: "랩샌드위치", emoji: "🌯" },
    { name: "팔라펠", emoji: "🧆" },
    { name: "파니니", emoji: "🥪" },
  ],
  고기: [
    { name: "라멘(차슈)", emoji: "🍜" },
    { name: "고기만두", emoji: "🥟" },
    { name: "고기타코", emoji: "🌮" },
  ],
  망고: [
    { name: "망고샐러드", emoji: "🥗" },
    { name: "망고스무디", emoji: "🍹" },
    { name: "망고컵케이크", emoji: "🧁" },
  ],
  케찹: [
    { name: "핫도그", emoji: "🌭" },
    { name: "케찹피자", emoji: "🍕" },
    { name: "오믈렛", emoji: "🍳" },
  ],
  녹색채소: [
    { name: "야채만두", emoji: "🥟" },
    { name: "야채카레", emoji: "🍛" },
    { name: "그린파스타", emoji: "🍝" },
  ],
};

export type FailResult = {
  key: string;
  name: string;
  emoji: string;
  sellPrice: number;
  meta?: Record<string, unknown>;
};
export const FAIL_RESULTS: readonly FailResult[] = [
  { key: "skull_mark", name: "해골 표식", emoji: "💀", sellPrice: 5 },
  { key: "weird_tube", name: "수상한 시험관", emoji: "🧪", sellPrice: 5 },
  { key: "burnt_tissue", name: "그을린 휴지", emoji: "🧻", sellPrice: 5 },
  { key: "germs", name: "세균 번식물", emoji: "🦠", sellPrice: 5 },
  { key: "odd_beaker", name: "이상한 비커액", emoji: "⚗️", sellPrice: 5 },
  { key: "trash_pile", name: "쓰레기 더미", emoji: "🗑️", sellPrice: 5 },
  { key: "void_hole", name: "검은 구멍", emoji: "🕳️", sellPrice: 5 },
  { key: "hazard", name: "오염 표식", emoji: "☣️", sellPrice: 5 },
  { key: "smoke_cloud", name: "연기 구름", emoji: "☁️", sellPrice: 5 },
  { key: "fire_debris", name: "화재 잔해", emoji: "🔥", sellPrice: 5 },
];

export const MIN_INGREDIENTS_FOR_TIER: Record<Tier, number> = {
  beginner: 5,
  intermediate: 10,
  advanced: 15,
};
export function getTierByIngredientCount(count: number): Tier {
  if (count >= 15) return "advanced";
  if (count >= 10) return "intermediate";
  return "beginner";
}
