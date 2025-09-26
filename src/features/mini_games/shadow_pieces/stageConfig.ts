// 스테이지 스펙 & 보상 테이블 (실루엣 버전)

export type StageSpec = {
  index: number;
  timeSec: number; // 스테이지 제한시간 (초)
  optionsCount: number;
  rewardOnSuccess: number; // +3, +5, +8, +12, +15
};

export const STAGES: StageSpec[] = [
  { index: 1, timeSec: 10, optionsCount: 6, rewardOnSuccess: 3 },
  { index: 2, timeSec: 9, optionsCount: 7, rewardOnSuccess: 5 },
  { index: 3, timeSec: 8, optionsCount: 8, rewardOnSuccess: 7 },
  { index: 4, timeSec: 7, optionsCount: 9, rewardOnSuccess: 9 },
  { index: 5, timeSec: 6, optionsCount: 10, rewardOnSuccess: 11 },
  { index: 6, timeSec: 5, optionsCount: 11, rewardOnSuccess: 13 },
];

export const ENTRY_FEE = 30; // MiniGamePage에서 참가비 차감 흐름 사용
export const PENALTY_ON_FAIL = 5; // 실패/시간초과 -5G (누적 보상에서 차감)

// rarity 정규화 (폴더 명)
export type RarityKey = "common" | "rare" | "epic" | "legend";
export function normalizeRarity(raw?: string | null): RarityKey {
  const v = (raw ?? "").toString().trim().toLowerCase();
  if (["희귀", "rare"].includes(v)) return "rare";
  if (["에픽", "epic"].includes(v)) return "epic";
  if (["전설", "legend", "legendary"].includes(v)) return "legend";
  return "common";
}
