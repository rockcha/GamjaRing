// src/features/aquarium/FishSprite.tsx
"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FishInfo } from "./fishes";

/** ───────────────────────────────────────────────────────────
 *  Keyframes 1회 주입
 *  - 기존 swim-x / bob-y / popIn
 *  - 추가: yaw(몸통 미세 흔들림), swim-offset(곡선 경로)
 *  ─────────────────────────────────────────────────────────── */
function injectKeyframesOnce() {
  if (typeof document === "undefined") return;
  if (document.getElementById("aquarium-anim")) return;
  const style = document.createElement("style");
  style.id = "aquarium-anim";
  style.textContent = `
  @keyframes swim-x {
    0%   { transform: translateX(0) }
    100% { transform: translateX(var(--travel, 60%)) }
  }
  @keyframes bob-y {
    0%,100% { transform: translateY(0) }
    50%     { transform: translateY(var(--bob, 8px)) }
  }
  @keyframes popIn {
    0%   { opacity: 0; transform: translateZ(0) scale(0.45) rotate(-10deg); }
    55%  { opacity: 1; transform: translateZ(0) scale(1.15) rotate(3deg); }
    100% { opacity: 1; transform: translateZ(0) scale(1) rotate(0deg); }
  }
  /* 진행 방향에 따른 몸통 미세 흔들림 (진폭: --yawAmp, 방향: --dir) */
  @keyframes yaw {
    0%   { transform: rotate(calc(var(--yawAmp, 1deg) * -1 * var(--dir, 1))); }
    50%  { transform: rotate(calc(var(--yawAmp, 1deg) *  1 * var(--dir, 1))); }
    100% { transform: rotate(calc(var(--yawAmp, 1deg) * -1 * var(--dir, 1))); }
  }
  /* offset-path가 지원되면 경로를 따라 왕복 이동 */
  @keyframes swim-offset {
    0%   { offset-distance: 0% }
    100% { offset-distance: 100% }
  }
  `;
  document.head.appendChild(style);
}
injectKeyframesOnce();

/** ── 난수 유틸 ───────────────────────────── */
function makeToken(): number {
  try {
    if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return arr[0] || Math.floor(Math.random() * 2 ** 32);
    }
  } catch {}
  return Math.floor(Math.random() * 2 ** 32);
}
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export default function FishSprite({
  fish,
  overridePos,
  popIn = false,
  isHovered = false,
  /** 컨테이너 폭 기준 스케일 */
  containerScale = 1,
}: {
  fish: FishInfo;
  overridePos: { leftPct: number; topPct: number };
  popIn?: boolean;
  isHovered?: boolean;
  containerScale?: number;
}) {
  /** 개체별 토큰(고정) → PRNG */
  const tokenRef = useRef<number>(makeToken());
  const rand = useMemo(() => mulberry32(tokenRef.current), []);

  // 움직임 여부
  const isMovable = fish.isMovable !== false;

  // 정지 개체의 고정 Y 위치(%): swimY 범위 중앙에 약간의 난수 오프셋
  const fixedTopPct = useMemo(() => {
    const [minY, maxY] = fish.swimY || [30, 70];
    const mid = (minY + maxY) / 2;
    const jitter = (rand() - 0.5) * Math.min(10, Math.max(2, maxY - minY)); // 최대 10% 오프셋
    return Math.max(minY, Math.min(maxY, mid + jitter));
  }, [fish.swimY, rand]);

  // 이동 파라미터
  const motion = useMemo(() => {
    if (!isMovable) return { travel: 0, speedSec: 0, delay: 0, bobPx: 0 };
    const travel = rand() * 80 + 45; // 45 ~ 125 %
    const speedSec = rand() * 6 + 6; // 6 ~ 12 s
    const delay = rand() * 2; // 0 ~ 2 s
    const bobPx = Math.round(rand() * 12 + 6); // 6 ~ 18 px
    return { travel, speedSec, delay, bobPx };
  }, [rand, isMovable]);

  // 좌우 방향(얼굴)
  const [facingLeft, setFacingLeft] = useState(() =>
    isMovable ? rand() < 0.5 : false
  );
  const flipEveryX = useMemo(
    () => (isMovable ? 2400 + rand() * 2400 : Infinity),
    [rand, isMovable]
  );
  useEffect(() => {
    if (!isMovable) return;
    const id = window.setInterval(() => {
      if (rand() < 0.15) setFacingLeft((v) => !v);
    }, flipEveryX);
    return () => clearInterval(id);
  }, [flipEveryX, rand, isMovable]);

  // 반응형 너비(컨테이너 비례)
  const sizeMul = fish.size ?? 1;
  const base = 76 * sizeMul * containerScale;
  const minPx = 32 * sizeMul * containerScale;
  const maxPx = 100 * sizeMul * containerScale;
  const widthPx = Math.max(minPx, Math.min(maxPx, base));
  const widthCss = `${Math.round(widthPx)}px`;

  // hover 스케일
  const hoverScale = isHovered && isMovable ? 1.08 : 1;

  // 진행 방향 기울기(tilt) 기본값(2~6도)
  const tiltDegBase = useMemo(() => {
    if (!isMovable) return 0;
    const amp = Math.min(6, 2 + (motion.travel / 125) * 4);
    return amp;
  }, [isMovable, motion.travel]);

  // 몸통 미세 흔들림 진폭(0.6~1.6도)
  const yawAmpDeg = useMemo(() => 0.6 + rand() * 1.0, [rand]);

  // 곡선 경로 사용 여부 및 경로 데이터 (offset-path 지원 시)
  const [useCurve, pathData] = useMemo(() => {
    const supports =
      typeof CSS !== "undefined" &&
      (CSS as any).supports?.("offset-path", "path('M0 0 L 100 0')");
    if (!isMovable || !supports) return [false, ""];
    // 부드러운 S-커브 경로 (좌→우 기준)
    const h = 80 + rand() * 40; // 세로 진폭(px)
    const w = 100; // 경로 너비(%)
    const p = `path('M 0 ${h / 2}
                   C ${w * 0.25} 0, ${w * 0.25} ${h}, ${w * 0.5} ${h / 2}
                   S ${w * 0.75} 0, ${w} ${h / 2}')`;
    return [true, p.replace(/\s+/g, " ")];
  }, [isMovable, rand]);

  /** ── ⛳️ 바닥 침범 방지: top px 보정(clamp) ───────────────────────── */
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [topPx, setTopPx] = useState<number | null>(null);

  const recomputeTop = () => {
    const wrap = wrapperRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;
    const container = (wrap.offsetParent as HTMLElement) ?? wrap.parentElement;
    if (!container) return;

    const parentH = container.clientHeight;
    const imgH = img.clientHeight * hoverScale; // hover 스케일까지 반영
    const SAFE_PAD = 6; // 위/아래 안전 여백(px)
    const bob = motion.bobPx; // 아래쪽으로 흔들릴 여지

    // 의도 top(%): 움직이면 overridePos.topPct, 정지면 fixedTopPct
    const intendedTopPct = isMovable ? overridePos.topPct : fixedTopPct;
    const desiredTop = (intendedTopPct / 100) * parentH;

    const minTop = SAFE_PAD;
    const maxTop = Math.max(SAFE_PAD, parentH - imgH - SAFE_PAD - bob);
    const clamped = Math.min(Math.max(desiredTop, minTop), maxTop);
    setTopPx(clamped);
  };

  useLayoutEffect(() => {
    recomputeTop();
    const ro: ResizeObserver | null =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => requestAnimationFrame(recomputeTop))
        : null;

    if (ro) {
      const wrap = wrapperRef.current;
      const container = wrap
        ? (wrap.offsetParent as HTMLElement) ?? wrap.parentElement
        : null;
      if (container) ro.observe(container);
      if (imgRef.current) ro.observe(imgRef.current);
    }

    const onResize = () => recomputeTop();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [hoverScale, motion.bobPx, overridePos.topPct, fixedTopPct, isMovable]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) recomputeTop();
    else img.addEventListener("load", recomputeTop, { once: true });
  }, []);

  // 애니메이션 문자열
  const swimAnim = isMovable
    ? useCurve
      ? `swim-offset ${motion.speedSec}s ease-in-out ${motion.delay}s infinite alternate`
      : `swim-x ${motion.speedSec}s ease-in-out ${motion.delay}s infinite alternate`
    : "none";
  const popAnim =
    popIn && swimAnim !== "none"
      ? `${swimAnim}, popIn 600ms ease-out`
      : popIn
      ? "popIn 600ms ease-out"
      : swimAnim;

  // 진행 방향 → CSS 변수
  const dir = facingLeft ? -1 : 1;
  const tiltDeg = isMovable ? tiltDegBase * dir : 0;

  const zIndex = isMovable ? 2 : 1;

  return (
    <div
      ref={wrapperRef}
      className="absolute will-change-transform transform-gpu"
      style={{
        left: `${overridePos.leftPct}%`,
        top:
          topPx != null
            ? `${topPx}px`
            : `${isMovable ? overridePos.topPct : fixedTopPct}%`,
        animation: popAnim,
        ["--travel" as any]: `${motion.travel}%`,
        // 곡선 유영(지원 시)
        ...(useCurve
          ? {
              offsetPath: pathData as any,
              offsetRotate: "0deg" as any, // 회전은 우리가 제어(tilt/yaw)
            }
          : {}),
        zIndex,
      }}
    >
      {/* bob-y (상하 흔들림) */}
      <div
        className="will-change-transform transform-gpu"
        style={{
          animation: isMovable
            ? `bob-y ${Math.max(3, motion.speedSec * 0.6)}s ease-in-out ${
                motion.delay
              }s infinite`
            : "none",
          ["--bob" as any]: `${motion.bobPx}px`,
        }}
      >
        {/* 좌우 반전 전용 래퍼 (scaleX) + hover scale */}
        <div
          className="will-change-transform transform-gpu"
          style={{
            transform: `scaleX(${dir}) scale(${hoverScale})`,
            transition: "transform 240ms ease-out",
            transformOrigin: "50% 50%",
            ["--dir" as any]: dir,
            ["--yawAmp" as any]: `${yawAmpDeg}deg`,
          }}
        >
          {/* 진행 방향 기울기(tilt) + 몸통 미세 흔들림(yaw) */}
          <div
            className="will-change-transform transform-gpu"
            style={{
              transform: `rotate(${tiltDeg}deg)`,
              animation: isMovable
                ? `yaw ${Math.max(2.8, motion.speedSec * 0.45)}s ease-in-out ${
                    motion.delay
                  }s infinite`
                : "none",
              transformOrigin: "50% 50%",
            }}
          >
            <img
              ref={imgRef}
              src={fish.image}
              alt={fish.labelKo}
              className="pointer-events-none select-none will-change-transform transform-gpu"
              style={{
                width: widthCss,
                height: "auto",
                filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
