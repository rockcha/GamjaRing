// src/features/bucketlist/types.ts
export type BucketCategory = "일상" | "목표" | "도전" | "음식" | "여행";

export type BucketItem = {
  id: number;
  couple_id: string;
  author_id: string;
  title: string;
  content: string | null;
  link_url: string | null;
  category: BucketCategory | null;
  due_date: string | null; // YYYY-MM-DD
  completed: boolean;
  completed_at: string | null; // ISO
  created_at: string; // ISO
  updated_at: string; // ISO
};

export type BucketFilters = {
  category: "전체" | BucketCategory;
  status: "미완료" | "완료";
};

export const CATEGORY_ORDER: BucketCategory[] = [
  "일상",
  "목표",
  "도전",
  "음식",
  "여행",
];

// 카테고리 메타: 이모지 / 톤 컬러 / 설명
export const CATEGORY_META: Record<
  BucketCategory,
  {
    emoji: string;
    tone: "emerald" | "violet" | "amber" | "rose" | "sky";
    desc: string;
  }
> = {
  일상: { emoji: "💕", tone: "emerald", desc: "소소함 속의 행복" },
  목표: { emoji: "🏆", tone: "violet", desc: "성장을 통해 성취감을 높이자" },
  도전: {
    emoji: "🚀",
    tone: "amber",
    desc: "할 수 있어! 도전!",
  },
  음식: { emoji: "🍜", tone: "rose", desc: "맛나는 거는 못참아" },
  여행: { emoji: "✈️", tone: "sky", desc: "함께 떠나보자" },
};

// 톤 → Tailwind 클래스 모음
export function toneClasses(
  tone: "emerald" | "violet" | "amber" | "rose" | "sky"
): {
  card: string;
  badge: string;
  ring: string;
  softBg: string;
  header: string;
} {
  switch (tone) {
    case "emerald":
      return {
        card: "border-emerald-200 bg-emerald-100/70 dark:bg-emerald-900/10",
        badge: "bg-emerald-100 text-emerald-700",
        ring: "ring-emerald-300/60",
        softBg: "bg-emerald-100",
        header: "from-emerald-50 to-emerald-100",
      };
    case "violet":
      return {
        card: "border-violet-200 bg-violet-100/70 dark:bg-violet-900/10",
        badge: "bg-violet-100 text-violet-700",
        ring: "ring-violet-300/60",
        softBg: "bg-violet-100",
        header: "from-violet-50 to-violet-100",
      };
    case "amber":
      return {
        card: "border-amber-200 bg-amber-100/70 dark:bg-amber-900/10",
        badge: "bg-amber-100 text-amber-800",
        ring: "ring-amber-300/60",
        softBg: "bg-amber-100",
        header: "from-amber-50 to-amber-100",
      };
    case "rose":
      return {
        card: "border-rose-200 bg-rose-100/70 dark:bg-rose-900/10",
        badge: "bg-rose-100 text-rose-700",
        ring: "ring-rose-300/60",
        softBg: "bg-rose-100",
        header: "from-rose-50 to-rose-100",
      };
    case "sky":
      return {
        card: "border-sky-200 bg-sky-100/70 dark:bg-sky-900/10",
        badge: "bg-sky-100 text-sky-700",
        ring: "ring-sky-300/60",
        softBg: "bg-sky-100",
        header: "from-sky-50 to-sky-100",
      };
  }
}
