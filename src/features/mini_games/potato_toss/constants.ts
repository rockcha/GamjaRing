// 게임 한 곳에서만 쓰는 상수들

export const MAX_THROWS = 10;
export const GRAVITY = 1200;
export const POWER_MIN = 20;
export const POWER_MAX = 100;
export const ANGLE_MIN = 15;
export const ANGLE_MAX = 75;
export const GOLD_PER_HIT = 5;

export const CHARGE_DURATION_MS = 1200;
export const TRAIL_MAX_POINTS = 160;
export const TRAIL_POINT_MIN_DIST = 9;
export const OFF_MARGIN = 60;
export const SAFETY_TIMEOUT_MS = 12000;

// 화살표 길이 (발사 시작점 기준 길이)
export const LAUNCH_ARROW_LEN = 64;

// 파워 → 초기속도(px/s)
export const powerToVelocity = (p: number) => 320 + (p / 100) * 820;
