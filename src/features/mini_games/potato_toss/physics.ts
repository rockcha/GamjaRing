export const GRAVITY = 1200; // px/s^2
export const POWER_MIN = 20;
export const POWER_MAX = 100;
export const LAUNCH_ARROW_LEN = 64;

export const toRad = (deg: number) => (deg * Math.PI) / 180;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// 파워 -> 초기 속도(px/s)
export const powerToVelocity = (p: number) => 320 + (p / 100) * 820;

/** 화살표 tip 좌표(= 실제 발사 시작점)
 * base: {x,y} = 발사대 기준점 (바닥 근처)
 * angleDeg: 시계 반대 방향 각도 (0=우향)
 */
export function getLaunchTip({
  base,
  angleDeg,
}: {
  base: { x: number; y: number };
  angleDeg: number;
}) {
  const theta = toRad(angleDeg);
  const nx = Math.cos(theta);
  const ny = -Math.sin(theta);
  const tipX = base.x + nx * LAUNCH_ARROW_LEN;
  const tipY = base.y + ny * LAUNCH_ARROW_LEN;
  return { tipX, tipY, nx, ny };
}
