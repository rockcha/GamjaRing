import { LAUNCH_ARROW_LEN } from "./constants";

export const toRad = (deg: number) => (deg * Math.PI) / 180;

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** 화살표 tip(= 실제 발사 시작점) 계산을 단일화
 *  - 동일 좌표를 UI(화살표)와 물리(발사체) 모두에 사용
 *  - 발사체 반지름(r)과 화살촉/선두 시각 보정을 포함
 */
export function getLaunchTip({
  base, // {x,y} 화살표 시작점
  angleDeg, // 각도(도)
  projRadius, // 발사체 반지름
  headLen = 16, // 화살촉 길이(시각)
  lineWidth = 6, // 화살선 두께
}: {
  base: { x: number; y: number };
  angleDeg: number;
  projRadius: number;
  headLen?: number;
  lineWidth?: number;
}) {
  const theta = toRad(angleDeg);
  const nx = Math.cos(theta);
  const ny = -Math.sin(theta);

  // 시각/물리 보정:
  // 1) 발사체 중심이 팁보다 r만큼 뒤에 보이는 문제 → +r 전진
  // 2) 선두 round cap, 화살촉 길이로 팁이 길어 보이는 착시 → 소폭 감산
  const capBias = lineWidth * 0.5;
  const visualHeadBias = Math.max(0, headLen - capBias * 0.6);
  const padding = projRadius - visualHeadBias + 2;

  const tipX = base.x + nx * (LAUNCH_ARROW_LEN + padding);
  const tipY = base.y + ny * (LAUNCH_ARROW_LEN + padding);

  return { tipX, tipY, nx, ny };
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const clampDt = (ms: number) => Math.min(ms, 33);
