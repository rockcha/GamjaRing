// src/features/fortune/theme.ts
import type { Grade } from "./generateFortune";
import {
  Sun,
  Orbit,
  Star,
  Scale,
  Hourglass,
  Moon,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** 등급별 색 테마 */
export const THEME: Record<
  Grade,
  {
    bg: string; // 배경
    ring: string; // 카드 링/보더
    chip: string; // 칩(뱃지) 배경/보더
    text: string; // 메인 텍스트
    soft: string; // 소프트 텍스트
    icon: string; // 아이콘 색  👈 추가
  }
> = {
  초대박: {
    bg: "bg-yellow-50",
    ring: "ring-yellow-300",
    chip: "bg-yellow-100 border-yellow-300",
    text: "text-yellow-800",
    soft: "text-yellow-700/80",
    icon: "text-yellow-500",
  },
  대박: {
    bg: "bg-emerald-50",
    ring: "ring-emerald-300",
    chip: "bg-emerald-100 border-emerald-300",
    text: "text-emerald-800",
    soft: "text-emerald-700/80",
    icon: "text-emerald-500",
  },
  좋음: {
    bg: "bg-sky-50",
    ring: "ring-sky-300",
    chip: "bg-sky-100 border-sky-300",
    text: "text-sky-800",
    soft: "text-sky-700/80",
    icon: "text-sky-500",
  },
  보통: {
    bg: "bg-neutral-50",
    ring: "ring-neutral-300",
    chip: "bg-neutral-100 border-neutral-300",
    text: "text-neutral-800",
    soft: "text-neutral-700/80",
    icon: "text-neutral-500",
  },
  주의: {
    bg: "bg-indigo-50",
    ring: "ring-indigo-300",
    chip: "bg-indigo-100 border-indigo-300",
    text: "text-indigo-800",
    soft: "text-indigo-700/80",
    icon: "text-indigo-500",
  },
  조심: {
    bg: "bg-purple-50",
    ring: "ring-purple-300",
    chip: "bg-purple-100 border-purple-300",
    text: "text-purple-800",
    soft: "text-purple-700/80",
    icon: "text-purple-500",
  },
  위험: {
    bg: "bg-rose-50",
    ring: "ring-rose-300",
    chip: "bg-rose-100 border-rose-300",
    text: "text-rose-800",
    soft: "text-rose-700/80",
    icon: "text-rose-500",
  },
};

/** 등급별 타로 카드 PNG 경로 */
export const TAROT_CARD_SRC: Record<Grade, string> = {
  초대박: "/tarot/sun.png",
  대박: "/tarot/wheel.png",
  좋음: "/tarot/star.png",
  보통: "/tarot/justice.png",
  주의: "/tarot/temperance.png",
  조심: "/tarot/moon.png",
  위험: "/tarot/tower.png",
};

/** 등급별 타로 메타데이터 */
export const TAROT_META: Record<
  Grade,
  { rn: string; en: string; ko: string; code: string }
> = {
  초대박: { rn: "XIX", en: "The Sun", ko: "태양", code: "XIX THE SUN" },
  대박: {
    rn: "X",
    en: "Wheel of Fortune",
    ko: "운명의 수레바퀴",
    code: "X WHEEL OF FORTUNE",
  },
  좋음: { rn: "XVII", en: "The Star", ko: "별", code: "XVII THE STAR" },
  보통: { rn: "XI", en: "Justice", ko: "정의", code: "XI JUSTICE" },
  주의: {
    rn: "XII",
    en: "The temperance Man",
    ko: "매달린 남자",
    code: "XII THE temperance MAN",
  },
  조심: { rn: "XVIII", en: "The Moon", ko: "달", code: "XVIII THE MOON" },
  위험: { rn: "XVI", en: "The Tower", ko: "탑", code: "XVI THE TOWER" },
};

/** 등급별 아이콘 */
export const ICONS: Record<Grade, LucideIcon> = {
  초대박: Sun,
  대박: Orbit,
  좋음: Star,
  보통: Scale,
  주의: Hourglass,
  조심: Moon,
  위험: Zap,
};
