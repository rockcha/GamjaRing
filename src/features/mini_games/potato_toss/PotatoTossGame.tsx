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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCoupleContext } from "@/contexts/CoupleContext";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullseye,
  faGaugeHigh,
  faHandPointer,
} from "@fortawesome/free-solid-svg-icons";

/* 공용 메타 타입 */
import type { MiniGameDef } from "@/features/mini_games/RecipeMemoryGame";

/** ─────────────────────────────────────────────────────────────
 * Potato Toss — 포물선 던지기 (Canvas 2D)
 * - OX 히스토리 제거 → 상단 스탯 칩(진행 n/10, 명중, 보상) 고정
 * - 보상은 우상단에 고정(누적 표기). 히트마다 중앙 "+5" 플로팅
 * - 보상: 종료 시 일괄 지급(5G/성공)
 * - 성공 연출 중복 호출 제거: endThrow에서만 실행
 * - 바구니 위치는 라운드 종료 후에만 변경
 * ───────────────────────────────────────────────────────────── */

type Props = { onExit?: () => void };

const MAX_THROWS = 10;
const GRAVITY = 1200;
const POWER_MIN = 20;
const POWER_MAX = 100;
const ANGLE_MIN = 15;
const ANGLE_MAX = 75;

// 파워→초기속도(px/s)
const powerToVelocity = (p: number) => 320 + (p / 100) * 820;

const CHARGE_DURATION_MS = 1200;
const TRAIL_MAX_POINTS = 160;
const TRAIL_POINT_MIN_DIST = 9;
const OFF_MARGIN = 60;
const SAFETY_TIMEOUT_MS = 12000;
const GOLD_PER_HIT = 10;

// +5 플로팅 큐 타입
type GainCue = { id: number; t: number; dur: number };

export function PotatoTossGame({ onExit }: Props) {
  const { addGold, fetchCoupleData } = useCoupleContext() as {
    addGold?: (amt: number) => Promise<boolean>;
    fetchCoupleData?: () => Promise<void>;
  };

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 상태
  const [angle, setAngle] = useState<number>(48);
  const [power, setPower] = useState<number>(POWER_MIN);
  const [charging, setCharging] = useState<boolean>(false);
  const chargeStartRef = useRef<number | null>(null);

  const [throws, setThrows] = useState<number>(0);
  const [hits, setHits] = useState<number>(0);
  const [busy, setBusy] = useState<boolean>(false);
  const [resultOpen, setResultOpen] = useState<boolean>(false);

  // 플로팅 "+5" 큐
  const [gainCues, setGainCues] = useState<GainCue[]>([]);
  const gainIdRef = useRef<number>(0);
  const spawnGainCue = () => {
    const id = ++gainIdRef.current;
    setGainCues((arr) => [...arr, { id, t: 0, dur: 900 }]);
    setTimeout(
      () => setGainCues((arr) => arr.filter((g) => g.id !== id)),
      1000
    );
  };

  // 각도 드래그
  const draggingAngleRef = useRef<boolean>(false);

  // 중복 방지 락 + 샷 식별자
  const resolvedRef = useRef<boolean>(false); // 성공/실패 판정 단 1회
  const recordedRef = useRef<boolean>(false); // 기록 단 1회
  const shotIdRef = useRef<number>(0);
  const activeShotIdRef = useRef<number | null>(null);

  // 실패 연출(화면 흔들림)
  const shakeRef = useRef<{ t: number; dur: number; amp: number }>({
    t: 0,
    dur: 0,
    amp: 0,
  });
  const triggerShake = (ms = 160, amp = 10) => {
    shakeRef.current = { t: 0, dur: ms, amp };
  };

  // 성공 이펙트(초록 글로우 + 스파클)
  const successWaveRef = useRef<{
    t: number;
    dur: number;
    x: number;
    y: number;
  } | null>(null);
  const triggerSuccessWave = (x: number, y: number, dur = 420) => {
    successWaveRef.current = { t: 0, dur, x, y };
  };

  // 초록 스파클 파티클
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

  // 바구니 글로우(외곽선만)
  const bucketGlowRef = useRef<{ t: number; dur: number }>({ t: 0, dur: 0 });
  const triggerBucketGlow = (ms = 560) => {
    bucketGlowRef.current = { t: 0, dur: ms };
  };

  // 반응형 캔버스
  const [size, setSize] = useState({ w: 720, h: 420 });
  useEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(() => {
      const w = Math.max(360, Math.min(1000, el.clientWidth));
      const h = Math.round(w * 0.58);
      setSize({ w, h });
    });
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // DPR + 컨텍스트 준비 (리사이즈시에만 업데이트)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef<number>(1);
  useEffect(() => {
    const cvs = canvasRef.current!;
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
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

  // 바구니 위치
  const bucketPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const randomizeBucketPosition = () => {
    const { left, right } = baseField.bucketRange;
    const x = left + Math.random() * Math.max(10, right - left);
    const y = baseField.groundY - baseField.bucketSize.h;
    bucketPosRef.current = { x, y };
  };
  useEffect(() => {
    randomizeBucketPosition();
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

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // 루프
  useEffect(() => {
    if (!canvasRef.current || !ctxRef.current) return;
    const ctx = ctxRef.current;

    let raf = 0;
    let prev = performance.now();
    let dtMs = 16;

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

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

    // 빨간 화살표 + 왼쪽 파워 게이지(캔버스 내)
    const drawLauncher = () => {
      const { x, y } = baseField.launch;
      const r = 64;
      const theta = toRad(angle);
      const tipX = x + Math.cos(theta) * r;
      const tipY = y - Math.sin(theta) * r;

      // 파워 게이지(왼쪽 수직바)
      const barW = 10,
        barH = 110;
      const bx = x - 30 - barW;
      const by = y - barH;
      const ratio = (power - POWER_MIN) / (POWER_MAX - POWER_MIN);
      ctx.fillStyle = "#e5e7eb";
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(bx, by + (1 - ratio) * barH, barW, ratio * barH);
      ctx.strokeStyle = "#9ca3af";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, barW, barH);

      // 빨간 화살표
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      const headLen = 16,
        headWidth = 14;
      const nx = Math.cos(theta),
        ny = -Math.sin(theta);
      const perpX = -ny,
        perpY = nx;
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

      // 몸통
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, "#fde68a");
      g.addColorStop(1, "#f59e0b");
      ctx.fillStyle = g;
      ctx.beginPath();
      (ctx as any).roundRect?.(x, y + 10, w, h - 10, 12);
      ctx.fill();

      // 앞면 짜임
      ctx.strokeStyle = "rgba(120,53,15,0.25)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 8 + i * 14, y + 16);
        ctx.lineTo(x + (i - 1) * 14 + 22, y + h - 8);
        ctx.stroke();
      }

      // 입구 테두리
      ctx.fillStyle = "#92400e";
      ctx.beginPath();
      (ctx as any).roundRect?.(x - 3, y, w + 6, 16, 8);
      ctx.fill();

      // 하트 엠블럼
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

    // 바구니 윗입구 직선
    const getOpening = () => {
      const { w } = baseField.bucketSize;
      const rimInset = 10;
      const x1 = bucketPosRef.current.x + rimInset;
      const x2 = bucketPosRef.current.x + w - rimInset;
      const y = bucketPosRef.current.y + rimInset;
      return { x1, x2, y };
    };

    // 초록 글로우(외곽선만)
    const drawBucketGlow = (alpha: number) => {
      const { w, h } = baseField.bucketSize;
      const { x, y } = bucketPosRef.current;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(16,185,129,0.95)";
      ctx.lineWidth = 12;
      ctx.shadowColor = "rgba(16,185,129,0.9)";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      (ctx as any).roundRect?.(x - 8, y - 6, w + 16, h + 14, 14);
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

    const step = () => {
      const now = performance.now();
      dtMs = now - prev;
      prev = now;
      const dt = dtMs / 1000;

      // 차징
      if (charging && chargeStartRef.current != null) {
        const elapsed = now - chargeStartRef.current;
        const k = Math.min(1, elapsed / CHARGE_DURATION_MS);
        const p = POWER_MIN + k * (POWER_MAX - POWER_MIN);
        setPower(Math.round(p));
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

      // 배경/오브젝트
      ctx.clearRect(0, 0, size.w, size.h);
      ctx.save();
      ctx.translate(offX, offY);
      drawBackground();
      drawLauncher();
      drawCuteBasket();

      // 발사체 업데이트
      const p = projectileRef.current;
      if (p.active) {
        p.prevX = p.x;
        p.prevY = p.y;
        p.vy += GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // 트레일
        const pts = trailRef.current;
        if (
          pts.length === 0 ||
          Math.hypot(p.x - pts[pts.length - 1].x, p.y - pts[pts.length - 1].y) >
            TRAIL_POINT_MIN_DIST
        ) {
          pts.push({ x: p.x, y: p.y });
          if (pts.length > TRAIL_MAX_POINTS) pts.shift();
        }

        // 성공 체크(윗입구 선 아래로 통과) — ※ 연출은 endThrow에서만!
        const { x1, x2, y } = getOpening();
        const prevBottom = p.prevY + p.r;
        const currBottom = p.y + p.r;
        if (
          !resolvedRef.current &&
          p.vy > 0 &&
          prevBottom < y &&
          currBottom >= y &&
          p.x >= x1 &&
          p.x <= x2
        ) {
          resolvedRef.current = true;
          p.active = false;
          endThrow(true, p.x, y, activeShotIdRef.current!);
        }

        // 지면/오프스크린 실패
        if (p.active && !resolvedRef.current) {
          const offRight = p.x - p.r > size.w + OFF_MARGIN;
          const offLeft = p.x + p.r < -OFF_MARGIN;
          const offBottom = p.y - p.r > size.h + OFF_MARGIN;
          const hitGround = p.y + p.r >= baseField.groundY;
          if (hitGround || offRight || offLeft || offBottom) {
            resolvedRef.current = true;
            p.active = false;
            endThrow(false, p.x, p.y, activeShotIdRef.current!);
          }
        }
      }

      // 성공 웨이브
      drawSuccessWave();

      // 바구니 글로우
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

      // 트레일 & 발사체
      drawTrail();
      if (p.active) {
        drawPotatoEmoji(p.x, p.y);
      }

      ctx.restore();
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [size, baseField, angle, power, charging]);

  // 각도 드래그 (캔버스 상에서만)
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const withinHandleOrBase = (px: number, py: number) => {
      const { x, y } = baseField.launch;
      const r = 64;
      const hx = x + Math.cos(toRad(angle)) * r;
      const hy = y - Math.sin(toRad(angle)) * r;
      const onHandle = Math.hypot(px - hx, py - hy) <= 16;
      const nearBase = Math.hypot(px - x, py - y) <= 64;
      return onHandle || nearBase;
    };

    const updateAngleByPointer = (px: number, py: number) => {
      const dx = px - baseField.launch.x;
      const dy = py - baseField.launch.y;
      let deg = (Math.atan2(-dy, dx) * 180) / Math.PI;
      deg = Math.max(ANGLE_MIN, Math.min(ANGLE_MAX, deg));
      setAngle(Math.round(deg));
    };

    const onDown = (e: PointerEvent) => {
      if (busy || charging || projectileRef.current.active) return;
      const r = cvs.getBoundingClientRect();
      const x = e.clientX - r.left,
        y = e.clientY - r.top;
      if (withinHandleOrBase(x, y)) {
        draggingAngleRef.current = true;
        e.preventDefault();
        updateAngleByPointer(x, y);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!draggingAngleRef.current) return;
      const r = cvs.getBoundingClientRect();
      updateAngleByPointer(e.clientX - r.left, e.clientY - r.top);
    };
    const onUp = () => {
      draggingAngleRef.current = false;
    };

    cvs.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      cvs.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [baseField, busy, charging, angle]);

  // 차징(꾹)
  const beginCharge = () => {
    if (busy) return;
    if (throws >= MAX_THROWS) return;
    if (projectileRef.current.active) return;
    if (draggingAngleRef.current) return;
    setCharging(true);
    chargeStartRef.current = performance.now();
    setPower(POWER_MIN);
    trailRef.current = [];
  };

  // 릴리즈 + 발사 (shotId 생성)
  const releaseAndThrow = () => {
    if (!charging) return; // 꾹 누르지 않은 경우 무시
    setCharging(false);
    if (busy || throws >= MAX_THROWS || projectileRef.current.active) return;

    setBusy(true);
    resolvedRef.current = false;
    recordedRef.current = false;

    // shot id
    const newId = ++shotIdRef.current;
    activeShotIdRef.current = newId;

    const v = powerToVelocity(power);
    const theta = toRad(angle);

    const p = projectileRef.current;
    p.x = baseField.launch.x;
    p.y = baseField.launch.y;
    p.prevX = p.x;
    p.prevY = p.y;
    p.vx = Math.cos(theta) * v;
    p.vy = -Math.sin(theta) * v;
    p.active = true;
    p.launchedAt = performance.now();

    // 세이프티
    p.safetyTimer = window.setTimeout(() => {
      if (p.active && !resolvedRef.current) {
        resolvedRef.current = true;
        p.active = false;
        endThrow(false, p.x, p.y, newId);
      }
    }, SAFETY_TIMEOUT_MS);
  };

  // mouseup/touchend 릴리즈
  useEffect(() => {
    const up = () => releaseAndThrow();
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    window.addEventListener("mouseleave", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
      window.removeEventListener("mouseleave", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charging, busy, throws, angle, power]);

  // 투척 종료(성공/실패 확정 시 단 1회 기록) — 성공 연출은 여기서만!
  const endThrow = (
    scored: boolean,
    x?: number,
    y?: number,
    shotId?: number
  ) => {
    // 샷 식별 불일치 또는 이미 기록되었으면 무시
    if (shotId != null && activeShotIdRef.current !== shotId) return;
    if (recordedRef.current) return;
    recordedRef.current = true;
    activeShotIdRef.current = null;

    const p = projectileRef.current;
    if (p.safetyTimer) {
      clearTimeout(p.safetyTimer);
      p.safetyTimer = undefined;
    }

    setThrows((t) => {
      const next = t + 1;

      if (scored) {
        setHits((h) => h + 1);
        // ✅ 성공 연출(단 1회) — 이전 중복 호출 제거됨
        triggerSuccessWave(x ?? baseField.launch.x, y ?? baseField.launch.y);
        triggerBucketGlow(560);
        spawnGreenSparks(x ?? baseField.launch.x, y ?? baseField.launch.y, 28);
        spawnGainCue();
      } else {
        triggerShake(180, 12);
      }

      // 다음 라운드 세팅(결과 확정 후에만 위치 변경)
      window.setTimeout(() => {
        setBusy(false);
        if (next < MAX_THROWS) {
          randomizeBucketPosition();
          trailRef.current = [];
        }
      }, 300);

      if (next >= MAX_THROWS) {
        window.setTimeout(() => setResultOpen(true), 420);
      }
      return next;
    });
  };

  const totalGold = hits * GOLD_PER_HIT;

  const claimAndExit = async () => {
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
    } catch (e) {
      console.error(e);
      toast.error("보상 지급 오류", { duration: 1200 });
    } finally {
      onExit?.();
    }
  };

  const progressPct = Math.round((throws / MAX_THROWS) * 100);

  return (
    <div className="w-full" ref={wrapRef}>
      {/* 상단 스탯 바 */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-[200px]">
          <Progress value={progressPct} />
        </div>
        <div className="hidden md:flex items-center gap-2">
          {/* 진행도 칩 */}
          <div className="rounded-lg border bg-white/70 backdrop-blur px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm">
            진행 <span className="font-extrabold text-slate-900">{throws}</span>{" "}
            / {MAX_THROWS}
          </div>
          {/* 명중 칩 */}
          <div className="rounded-lg border bg-emerald-50/80 backdrop-blur px-3 py-1.5 text-sm font-semibold text-emerald-700 shadow-sm">
            명중 <span className="font-extrabold text-emerald-700">{hits}</span>
          </div>
          {/* 보상 칩 */}
          <div className="rounded-lg border bg-yellow-50/90 backdrop-blur px-3 py-1.5 text-sm font-semibold text-yellow-800 shadow-sm">
            보상{" "}
            <span className="font-extrabold text-yellow-900">{totalGold}G</span>
          </div>
        </div>
      </div>

      <Card className="p-3 relative overflow-hidden">
        {/* 모바일에서도 잘 보이도록 좌/우 상단 고정 표시 */}
        <div className="absolute left-6 top-6 z-20 rounded-lg bg-white/70 backdrop-blur px-2.5 py-1.5 border text-base md:text-xl font-extrabold text-slate-800 shadow-sm">
          {throws}/{MAX_THROWS}
        </div>

        <div className="absolute right-6 top-6 z-20 rounded-lg bg-emerald-50/80 backdrop-blur px-2.5 py-1.5 border border-emerald-200 text-sm md:text-base font-bold text-emerald-700 shadow-sm">
          보상 {totalGold}G
        </div>

        {/* 중앙 상단: 명중 카운트 강조 */}
        <div className="absolute left-1/2 -translate-x-1/2 top-6 z-20 rounded-lg bg-white/60 backdrop-blur px-3 py-1.5 border text-base md:text-lg font-bold text-slate-800 shadow-sm">
          <FontAwesomeIcon
            icon={faBullseye}
            className="mr-2 h-4 w-4 text-emerald-600"
          />
          명중 <span className="font-extrabold">{hits}</span>
        </div>

        {/* 중앙 플로팅 "+5" 큐 */}
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
        <div className="w-full">
          <canvas ref={canvasRef} />
        </div>

        {/* 컨트롤 패널 — 슬림(기본값 버튼 제거) */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 각도 */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-sm flex items-center gap-2">
                <FontAwesomeIcon icon={faGaugeHigh} className="h-4 w-4" />
                각도 (캔버스 드래그 가능)
              </div>
              <span className="text-xs text-muted-foreground">{angle}°</span>
            </div>
            <input
              type="range"
              min={ANGLE_MIN}
              max={ANGLE_MAX}
              step={1}
              value={angle}
              onChange={(e) => setAngle(parseInt(e.target.value))}
              className="w-full"
              disabled={busy || projectileRef.current.active || charging}
            />
          </div>

          {/* 파워 현재값 안내 */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-sm flex items-center gap-2">
                <FontAwesomeIcon icon={faHandPointer} className="h-4 w-4" />
                파워(꾹 누르기)
              </div>
              <span className="text-xs text-muted-foreground">{power}%</span>
            </div>
            <div className="text-xs text-muted-foreground">
              버튼을 꾹 누르면 파워가 차고, 손을 떼면 발사돼요.
            </div>
          </div>

          {/* 액션 */}
          <div className="rounded-lg border p-3 grid place-items-center">
            <Button
              onMouseDown={() => beginCharge()}
              onTouchStart={() => beginCharge()}
              className={cn("gap-2 px-6", charging && "animate-pulse")}
              disabled={
                busy || projectileRef.current.active || throws >= MAX_THROWS
              }
            >
              <FontAwesomeIcon icon={faHandPointer} className="h-4 w-4" />
              {charging ? "꾹 누르는 중..." : "THROW (꾹)"}
            </Button>
          </div>
        </div>

        {/* "+5" 애니메이션 키프레임 */}
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

      {/* 결과 모달 — 종료 시 일괄 지급 */}
      <Dialog open={resultOpen} onOpenChange={(o) => setResultOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>결과</DialogTitle>
            <DialogDescription className="text-sm">
              총 명중: <b>{hits}</b> / {MAX_THROWS}
              <br />총 획득 예정 보상:{" "}
              <b className="text-emerald-600">{totalGold}G</b>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button onClick={claimAndExit}>보상 받기 & 게임 목록으로</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    "1) 각도는 슬라이더 또는 캔버스의 빨간 화살표를 드래그해 조절합니다.\n" +
    "2) THROW 버튼을 꾹 누르면 파워가 차고, 손을 떼면 발사됩니다.\n" +
    "3) 성공은 바구니 윗입구 직선을 아래로 통과해야 인정됩니다(옆면 접촉 무효).\n" +
    "4) 성공 횟수에 따라 10골드가 누적되며, 게임 종료 후 일괄 지급됩니다.",
  Component: PotatoTossGame,
};
