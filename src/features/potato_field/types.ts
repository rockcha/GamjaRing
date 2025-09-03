// 기본 타입/상수
export const PLOT_COUNT = 9 as const;
export const MATURE_MS = 3 * 60 * 60 * 1000; // 3시간

export type PlotState = "empty" | "growing" | "ready";

export type PotatoFieldRow = {
  couple_id: string;
  harvested_count: number;

  plots_planted_at: (string | null)[] | null; // ISO 문자열 or null
  created_at?: string | null;
  updated_at?: string | null;
};

export type PlotInfo = {
  idx: number; // 0~8
  state: PlotState; // empty/growing/ready
  plantedAt: Date | null; // null or 실제 Date
  remainMs?: number; // growing일 때 수확까지 남은 시간(ms)
};
