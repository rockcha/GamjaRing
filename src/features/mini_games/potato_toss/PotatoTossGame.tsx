"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCoupleContext } from "@/contexts/CoupleContext";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullseye,
  faCoins,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";

/* 공용 메타 타입 */
import type { MiniGameDef } from "@/features/mini_games/RecipeMemoryGame";

/** ─────────────────────────────────────────────────────────────
 * Potato Toss — 포물선 던지기 (Canvas 2D)
 * 변경점:
 * - 반응형에서 부모 width 절대 초과 금지 (max-w-full + 내부 사이즈 산정)
 * - 화살표 tip = 실제 발사 시작점 (시각/물리 완전 일치; 보정 제거)
 * - 각도 연동형 파워바 제거
 * - 클릭/터치한 위치에 임시 수평 파워바 표시, 발사 시 제거
 * - 누적보상: 성공 1회당 5G (표기 일치)
 * ───────────────────────────────────────────────────────────── */

type Props = { onExit?: () => void };

const MAX_THROWS = 10;
const GRAVITY = 1200;
const POWER_MIN = 20;
const POWER_MAX = 100;
const ANGLE_MIN = 15;
const ANGLE_MAX = 75;
const GOLD_PER_HIT = 5;

const CHARGE_DURATION_MS = 1200;
const TRAIL_MAX_POINTS = 160;
const TRAIL_POINT_MIN_DIST = 9;
const OFF_MARGIN = 60;
const SAFETY_TIMEOUT_MS = 12000;

// 화살표 길이 (발사 시작점까지의 시각 길이)
const LAUNCH_ARROW_LEN = 64;

// 파워→초기속도(px/s)
const powerToVelocity = (p: number) => 320 + (p / 100) * 820;

/* 상태머신 */
enum GameState {
  Idle = "Idle",
  Charging = "Charging",
  Flying = "Flying",
  Resolving = "Resolving",
  Between = "Between",
  Finished = "Finished",
}

type GainCue = { id: number; t: number; dur: number };

function roundRectPath(
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

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** 단일 진실: 화살표 tip 좌표(= 실제 발사 시작점)
 *  - 어떠한 시각/물리 보정도 넣지 않는다.
 *  - UI와 물리 모두 이 좌표만 사용.
 */
function getLaunchTip({
  base, // {x,y}
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

export function PotatoTossGame({ onExit }: Props) {
  const { addGold, fetchCoupleData } = useCoupleContext() as {
    addGold?: (amt: number) => Promise<boolean>;
    fetchCoupleData?: () => Promise<void>;
  };

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ===== UI 상태 =====
  const [angle, setAngle] = useState<number>(48);
  const [power, setPower] = useState<number>(POWER_MIN);
  const [throws, setThrows] = useState<number>(0);
  const [hits, setHits] = useState<number>(0);
  const [resultOpen, setResultOpen] = useState<boolean>(false);

  // 지급 중복 방지
  const claimedRef = useRef(false);
  const [claiming, setClaiming] = useState(false);

  // 플로팅 "+G"
  const [gainCues, setGainCues] = useState<GainCue[]>([]);
  const gainIdRef = useRef<number>(0);
  const spawnGainCue = () => {
    const id = ++gainIdRef.current;
    setGainCues((arr) => [...arr, { id, t: 0, dur: 900 }]);
    setTimeout(
      () => setGainCues((arr) => arr.filter((g) => g.id !== id)),
      1000
    );
    (navigator as any)?.vibrate?.(20);
  };

  // 상태 refs
  const stateRef = useRef<GameState>(GameState.Idle);
  const angleRef = useRef<number>(angle);
  const powerRef = useRef<number>(power);
  useEffect(() => {
    angleRef.current = angle;
  }, [angle]);
  useEffect(() => {
    powerRef.current = power;
  }, [power]);

  // 차징
  const chargeStartRef = useRef<number | null>(null);

  // 클릭 위치 임시 파워바
  const chargeUiRef = useRef<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  // 샷 관리
  const resolvedRef = useRef<boolean>(false);
  const shotIdRef = useRef<number>(0);
  const activeShotIdRef = useRef<number | null>(null);
  const processedShotsRef = useRef<Set<number>>(new Set());

  // 실패 흔들림
  const shakeRef = useRef<{ t: number; dur: number; amp: number }>({
    t: 0,
    dur: 0,
    amp: 0,
  });
  const triggerShake = (ms = 160, amp = 10) => {
    shakeRef.current = { t: 0, dur: ms, amp };
    (navigator as any)?.vibrate?.([10, 30, 10]);
  };

  // 성공 이펙트
  const successWaveRef = useRef<{
    t: number;
    dur: number;
    x: number;
    y: number;
  } | null>(null);
  const triggerSuccessWave = (x: number, y: number, dur = 420) => {
    successWaveRef.current = { t: 0, dur, x, y };
  };

  // 초록 스파클
  type Spark = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    max: number;
    size: number;
    rot: number;
  };
  const sparksRef = useRef<Spark[]>([]);
  const spawnGreenSparks = (x: number, y: number, n = 26) => {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 180 + Math.random() * 260;
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 80,
        life: 600 + Math.random() * 400,
        max: 600 + Math.random() * 400,
        size: 2 + Math.random() * 2.5,
        rot: Math.random() * Math.PI * 2,
      });
    }
  };

  // 바구니 글로우
  const bucketGlowRef = useRef<{ t: number; dur: number }>({ t: 0, dur: 0 });
  const triggerBucketGlow = (ms = 560) => {
    bucketGlowRef.current = { t: 0, dur: ms };
  };

  // 반응형 캔버스 크기 (부모 초과 금지)
  const [size, setSize] = useState({ w: 720, h: 420 });
  useEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(() => {
      const parentW = el.clientWidth;
      const w = Math.max(360, Math.min(1000, parentW));
      const h = Math.round(w * 0.58);
      setSize({ w, h });
    });
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // DPR + 컨텍스트
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef<number>(1);
  useEffect(() => {
    const cvs = canvasRef.current!;
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    cvs.style.display = "block";
    cvs.style.width = `${size.w}px`;
    cvs.style.height = `${size.h}px`;
    cvs.width = Math.floor(size.w * dpr);
    cvs.height = Math.floor(size.h * dpr);
    const ctx = cvs.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    dprRef.current = dpr;
  }, [size]);

  // 배경 이미지
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.src = "/minigame/toss_placeholder.png";
    img.onload = () => (bgImgRef.current = img);
  }, []);

  // 필드/지형
  const baseField = useMemo(() => {
    const groundY = size.h - 44;
    const launch = { x: 68, y: groundY - 18 };
    const bucketW = 117;
    const bucketH = 58;
    const left = Math.max(launch.x + 230, size.w * 0.42);
    const right = size.w - bucketW - 28;
    return {
      groundY,
      launch,
      bucketSize: { w: bucketW, h: bucketH },
      bucketRange: { left, right },
    };
  }, [size]);

  // 바구니 위치 + 트윈
  const bucketPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const bucketAnimRef = useRef<{
    from: number;
    to: number;
    t: number;
    dur: number;
  } | null>(null);
  const setBucketImmediate = (x: number) => {
    bucketPosRef.current.x = x;
    bucketAnimRef.current = null;
  };
  const tweenBucket = (toX: number, dur = 320) => {
    const from = bucketPosRef.current.x;
    bucketAnimRef.current = { from, to: toX, t: 0, dur };
  };
  const randomizeBucketPosition = (withTween = false) => {
    const { left, right } = baseField.bucketRange;
    const x = left + Math.random() * Math.max(10, right - left);
    const { h: bH } = baseField.bucketSize;
    const yMin = Math.round(size.h * 0.5);
    const yMax = baseField.groundY - bH;
    const y = yMin + Math.random() * Math.max(0, yMax - yMin);
    bucketPosRef.current.y = y;
    if (withTween) tweenBucket(x, 320);
    else setBucketImmediate(x);
  };
  useEffect(() => {
    randomizeBucketPosition(false);
  }, [baseField]);

  // 발사체
  const projectileRef = useRef<{
    active: boolean;
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    vx: number;
    vy: number;
    r: number;
    launchedAt?: number;
    safetyTimer?: number;
  }>({ active: false, x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0, r: 12 });

  // 트레일
  const trailRef = useRef<Array<{ x: number; y: number }>>([]);

  // 렌더 루프
  useEffect(() => {
    if (!canvasRef.current || !ctxRef.current) return;
    const ctx = ctxRef.current;

    let raf = 0;
    let prev = performance.now();
    let dtMs = 16;

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const clampDt = (ms: number) => Math.min(ms, 33);

    const drawBackground = () => {
      const img = bgImgRef.current;
      if (img) {
        const sw = img.width,
          sh = img.height,
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
        ctx.drawImage(img, sx, sy, sW, sH, 0, 0, size.w, size.h);
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, size.h);
        g.addColorStop(0, "#f8fafc");
        g.addColorStop(1, "#eef2ff");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size.w, size.h);
      }
      ctx.fillStyle = "rgba(226,232,240,0.9)";
      ctx.fillRect(0, baseField.groundY, size.w, size.h - baseField.groundY);
    };

    // 화살표(시각) — getLaunchTip 사용 (보정 없음)
    const drawLauncher = () => {
      const { x, y } = baseField.launch;
      const { tipX, tipY, nx, ny } = getLaunchTip({
        base: { x, y },
        angleDeg: angleRef.current,
      });

      // 본체(샤프트)
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 4;
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
      ctx.fillText(`${angleRef.current}°`, x - 12, y - 12);

      // 화살촉(아펙스=발사점과 동일)
      const perpX = -ny,
        perpY = nx;
      const headLen = 10,
        headWidth = 12;
      const p1x = tipX,
        p1y = tipY; // 꼭짓점=발사점
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
    };

    const drawCuteBasket = () => {
      const { w, h } = baseField.bucketSize;
      const { x, y } = bucketPosRef.current;
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
    };

    const drawPotatoEmoji = (x: number, y: number) => {
      ctx.save();
      const px = 22;
      ctx.font = `${px}px Apple Color Emoji, Noto Color Emoji, Segoe UI Emoji, EmojiOne, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 4;
      ctx.fillText("🥔", x, y);
      ctx.restore();
    };

    const drawTrail = () => {
      const pts = trailRef.current;
      if (pts.length < 2) return;
      ctx.save();
      ctx.lineWidth = 2.2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (let i = 1; i < pts.length; i++) {
        const a = i / pts.length;
        ctx.strokeStyle = `rgba(30,58,138,${0.12 + 0.55 * a})`;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
        ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
      ctx.restore();
    };

    // 바구니 윗입구
    const getOpening = () => {
      const { w } = baseField.bucketSize;
      const rimInset = 10;
      const x1 = bucketPosRef.current.x + rimInset;
      const x2 = bucketPosRef.current.x + w - rimInset;
      const y = bucketPosRef.current.y + rimInset;
      return { x1, x2, y };
    };

    const drawBucketGlow = (alpha: number) => {
      const { w, h } = baseField.bucketSize;
      const { x, y } = bucketPosRef.current;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(16,185,129,0.95)";
      ctx.lineWidth = 12;
      ctx.shadowColor = "rgba(16,185,129,0.9)";
      ctx.shadowBlur = 18;
      roundRectPath(ctx, x - 8, y - 6, w + 16, h + 14, 14);
      ctx.stroke();
      ctx.restore();
    };

    const drawSuccessWave = () => {
      const sw = successWaveRef.current;
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
      if (k >= 1) successWaveRef.current = null;
    };

    const updateBucketTween = (dtLocal: number) => {
      const anim = bucketAnimRef.current;
      if (!anim) return;
      anim.t += dtLocal;
      const k = Math.min(1, anim.t / anim.dur);
      const ease = 1 - Math.pow(1 - k, 3);
      bucketPosRef.current.x = anim.from + (anim.to - anim.from) * ease;
      if (k >= 1) bucketAnimRef.current = null;
    };

    const drawChargeBar = () => {
      if (!chargeUiRef.current.visible) return;
      const { x, y } = chargeUiRef.current;
      const ratio = (powerRef.current - POWER_MIN) / (POWER_MAX - POWER_MIN);
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
      ctx.fillText(`${Math.round(powerRef.current)}%`, x, ry - 2);
      ctx.restore();
    };

    const lastUiUpdateRef = { current: 0 };

    const step = () => {
      const now = performance.now();
      dtMs = clampDt(now - prev);
      prev = now;
      const dt = dtMs / 1000;

      // 차징
      if (
        stateRef.current === GameState.Charging &&
        chargeStartRef.current != null
      ) {
        const elapsed = now - chargeStartRef.current;
        const k = Math.min(1, elapsed / CHARGE_DURATION_MS);
        const p = Math.round(POWER_MIN + k * (POWER_MAX - POWER_MIN));
        powerRef.current = p;
        if (now - lastUiUpdateRef.current > 80) {
          lastUiUpdateRef.current = now;
          setPower(p);
        }
      }

      // 흔들림
      let offX = 0,
        offY = 0;
      if (shakeRef.current.dur > 0) {
        shakeRef.current.t += dtMs;
        const k = Math.max(
          0,
          Math.min(1, shakeRef.current.t / shakeRef.current.dur)
        );
        const a = shakeRef.current.amp * (1 - k);
        offX = (Math.random() * 2 - 1) * a;
        offY = (Math.random() * 2 - 1) * a * 0.7;
        if (k >= 1) shakeRef.current.dur = 0;
      }

      updateBucketTween(dtMs);

      // 배경/오브젝트
      const ctx = ctxRef.current!;
      ctx.clearRect(0, 0, size.w, size.h);
      ctx.save();
      ctx.translate(offX, offY);
      drawBackground();
      drawLauncher();
      drawCuteBasket();

      // 발사체 물리
      const proj = projectileRef.current;
      if (stateRef.current === GameState.Flying && proj.active) {
        proj.prevX = proj.x;
        proj.prevY = proj.y;
        proj.vy += GRAVITY * dt;
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        // 트레일
        const pts = trailRef.current;
        if (
          pts.length === 0 ||
          Math.hypot(
            proj.x - pts[pts.length - 1].x,
            proj.y - pts[pts.length - 1].y
          ) > TRAIL_POINT_MIN_DIST
        ) {
          pts.push({ x: proj.x, y: proj.y });
          if (pts.length > TRAIL_MAX_POINTS) pts.shift();
        }

        // 성공 체크: 윗입구 선 통과
        const { x1, x2, y } = getOpening();
        const prevBottom = proj.prevY + proj.r;
        const currBottom = proj.y + proj.r;
        if (
          !resolvedRef.current &&
          proj.vy > 0 &&
          prevBottom < y &&
          currBottom >= y
        ) {
          const t = (y - prevBottom) / (currBottom - prevBottom);
          const crossX = proj.prevX + (proj.x - proj.prevX) * t;
          if (crossX >= x1 && crossX <= x2) {
            resolvedRef.current = true;
            proj.active = false;
            if (proj.safetyTimer) {
              clearTimeout(proj.safetyTimer);
              proj.safetyTimer = undefined;
            }
            endThrow(true, crossX, y, activeShotIdRef.current!);
          }
        }

        // 실패 조건
        if (!resolvedRef.current) {
          const offRight = proj.x - proj.r > size.w + OFF_MARGIN;
          const offLeft = proj.x + proj.r < -OFF_MARGIN;
          const offBottom = proj.y - proj.r > size.h + OFF_MARGIN;
          const hitGround = proj.y + proj.r >= baseField.groundY;
          if (hitGround || offRight || offLeft || offBottom) {
            resolvedRef.current = true;
            proj.active = false;
            if (proj.safetyTimer) {
              clearTimeout(proj.safetyTimer);
              proj.safetyTimer = undefined;
            }
            endThrow(false, proj.x, proj.y, activeShotIdRef.current!);
          }
        }
      }

      // 성공 이펙트
      drawSuccessWave();

      // 글로우
      if (bucketGlowRef.current.dur > 0) {
        bucketGlowRef.current.t += dtMs;
        const k = Math.max(
          0,
          Math.min(1, bucketGlowRef.current.t / bucketGlowRef.current.dur)
        );
        drawBucketGlow(0.42 * (1 - k));
        if (k >= 1) bucketGlowRef.current.dur = 0;
      }

      // 스파클
      sparksRef.current = sparksRef.current.filter((sp) => {
        sp.life -= dtMs;
        if (sp.life <= 0) return false;
        const k = 1 - sp.life / sp.max;
        sp.vy += 360 * dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.9 * (1 - k);
        ctx.fillStyle = "hsl(140 70% 55%)";
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * (1 - k * 0.4), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      // 트레일/발사체
      drawTrail();
      if (proj.active) drawPotatoEmoji(proj.x, proj.y);

      // 임시 파워바
      drawChargeBar();

      ctx.restore();
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [size, baseField]);

  // pointerdown: 차징 시작 + 클릭 위치 기록(임시 파워바)
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const onPD = (e: PointerEvent) => {
      if (
        stateRef.current !== GameState.Idle &&
        stateRef.current !== GameState.Between
      )
        return;
      if (throws >= MAX_THROWS) return;

      const rect = cvs.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const clampedX = Math.max(12, Math.min(rect.width - 12, x));
      const clampedY = Math.max(12, Math.min(rect.height - 12, y));

      chargeUiRef.current = { x: clampedX, y: clampedY, visible: true };

      beginCharge();
      e.preventDefault();
    };

    cvs.addEventListener("pointerdown", onPD);
    return () => cvs.removeEventListener("pointerdown", onPD);
  }, [throws]);

  // 릴리즈: 발사 & 임시 파워바 숨김
  useEffect(() => {
    const up = () => {
      if (stateRef.current === GameState.Charging) {
        chargeUiRef.current.visible = false;
        releaseAndThrow();
      }
    };
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    window.addEventListener("pointerup", up);
    window.addEventListener("mouseleave", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("mouseleave", up);
    };
  }, []);

  // 키보드 입력 — W/S만
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyW") {
        if (
          stateRef.current === GameState.Idle ||
          stateRef.current === GameState.Between
        ) {
          setAngle((a) => {
            const na = Math.min(ANGLE_MAX, a + 1);
            angleRef.current = na;
            return na;
          });
          e.preventDefault();
        }
      } else if (e.code === "KeyS") {
        if (
          stateRef.current === GameState.Idle ||
          stateRef.current === GameState.Between
        ) {
          setAngle((a) => {
            const na = Math.max(ANGLE_MIN, a - 1);
            angleRef.current = na;
            return na;
          });
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // 차징 시작
  const beginCharge = () => {
    stateRef.current = GameState.Charging;
    chargeStartRef.current = performance.now();
    powerRef.current = POWER_MIN;
    setPower(POWER_MIN);
    trailRef.current = [];
    (navigator as any)?.vibrate?.(10);
  };

  // 릴리즈→투척 (tip에서 발사) — getLaunchTip 사용 (보정 없음)
  const releaseAndThrow = () => {
    stateRef.current = GameState.Flying;

    const newId = ++shotIdRef.current;
    activeShotIdRef.current = newId;
    resolvedRef.current = false;

    const v = powerToVelocity(powerRef.current);

    const { tipX, tipY, nx, ny } = getLaunchTip({
      base: baseField.launch,
      angleDeg: angleRef.current,
    });

    const p = projectileRef.current;
    p.x = tipX; // 동일 좌표
    p.y = tipY; // 동일 좌표
    p.prevX = p.x;
    p.prevY = p.y;
    p.vx = nx * v;
    p.vy = ny * v; // ny는 -sin(θ)
    p.active = true;
    p.launchedAt = performance.now();

    p.safetyTimer = window.setTimeout(() => {
      if (p.active && !resolvedRef.current) {
        resolvedRef.current = true;
        p.active = false;
        endThrow(false, p.x, p.y, newId);
      }
    }, SAFETY_TIMEOUT_MS);
  };

  // 투척 종료(중복 가드)
  const endThrow = (
    scored: boolean,
    x?: number,
    y?: number,
    shotId?: number
  ) => {
    if (shotId != null) {
      if (processedShotsRef.current.has(shotId)) return;
      if (activeShotIdRef.current !== shotId) return;
      processedShotsRef.current.add(shotId);
    }
    activeShotIdRef.current = null;

    const p = projectileRef.current;
    if (p.safetyTimer) {
      clearTimeout(p.safetyTimer);
      p.safetyTimer = undefined;
    }

    stateRef.current = GameState.Resolving;

    setThrows((t) => {
      const next = t + 1;

      if (scored) {
        setHits((h) => h + 1);
        triggerSuccessWave(x ?? baseField.launch.x, y ?? baseField.launch.y);
        triggerBucketGlow(560);
        spawnGreenSparks(x ?? baseField.launch.x, y ?? baseField.launch.y, 28);
        spawnGainCue();
      } else {
        triggerShake(180, 12);
      }

      // 다음 라운드
      window.setTimeout(() => {
        trailRef.current = [];
        if (next < MAX_THROWS) {
          stateRef.current = GameState.Between;

          const { left, right } = baseField.bucketRange;
          const toX = left + Math.random() * Math.max(10, right - left);
          tweenBucket(toX, 320);

          const { h: bH } = baseField.bucketSize;
          const yMin = Math.round(size.h * 0.5);
          const yMax = baseField.groundY - bH;
          bucketPosRef.current.y =
            yMin + Math.random() * Math.max(0, yMax - yMin);

          setTimeout(() => (stateRef.current = GameState.Idle), 120);
        } else {
          stateRef.current = GameState.Finished;
          setTimeout(() => setResultOpen(true), 420);
        }
      }, 300);

      return next;
    });
  };

  const totalGold = hits * GOLD_PER_HIT;

  const claimAndExit = async () => {
    if (claimedRef.current || claiming) {
      onExit?.();
      return;
    }
    setClaiming(true);
    try {
      if (totalGold > 0) {
        const ok = await addGold?.(totalGold);
        if (ok) {
          await fetchCoupleData?.();
          toast.success(`${totalGold}G 획득!`, { duration: 1200 });
        } else {
          toast.error("보상 지급 실패", { duration: 1200 });
        }
      }
      claimedRef.current = true;
    } catch (e) {
      console.error(e);
      toast.error("보상 지급 오류", { duration: 1200 });
    } finally {
      setClaiming(false);
      onExit?.();
    }
  };

  return (
    <div className="w-full flex justify-center">
      {/* 부모 안에서만 렌더되도록 max-w-full */}
      <div className="w-full max-w-full">
        <div ref={wrapRef} className="w-full max-w-full">
          <Card className="p-3 relative overflow-hidden">
            {/* 중앙 플로팅 "+G" */}
            <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
              {gainCues.map((g) => (
                <span
                  key={g.id}
                  className="animate-[floatFade_0.9s_ease-out_forwards] text-3xl font-extrabold text-emerald-500 drop-shadow-md"
                >
                  +{GOLD_PER_HIT}
                </span>
              ))}
            </div>

            {/* 캔버스 */}
            <div className="w-full max-w-full">
              <canvas
                ref={canvasRef}
                style={{ display: "block", maxWidth: "100%" }}
              />
            </div>

            {/* 하단 통계 */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-white/70 backdrop-blur px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <FontAwesomeIcon icon={faRotateRight} className="h-4 w-4" />
                  <span className="text-sm font-semibold">시도 횟수</span>
                </div>
                <div className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight">
                  {throws}{" "}
                  <span className="text-base text-slate-500">
                    / {MAX_THROWS}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border bg-yellow-50/70 backdrop-blur px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-yellow-800">
                  <FontAwesomeIcon icon={faCoins} className="h-4 w-4" />
                  <span className="text-sm font-semibold">누적 보상</span>
                </div>
                <div className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight text-yellow-900">
                  {totalGold}G
                </div>
              </div>
            </div>

            {/* "+G" 애니메이션 키프레임 */}
            <style jsx>{`
              @keyframes floatFade {
                0% {
                  transform: translateY(8px) scale(0.98);
                  opacity: 0;
                }
                20% {
                  opacity: 1;
                }
                60% {
                  transform: translateY(-8px) scale(1.02);
                }
                100% {
                  transform: translateY(-18px) scale(1.02);
                  opacity: 0;
                }
              }
            `}</style>
          </Card>

          {/* 결과 모달 — 바깥 클릭으로 닫혀도 자동 보상 */}
          <Dialog
            open={resultOpen}
            onOpenChange={(o) => {
              setResultOpen(o);
              if (!o && stateRef.current === GameState.Finished) {
                claimAndExit();
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>결과</DialogTitle>
                <DialogDescription className="text-sm">
                  총 명중: <b>{hits}</b> / {MAX_THROWS}
                  <br />총 획득 예정 보상:{" "}
                  <b className="text-emerald-600">{hits * GOLD_PER_HIT}G</b>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="sm:justify-end">
                <Button onClick={claimAndExit} disabled={claiming}>
                  보상 받기 & 게임 목록으로
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

/* 메타 등록 */
export const potatoTossMeta: MiniGameDef = {
  id: "potato-toss",
  title: "감자 던지기",
  icon: <FontAwesomeIcon icon={faBullseye} className="h-5 w-5" />,
  entryFee: 50,
  howTo:
    "1) 각도: W/S (꾹 누르면 연속).\n" +
    "2) 캔버스(게임 배경)를 꾹 누르면 파워가 차징되고, 떼면 발사됩니다. 발사 원점은 화살표 끝입니다.\n" +
    "3) 성공은 바구니 윗입구 직선을 아래로 통과해야 인정(옆면 접촉 무효).\n" +
    "4) 성공 1회당 5골드 누적, 종료 후 자동 지급(모달 바깥 클릭해도 지급, 중복 방지).",
  Component: PotatoTossGame,
};
