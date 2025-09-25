import type { Size, BaseField, BucketPos, SuccessWave } from "./types";
import {
  POWER_MIN,
  POWER_MAX,
  TRAIL_POINT_MIN_DIST,
  TRAIL_MAX_POINTS,
} from "./constants";
import { clamp01, roundRectPath, getLaunchTip } from "./utils";

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  size: Size,
  baseField: BaseField,
  bgImg: HTMLImageElement | null
) {
  if (bgImg) {
    const sw = bgImg.width,
      sh = bgImg.height,
      sRatio = sw / sh,
      dRatio = size.w / size.h;
    let sx = 0,
      sy = 0,
      sW = sw,
      sH = sh;
    if (sRatio > dRatio) {
      sW = sh * dRatio;
      sx = (sw - sW) / 2;
    } else {
      sH = sw / dRatio;
      sy = (sh - sH) / 2;
    }
    ctx.drawImage(bgImg, sx, sy, sW, sH, 0, 0, size.w, size.h);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, size.h);
    g.addColorStop(0, "#f8fafc");
    g.addColorStop(1, "#eef2ff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size.w, size.h);
  }
  ctx.fillStyle = "rgba(226,232,240,0.9)";
  ctx.fillRect(0, baseField.groundY, size.w, size.h - baseField.groundY);
}

export function drawLauncher(
  ctx: CanvasRenderingContext2D,
  baseField: BaseField,
  angleDeg: number,
  projRadius: number
) {
  const { x, y } = baseField.launch;
  const { tipX, tipY, nx, ny } = getLaunchTip({
    base: { x, y },
    angleDeg,
    projRadius,
    headLen: 16,
    lineWidth: 6,
  });

  // 본체
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // 각도 뱃지
  ctx.fillStyle = "#ef4444";
  roundRectPath(ctx, x - 18, y - 22, 46, 20, 6);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`${angleDeg}°`, x - 12, y - 12);

  // 화살촉
  const perpX = -ny,
    perpY = nx;
  const headLen = 16,
    headWidth = 14;
  const p1x = tipX,
    p1y = tipY;
  const p2x = tipX - nx * headLen + perpX * (headWidth / 2);
  const p3x = tipX - nx * headLen - perpX * (headWidth / 2);
  const p2y = tipY - ny * headLen + perpY * (headWidth / 2);
  const p3y = tipY - ny * headLen - perpY * (headWidth / 2);
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(p1x, p1y);
  ctx.lineTo(p2x, p2y);
  ctx.lineTo(p3x, p3y);
  ctx.closePath();
  ctx.fill();
}

export function drawCuteBasket(
  ctx: CanvasRenderingContext2D,
  bucketPos: BucketPos,
  baseField: BaseField
) {
  const { w, h } = baseField.bucketSize;
  const { x, y } = bucketPos;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, "#fde68a");
  g.addColorStop(1, "#f59e0b");
  ctx.fillStyle = g;
  roundRectPath(ctx, x, y + 10, w, h - 10, 12);
  ctx.fill();

  ctx.strokeStyle = "rgba(120,53,15,0.25)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 8 + i * 14, y + 16);
    ctx.lineTo(x + (i - 1) * 14 + 22, y + h - 8);
    ctx.stroke();
  }

  ctx.fillStyle = "#92400e";
  roundRectPath(ctx, x - 3, y, w + 6, 16, 8);
  ctx.fill();

  // 하트
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  const cx = x + w / 2,
    cy = y + h / 2;
  ctx.moveTo(cx, cy);
  ctx.bezierCurveTo(cx - 8, cy - 10, cx - 18, cy + 2, cx, cy + 14);
  ctx.bezierCurveTo(cx + 18, cy + 2, cx + 8, cy - 10, cx, cy);
  ctx.fill();
}

export function drawPotatoEmoji(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  ctx.save();
  const px = 22;
  ctx.font = `${px}px Apple Color Emoji, Noto Color Emoji, Segoe UI Emoji, EmojiOne, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 4;
  ctx.fillText("🥔", x, y);
  ctx.restore();
}

export function updateTrail(
  trail: Array<{ x: number; y: number }>,
  px: number,
  py: number
) {
  if (
    trail.length === 0 ||
    Math.hypot(px - trail[trail.length - 1].x, py - trail[trail.length - 1].y) >
      TRAIL_POINT_MIN_DIST
  ) {
    trail.push({ x: px, y: py });
    if (trail.length > TRAIL_MAX_POINTS) trail.shift();
  }
}

export function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: Array<{ x: number; y: number }>
) {
  if (trail.length < 2) return;
  ctx.save();
  ctx.lineWidth = 2.2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (let i = 1; i < trail.length; i++) {
    const a = i / trail.length;
    ctx.strokeStyle = `rgba(30,58,138,${0.12 + 0.55 * a})`;
    ctx.beginPath();
    ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
    ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

export function getBucketOpening(bucketPos: BucketPos, baseField: BaseField) {
  const { w } = baseField.bucketSize;
  const rimInset = 10;
  const x1 = bucketPos.x + rimInset;
  const x2 = bucketPos.x + w - rimInset;
  const y = bucketPos.y + rimInset;
  return { x1, x2, y };
}

export function drawBucketGlow(
  ctx: CanvasRenderingContext2D,
  bucketPos: BucketPos,
  baseField: BaseField,
  alpha: number
) {
  const { w, h } = baseField.bucketSize;
  const { x, y } = bucketPos;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(16,185,129,0.95)";
  ctx.lineWidth = 12;
  ctx.shadowColor = "rgba(16,185,129,0.9)";
  ctx.shadowBlur = 18;
  roundRectPath(ctx, x - 8, y - 6, w + 16, h + 14, 14);
  ctx.stroke();
  ctx.restore();
}

export function drawSuccessWaveAndTick(
  ctx: CanvasRenderingContext2D,
  swRef: { current: SuccessWave },
  dtMs: number
) {
  const sw = swRef.current;
  if (!sw) return;
  sw.t += dtMs;
  const k = clamp01(sw.t / sw.dur);
  const r = 24 + 110 * k;
  const a = 0.35 * (1 - k);
  const grad = ctx.createRadialGradient(sw.x, sw.y, 0, sw.x, sw.y, r);
  grad.addColorStop(0, `rgba(16,185,129,${a})`);
  grad.addColorStop(1, `rgba(16,185,129,0)`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(sw.x, sw.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (k >= 1) swRef.current = null;
}

export function drawChargeBar(
  ctx: CanvasRenderingContext2D,
  pos: { x: number; y: number; visible: boolean },
  power: number
) {
  if (!pos.visible) return;
  const { x, y } = pos;
  const ratio = (power - POWER_MIN) / (POWER_MAX - POWER_MIN);
  const barW = 160;
  const barH = 10;
  const rx = Math.round(x - barW / 2);
  const ry = Math.round(y - 30);
  ctx.save();
  ctx.fillStyle = "#e5e7eb";
  roundRectPath(ctx, rx, ry, barW, barH, 6);
  ctx.fill();
  ctx.fillStyle = "#22c55e";
  roundRectPath(ctx, rx, ry, Math.max(6, barW * ratio), barH, 6);
  ctx.fill();
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1;
  roundRectPath(ctx, rx, ry, barW, barH, 6);
  ctx.stroke();
  ctx.fillStyle = "#111827";
  ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(`${Math.round(power)}%`, x, ry - 2);
  ctx.restore();
}
