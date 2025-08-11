// src/constants/colors.ts

export const COLORS = {
  /** 눈이 편한 흰색 */
  SOFT_WHITE: "#fdfdf8", // 부드럽고 살짝 따뜻한 흰색

  /** 연한 베이지 */
  LIGHT_BEIGE: "#fdf6ee", // 살짝 크리미 톤

  /** 진한 베이지 */
  BEIGE: "#f5e2c8", // 따뜻한 진베이지

  /** 더 진한 베이지 */
  DARK_BEIGE: "#e6c8a0", // 카라멜톤 섞인 베이지
} as const;

export type ColorKeys = keyof typeof COLORS;
