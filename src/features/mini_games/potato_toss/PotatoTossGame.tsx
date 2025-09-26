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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullseye,
  faCoins,
  faMeteor,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";
import type { MiniGameDef } from "@/features/mini_games/RecipeMemoryGame";

import {
  GRAVITY,
  POWER_MIN,
  POWER_MAX,
  LAUNCH_ARROW_LEN,
  powerToVelocity,
  getLaunchTip,
  clamp01,
  toRad,
} from "./physics";

import type { TossEvent, RoundEventPlan } from "./events";
import {
  planRoundEvent,
  spawnPreRoundGoodOrObstacle,
  spawnPostLaunchObstacles,
  updateEvent,
  drawEvent,
  checkCollision,
  EVENT_TEXT,
  GOOD_REWARD,
} from "./events";

import { useCoupleContext } from "@/contexts/CoupleContext";

// ============ 상수/타입 ============
const MAX_THROWS = 10;
const GOLD_PER_HIT = 5;
const CHARGE_DURATION_MS = 1200;
const TRAIL_MAX_POINTS = 160;
const TRAIL_POINT_MIN_DIST = 9;
const OFF_MARGIN = 60;
const SAFETY_TIMEOUT_MS = 12000;
const SAFE_PAD = 16;

enum GameState {
  Idle = "Idle",
  Charging = "Charging",
  Flying = "Flying",
  Resolving = "Resolving",
  Between = "Between",
  Finished = "Finished",
}
type AttemptResult = "hit" | "miss";

// ============ 컴포넌트 ============
export function PotatoTossGame({ onExit }: { onExit?: () => void }) {
  const { addGold, fetchCoupleData } = useCoupleContext() as {
    addGold?: (amt: number) => Promise<boolean>;
    fetchCoupleData?: () => Promise<void>;
  };

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // UI 상태
  const [angle, setAngle] = useState<number>(48);
  const [power, setPower] = useState<number>(POWER_MIN);
  const [throws, setThrows] = useState<number>(0);
  const [hits, setHits] = useState<number>(0);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [resultOpen, setResultOpen] = useState<boolean>(false);

  // 라운드 계획 & 스폰 상태
  const roundPlanRef = useRef<RoundEventPlan>({ type: "none" });
  const goodEventRef = useRef<TossEvent | null>(null); // 보상(발사 전 1개)
  const preObstaclesRef = useRef<TossEvent[]>([]); // 방해물(발사 전 둥실)
  const obstaclesRef = useRef<TossEvent[]>([]); // 방해물(발사 후 급강하 = rock)
  // 배너: "스테이지당 하나" — 스테이지 끝날 때까지 유지
  const [banner, setBanner] = useState<{
    text: string;
    variant: "good" | "obstacle";
  } | null>(null);

  // 첫 발사 원점 안정화
  const readyRef = useRef(false);

  const claimedRef = useRef(false);
  const [claiming, setClaiming] = useState(false);

  // 상태 refs
  const stateRef = useRef<GameState>(GameState.Idle);
  const angleRef = useRef(angle);
  const powerRef = useRef(power);
  useEffect(() => void (angleRef.current = angle), [angle]);
  useEffect(() => void (powerRef.current = power), [power]);

  // 차징
  const chargeStartRef = useRef<number | null>(null);
  const chargeUiRef = useRef<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  // 샷 관리
  const resolvedRef = useRef(false);
  const shotIdRef = useRef(0);
  const activeShotIdRef = useRef<number | null>(null);
  const processedShotsRef = useRef<Set<number>>(new Set());

  // 캔버스 이펙트
  const shakeRef = useRef<{ t: number; dur: number; amp: number }>({
    t: 0,
    dur: 0,
    amp: 0,
  });
  const triggerShake = (ms = 160, amp = 10) =>
    (shakeRef.current = { t: 0, dur: ms, amp });

  const successWaveRef = useRef<{
    t: number;
    dur: number;
    x: number;
    y: number;
  } | null>(null);
  const triggerSuccessWave = (x: number, y: number, dur = 520) =>
    (successWaveRef.current = { t: 0, dur, x, y });

  type Spark = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    max: number;
    size: number;
    color?: string;
  };
  const sparksRef = useRef<Spark[]>([]);
  const spawnSparks = (x: number, y: number, n = 26, color = "#16a34a") => {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 220 + Math.random() * 300;
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 80,
        life: 720 + Math.random() * 480,
        max: 720 + Math.random() * 480,
        size: 2 + Math.random() * 2.8,
        color,
      });
    }
  };
  // 보상용 콘페티(다색)
  const spawnConfetti = (x: number, y: number, n = 36) => {
    const colors = [
      "#10b981",
      "#22c55e",
      "#86efac",
      "#34d399",
      "#059669",
      "#a7f3d0",
      "#6ee7b7",
    ];
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 260 + Math.random() * 340;
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 120,
        life: 700 + Math.random() * 600,
        max: 700 + Math.random() * 600,
        size: 2 + Math.random() * 3.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  };

  // 중앙 큐
  const centerCueRef = useRef<{
    t: number;
    dur: number;
    text: "SUCCESS" | "MISS";
    color: string;
  } | null>(null);
  const triggerCenterCue = (text: "SUCCESS" | "MISS") => {
    centerCueRef.current = {
      t: 0,
      dur: 900,
      text,
      color: text === "SUCCESS" ? "#10b981" : "#ef4444",
    };
  };

  // 반응형 캔버스 크기 & 컨텍스트
  const [size, setSize] = useState({ w: 720, h: 420 });
  useEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(() => {
      const parentW = el.clientWidth;
      const w = Math.max(360, Math.min(1000, parentW));
      const h = Math.round(w * 0.58);
      setSize({ w, h });
    });
    el && ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef(1);
  useEffect(() => {
    const cvs = canvasRef.current!;
    const dpr = Math.max(1, Math.min(3, (window as any).devicePixelRatio || 1));
    cvs.style.display = "block";
    cvs.style.width = `${size.w}px`;
    cvs.style.height = `${size.h}px`;
    cvs.width = Math.floor(size.w * dpr);
    cvs.height = Math.floor(size.h * dpr);
    const ctx = cvs.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    dprRef.current = dpr;
    setTimeout(() => {
      readyRef.current = true;
    }, 0);
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
    const groundY = size.h - 44 - SAFE_PAD;
    const launch = { x: SAFE_PAD + 68, y: groundY - 18 };
    const bucketW = 117,
      bucketH = 58;
    const left = Math.max(launch.x + 230, size.w * 0.42);
    const right = size.w - bucketW - 28 - SAFE_PAD;
    return {
      groundY,
      launch,
      bucketSize: { w: bucketW, h: bucketH },
      bucketRange: { left, right },
    };
  }, [size]);

  // 바구니 위치/트윈
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
    const yMin = Math.round(size.h * 0.5),
      yMax = baseField.groundY - bH;
    const y = yMin + Math.random() * Math.max(0, yMax - yMin);
    bucketPosRef.current.y = y;
    if (withTween) tweenBucket(x, 320);
    else setBucketImmediate(x);
  };
  useEffect(() => void randomizeBucketPosition(false), [baseField]);

  // 발사체 + 트레일
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

  const trailRef = useRef<Array<{ x: number; y: number }>>([]);

  // ===== 라운드 계획 & 스폰 =====
  const setupRoundPlanAndSpawnGood = () => {
    const plan = planRoundEvent();
    roundPlanRef.current = plan;
    goodEventRef.current = null;
    obstaclesRef.current = [];
    preObstaclesRef.current = [];

    if (plan.type === "good" && plan.goodKind) {
      const ev = spawnPreRoundGoodOrObstacle(size, plan.goodKind);
      goodEventRef.current = ev;
      setBanner({ text: EVENT_TEXT[plan.goodKind].banner, variant: "good" });
    } else if (plan.type === "obstacle" && plan.obstacleKind) {
      if (plan.obstacleKind === "rock") {
        // rock은 발사 직후 스폰 → 배너만 먼저
        setBanner({ text: EVENT_TEXT["rock"].banner, variant: "obstacle" });
      } else {
        // rock 제외 모든 방해물은 시작부터 둥실
        const count = 1 + Math.floor(Math.random() * 3); // 1~3개
        const evs: TossEvent[] = [];
        for (let i = 0; i < count; i++) {
          evs.push(
            // ▶️ obstacleKind를 그대로 전달: ghost면 👻만, umbrella면 ☂️만
            spawnPreRoundGoodOrObstacle(
              size,
              plan.obstacleKind as "ghost" | "bee" | "helicopter" | "umbrella"
            )
          );
        }
        preObstaclesRef.current = evs;
        setBanner({
          text: EVENT_TEXT[plan.obstacleKind].banner,
          variant: "obstacle",
        });
      }
    } else {
      setBanner(null);
    }
  };

  // 렌더 루프
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = ctxRef.current!;

    let raf = 0;
    let prev = performance.now();

    const roundRectPath = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    };

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

    const drawLauncher = () => {
      const { x, y } = baseField.launch;
      const theta = toRad(angleRef.current);
      const nx = Math.cos(theta),
        ny = -Math.sin(theta);
      const tipX = x + nx * LAUNCH_ARROW_LEN,
        tipY = y + ny * LAUNCH_ARROW_LEN;

      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      roundRectPath(x - 18, y - 22, 46, 20, 6);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${angleRef.current}°`, x - 12, y - 12);

      const perpX = -ny,
        perpY = nx;
      const headLen = 10,
        headWidth = 12;
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
    };

    const drawCuteBasket = () => {
      const { w, h } = baseField.bucketSize;
      const { x, y } = bucketPosRef.current;
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, "#fde68a");
      g.addColorStop(1, "#f59e0b");
      ctx.fillStyle = g;
      roundRectPath(x, y + 10, w, h - 10, 12);
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
      roundRectPath(x - 3, y, w + 6, 16, 8);
      ctx.fill();
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
      ctx.font =
        "22px Apple Color Emoji, Noto Color Emoji, Segoe UI Emoji, EmojiOne, sans-serif";
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

    const drawSuccessWave = (dtMs: number) => {
      const sw = successWaveRef.current;
      if (!sw) return;
      sw.t += dtMs;
      const k = clamp01(sw.t / sw.dur),
        r = 30 + 140 * k,
        a = 0.42 * (1 - k);
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

    const drawCenterCue = (dtMs: number) => {
      const cue = centerCueRef.current;
      if (!cue) return;
      cue.t += dtMs;
      const k = Math.min(1, cue.t / cue.dur);
      const alpha = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
      const scale = 1 + 0.06 * Math.sin((k * Math.PI) / 1.0);
      ctx.save();
      ctx.translate(size.w / 2, size.h / 2 - 30);
      ctx.scale(scale, scale);
      ctx.font =
        "900 56px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 12;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = cue.color;
      ctx.fillText(cue.text, 0, 0);
      ctx.restore();
      if (k >= 1) centerCueRef.current = null;
    };

    const drawFancyBanner = (text: string, variant: "good" | "obstacle") => {
      const padX = 16;
      ctx.save();
      ctx.font =
        "700 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      const textW = ctx.measureText(text).width;
      const w = Math.ceil(textW) + padX * 2,
        h = 34;
      const x = (size.w - w) / 2,
        y = 10;

      const grad = ctx.createLinearGradient(x, y, x, y + h);
      if (variant === "good") {
        grad.addColorStop(0, "rgba(16,185,129,0.95)");
        grad.addColorStop(1, "rgba(5,150,105,0.95)");
      } else {
        grad.addColorStop(0, "rgba(244,63,94,0.95)");
        grad.addColorStop(1, "rgba(190,18,60,0.95)");
      }

      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = grad;
      const rr = 12;
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const s = 1 + 0.02 * Math.sin(performance.now() / 240);
      ctx.save();
      ctx.translate(size.w / 2, y + h / 2);
      ctx.scale(s, s);
      ctx.fillText(text, 0, 0);
      ctx.restore();
      ctx.restore();
    };

    const updateBucketTween = (dtMs: number) => {
      const anim = bucketAnimRef.current;
      if (!anim) return;
      anim.t += dtMs;
      const k = Math.min(1, anim.t / anim.dur);
      const ease = 1 - Math.pow(1 - k, 3);
      bucketPosRef.current.x = anim.from + (anim.to - anim.from) * ease;
      if (k >= 1) bucketAnimRef.current = null;
    };

    const step = () => {
      const now = performance.now();
      const dtMs = Math.min(33, now - prev);
      prev = now;
      const dt = dtMs / 1000;

      if (
        stateRef.current === GameState.Charging &&
        chargeStartRef.current != null
      ) {
        const elapsed = now - chargeStartRef.current;
        const k = Math.min(1, elapsed / CHARGE_DURATION_MS);
        const p = Math.round(POWER_MIN + k * (POWER_MAX - POWER_MIN));
        if (p !== powerRef.current) setPower((powerRef.current = p));
      }

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

      // === draw ===
      const ctx = ctxRef.current!;
      ctx.clearRect(0, 0, size.w, size.h);
      ctx.save();
      ctx.translate(offX, offY);
      drawBackground();
      drawLauncher();
      drawCuteBasket();

      // Pre-round: good / obstacle(ghost/bee)
      const good = goodEventRef.current;
      if (good) {
        updateEvent(good, dt, size);
        drawEvent(ctx, good);
      }

      preObstaclesRef.current = preObstaclesRef.current.filter(
        (ev) => ev.alive
      );
      for (const ev of preObstaclesRef.current) {
        updateEvent(ev, dt, size);
        drawEvent(ctx, ev);
      }

      // 발사체
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

        // 방해물(Post: rock)
        obstaclesRef.current = obstaclesRef.current.filter((ev) => ev.alive);
        for (const ev of obstaclesRef.current) {
          updateEvent(ev, dt, size);
          drawEvent(ctx, ev);
          if (!ev.hit && checkCollision(proj, ev)) {
            ev.hit = true;
            spawnSparks(ev.x, ev.y, 18, "#ef4444");
            // rock 반응(살짝 튀기기)
            proj.vy = -Math.abs(proj.vy) * 0.55;
            proj.vx *= 0.85;
            ev.alive = false;
          }
        }

        // 사전 방해물(ghost/bee) 충돌
        for (const ev of preObstaclesRef.current) {
          if (ev.alive && !ev.hit && checkCollision(proj, ev)) {
            ev.hit = true;
            spawnSparks(ev.x, ev.y, 16, "#f43f5e");
            // 경로 교란(살짝 각 방향으로 비틀어주기)
            const sign = proj.x < ev.x ? -1 : 1;
            proj.vx = Math.max(60, Math.abs(proj.vx)) * sign * 0.65;
            proj.vy *= 0.9;
          }
        }
        // 사전 보상 충돌
        if (good && !good.hit && good.alive && checkCollision(proj, good)) {
          good.hit = true;
          const reward = GOOD_REWARD[good.kind as "star" | "chest" | "balloon"];
          // 이펙트 강화: 콘페티 + 서지 + 살짝 셰이크
          spawnConfetti(good.x, good.y, 42);
          spawnSparks(good.x, good.y, 28, "#22c55e");
          triggerSuccessWave(good.x, good.y, 600);
          triggerShake(120, 6);
          toast.success(`보너스 +${reward}G!`, { duration: 900 });
          bonusGoldRef.current += reward;
          good.alive = false;
        }

        // 성공 체크(바스켓 림 통과)
        const getOpening = () => {
          const { w } = baseField.bucketSize;
          const rimInset = 10;
          const x1 = bucketPosRef.current.x + rimInset;
          const x2 = bucketPosRef.current.x + w - rimInset;
          const y = bucketPosRef.current.y + rimInset;
          return { x1, x2, y };
        };
        const { x1, x2, y } = getOpening();
        const prevBottom = proj.prevY + proj.r,
          currBottom = proj.y + proj.r;
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
            if (proj.safetyTimer) clearTimeout(proj.safetyTimer);
            endThrow(true, crossX, y, activeShotIdRef.current!);
          }
        }

        // 실패 판정
        if (!resolvedRef.current) {
          const offRight = proj.x - proj.r > size.w + OFF_MARGIN;
          const offLeft = proj.x + proj.r < -OFF_MARGIN;
          const offBottom = proj.y - proj.r > size.h + OFF_MARGIN;
          const hitGround = proj.y + proj.r >= baseField.groundY;
          if (hitGround || offRight || offLeft || offBottom) {
            resolvedRef.current = true;
            proj.active = false;
            if (proj.safetyTimer) clearTimeout(proj.safetyTimer);
            endThrow(false, proj.x, proj.y, activeShotIdRef.current!);
          }
        }
      } else {
        // 비행 중이 아닐 때도 잔존물 업데이트
        obstaclesRef.current = obstaclesRef.current.filter((ev) => ev.alive);
        for (const ev of obstaclesRef.current) {
          updateEvent(ev, dt, size);
          drawEvent(ctx, ev);
        }
        preObstaclesRef.current = preObstaclesRef.current.filter(
          (ev) => ev.alive
        );
        for (const ev of preObstaclesRef.current) {
          updateEvent(ev, dt, size);
          drawEvent(ctx, ev);
        }
      }

      // 스파크 파티클
      sparksRef.current = sparksRef.current.filter((s) => {
        s.life -= dtMs;
        const k = Math.max(0, s.life / s.max);
        s.x += s.vx * dt;
        s.y += s.vy * dt + (1 - k) * 40 * dt;
        ctx.save();
        ctx.globalAlpha = k;
        ctx.fillStyle = s.color || "rgba(16,185,129,1)";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return s.life > 0;
      });

      // 이펙트
      drawSuccessWave(dtMs);
      drawTrail();
      if (projectileRef.current.active)
        drawPotatoEmoji(projectileRef.current.x, projectileRef.current.y);

      // 차징 바
      if (chargeUiRef.current.visible) {
        const { x, y } = chargeUiRef.current;
        const ratio = (powerRef.current - POWER_MIN) / (POWER_MAX - POWER_MIN);
        const barW = 160,
          barH = 10;
        const rx = Math.round(
          Math.max(SAFE_PAD, Math.min(size.w - SAFE_PAD - barW, x - barW / 2))
        );
        const ry = Math.round(
          Math.max(SAFE_PAD, Math.min(size.h - SAFE_PAD - barH - 4, y - 30))
        );
        ctx.save();
        ctx.fillStyle = "#e5e7eb";
        roundRectPath(rx, ry, barW, barH, 6);
        ctx.fill();
        ctx.fillStyle = "#22c55e";
        roundRectPath(rx, ry, Math.max(6, barW * ratio), barH, 6);
        ctx.fill();
        ctx.strokeStyle = "#9ca3af";
        ctx.lineWidth = 1;
        roundRectPath(rx, ry, barW, barH, 6);
        ctx.stroke();
        ctx.fillStyle = "#111827";
        ctx.font =
          "11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(`${Math.round(powerRef.current)}%`, rx + barW / 2, ry - 2);
        ctx.restore();
      }

      // 중앙 SUCCESS / MISS
      drawCenterCue(dtMs);

      // 상단 배너
      if (banner) drawFancyBanner(banner.text, banner.variant);

      ctx.restore();
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [size, baseField, attempts, banner]);

  // ==== 입력: 포인터 ==== //
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ac = new AbortController();

    const onPD = (e: PointerEvent) => {
      if (!readyRef.current) return;
      if (
        !(
          stateRef.current === GameState.Idle ||
          stateRef.current === GameState.Between
        )
      )
        return;
      if (throws >= MAX_THROWS) return;
      const rect = cvs.getBoundingClientRect();
      const x = e.clientX - rect.left,
        y = e.clientY - rect.top;
      const clampedX = Math.max(SAFE_PAD, Math.min(rect.width - SAFE_PAD, x));
      const clampedY = Math.max(SAFE_PAD, Math.min(rect.height - SAFE_PAD, y));
      chargeUiRef.current = { x: clampedX, y: clampedY, visible: true };
      beginCharge();
      e.preventDefault();
    };

    const onPU = () => {
      if (stateRef.current === GameState.Charging) {
        chargeUiRef.current.visible = false;
        releaseAndThrow();
      }
    };

    cvs.addEventListener("pointerdown", onPD, { signal: ac.signal });
    window.addEventListener("pointerup", onPU, { signal: ac.signal });
    window.addEventListener("mouseleave", onPU, { signal: ac.signal });
    return () => ac.abort();
  }, [throws]);

  // 키보드: W/S 각도 (속도 ↑: 2도)
  useEffect(() => {
    const ac = new AbortController();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyW") {
        if (
          [GameState.Idle, GameState.Between, GameState.Charging].includes(
            stateRef.current
          )
        ) {
          const na = Math.min(75, angleRef.current + 2);
          setAngle((angleRef.current = na));
          e.preventDefault();
        }
      } else if (e.code === "KeyS") {
        if (
          [GameState.Idle, GameState.Between, GameState.Charging].includes(
            stateRef.current
          )
        ) {
          const na = Math.max(15, angleRef.current - 2);
          setAngle((angleRef.current = na));
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown, { signal: ac.signal });
    return () => ac.abort();
  }, []);

  // ==== 상태 전이 ==== //
  const beginCharge = () => {
    stateRef.current = GameState.Charging;
    chargeStartRef.current = performance.now();
    powerRef.current = POWER_MIN;
    setPower(POWER_MIN);
    trailRef.current = [];
    (navigator as any)?.vibrate?.(10);
  };

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
    p.x = tipX;
    p.y = tipY;
    p.prevX = p.x;
    p.prevY = p.y;
    p.vx = nx * v;
    p.vy = ny * v;
    p.active = true;
    p.launchedAt = performance.now();

    // 방해물 스폰(발사 직후): rock만 해당
    if (
      roundPlanRef.current.type === "obstacle" &&
      roundPlanRef.current.obstacleKind === "rock"
    ) {
      obstaclesRef.current.push(...spawnPostLaunchObstacles(size, "rock"));
    }

    // Safety
    p.safetyTimer = window.setTimeout(() => {
      if (p.active && !resolvedRef.current) {
        resolvedRef.current = true;
        p.active = false;
        endThrow(false, p.x, p.y, newId);
      }
    }, SAFETY_TIMEOUT_MS);
  };

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

    setThrows((t) => t + 1);
    setAttempts((arr) => [...arr, scored ? "hit" : "miss"]);
    if (scored) setHits((h) => h + 1);

    queueMicrotask(() => {
      if (scored) {
        triggerSuccessWave(x ?? baseField.launch.x, y ?? baseField.launch.y);
        spawnSparks(
          x ?? baseField.launch.x,
          y ?? baseField.launch.y,
          30,
          "#10b981"
        );
        triggerCenterCue("SUCCESS");
      } else {
        triggerShake(180, 12);
        triggerCenterCue("MISS");
      }
    });

    window.setTimeout(() => {
      trailRef.current = [];
      const next = throws + 1;
      if (next < MAX_THROWS) {
        stateRef.current = GameState.Between;

        // 바구니 이동
        const { left, right } = baseField.bucketRange;
        const toX = left + Math.random() * Math.max(10, right - left);
        tweenBucket(toX, 320);
        const { h: bH } = baseField.bucketSize;
        const yMin = Math.round(size.h * 0.5),
          yMax = baseField.groundY - bH;
        bucketPosRef.current.y =
          yMin + Math.random() * Math.max(0, yMax - yMin);

        // 다음 라운드 진입
        setTimeout(() => {
          // 잔여물 정리
          obstaclesRef.current = [];
          preObstaclesRef.current = [];
          goodEventRef.current = null;

          stateRef.current = GameState.Idle;
          setupRoundPlanAndSpawnGood();
        }, 120);
      } else {
        stateRef.current = GameState.Finished;
        setTimeout(() => setResultOpen(true), 420);
      }
    }, 300);
  };

  // 게임 시작 시 1회 라운드 계획 + 스폰
  useEffect(() => {
    setupRoundPlanAndSpawnGood(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  // 보너스 골드 누적(보상 이벤트용)
  const bonusGoldRef = useRef(0);
  const totalGold = hits * GOLD_PER_HIT + bonusGoldRef.current;

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

  // 시도 결과 뱃지 UI
  const AttemptDots = () => {
    const items = Array.from({ length: MAX_THROWS }).map((_, i) => {
      const v = attempts[i];
      if (v === "hit") {
        return (
          <span
            key={i}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-500/70 text-emerald-600 font-extrabold"
            title="성공"
          >
            O
          </span>
        );
      }
      if (v === "miss") {
        return (
          <span
            key={i}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-rose-500/70 text-rose-600 font-extrabold"
            title="실패"
          >
            X
          </span>
        );
      }
      return (
        <span
          key={i}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-300"
          title="대기"
        >
          •
        </span>
      );
    });
    return <div className="mt-2 flex flex-wrap gap-1.5">{items}</div>;
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-full">
        <div ref={wrapRef} className="w-full max-w-full">
          <Card className="p-3 relative overflow-hidden">
            <div className="w-full max-w-full">
              <canvas
                ref={canvasRef}
                style={{ display: "block", maxWidth: "100%" }}
              />
            </div>
          </Card>

          {/* 통계/보상 */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border bg-white/70 backdrop-blur px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <FontAwesomeIcon icon={faRotateRight} className="h-4 w-4" />
                <span className="text-sm font-semibold">시도 횟수</span>
              </div>
              <div className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight">
                {throws}{" "}
                <span className="text-base text-slate-500">/ {MAX_THROWS}</span>
              </div>
              <AttemptDots />
            </div>

            <div className="rounded-2xl border bg-yellow-50/70 backdrop-blur px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-yellow-800">
                <FontAwesomeIcon icon={faCoins} className="h-4 w-4" />
                <span className="text-sm font-semibold">누적 보상</span>
              </div>
              <div className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight text-yellow-900">
                {totalGold}G
              </div>
              <div className="mt-1 text-xs text-slate-500">
                (기본: {hits * GOLD_PER_HIT}G, 이벤트 보너스:{" "}
                {bonusGoldRef.current}G)
              </div>
            </div>
          </div>

          {/* 결과 모달 */}
          <Dialog
            open={resultOpen}
            onOpenChange={(o) => {
              setResultOpen(o);
              if (!o && stateRef.current === GameState.Finished)
                void claimAndExit();
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>결과</DialogTitle>
                <DialogDescription className="text-sm">
                  총 명중: <b>{hits}</b> / {MAX_THROWS}
                  <br />
                  <br />총 획득 예정 보상:{" "}
                  <b className="text-emerald-600">{totalGold}G</b>
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

export const potatoTossMeta: MiniGameDef = {
  id: "potato-toss",
  title: "감자 던지기",
  icon: "🎯",
  entryFee: 30,
  howTo:
    "1) 각도: W/S (차징 중에도 변경 가능, 2° 단위)\n" +
    "2) 캔버스를 꾹 누르면 파워가 차징되고, 떼면 발사됩니다. 발사 원점은 화살표 끝입니다.\n" +
    "3) 성공은 바구니 윗입구 직선을 아래로 통과해야 인정(옆면 접촉 무효)\n" +
    "4) 성공 1회당 5G가 누적됩니다.\n" +
    "5) 라운드당 하나의 상태가 유지됩니다(배너 고정). 확률: 없음 35%, 보상 40%, 방해 25%.\n" +
    "   - 보상(⭐️/🎁/🎈): 스테이지 시작부터 둥실. 맞추면 +30/+15/+7G\n" +
    "   - 방해(👻/🐝/🪨): 👻/🐝는 시작부터 둥실, 🪨은 발사 후 상단에서 급강하\n" +
    "6) 발사 전 예측 궤적은 표시하지 않고, 발사 후 궤적 트레일만 남습니다.",
  Component: PotatoTossGame,
};
