// src/features/aquarium/FishSprite.tsx
"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FishInfo } from "./fishes";

/** keyframes 1회 주입 */
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
  /* 🔹 미세 몸 흔들림: 진행 방향(dir)에 따라 ±회전 */
  @keyframes yaw {
    0%   { transform: rotate(calc(var(--yawAmp, 1deg) * -1 * var(--dir, 1))); }
    50%  { transform: rotate(calc(var(--yawAmp, 1deg) *  1 * var(--dir, 1))); }
    100% { transform: rotate(calc(var(--yawAmp, 1deg) * -1 * var(--dir, 1))); }
  }
  /* 🆕 저가(쓰레기) 어종 전용: 느린 360° 스핀 */
  @keyframes slow-spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(calc(360deg * var(--spinSign, 1))); }
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

/** ── 등급별 글로우 ────────────────────────── */
function getGlowForRarity(
  rarity?: string,
  hovered?: boolean
): { dropFilter: string; haloColor: string | null; haloOpacity: number } {
  const r = (rarity || "").toLowerCase();

  // Epic = 보라
  if (r === "epic" || r === "에픽") {
    const base = hovered ? 0.9 : 0.65;
    const c8 = `rgba(167,139,250,${base})`; // #a78bfa
    const c4 = `rgba(167,139,250,${Math.max(0, base - 0.25)})`;
    return {
      dropFilter: `drop-shadow(0 0 6px ${c8}) drop-shadow(0 0 14px ${c4})`,
      haloColor: `rgba(167,139,250,${Math.max(0, base - 0.15)})`,
      haloOpacity: hovered ? 0.85 : 0.65,
    };
  }
  // Legendary = 금색
  if (r === "legendary" || r === "전설") {
    const base = hovered ? 0.9 : 0.65;
    const c8 = `rgba(250,204,21,${base})`; // #facc15
    const c4 = `rgba(245,158,11,${Math.max(0, base - 0.25)})`; // #f59e0b
    return {
      dropFilter: `drop-shadow(0 0 6px ${c8}) drop-shadow(0 0 14px ${c4})`,
      haloColor: `rgba(250,204,21,${Math.max(0, base - 0.15)})`,
      haloOpacity: hovered ? 0.85 : 0.65,
    };
  }
  return { dropFilter: "", haloColor: null, haloOpacity: 0 };
}

export default function FishSprite({
  fish,
  overridePos,
  popIn = false,
  isHovered = false,
  /** ✅ 추가: 컨테이너 폭 기준 스케일 */
  containerScale = 1,
}: {
  fish: FishInfo & { rarity?: string }; // rarity를 옵션으로 허용
  overridePos: { leftPct: number; topPct: number };
  popIn?: boolean;
  isHovered?: boolean;
  containerScale?: number;
}) {
  /** 개체별 토큰(고정) → PRNG */
  const tokenRef = useRef<number>(makeToken());
  const rand = useMemo(() => mulberry32(tokenRef.current), []);

  // 움직임 여부 (기본 true)
  const isMovable = fish.isMovable !== false;

  // 🆕 저가(쓰레기) 판정: cost <= 10이면 스핀 적용
  const isTrash = (fish.cost ?? Number.POSITIVE_INFINITY) <= 10;

  // 정지 개체의 고정 Y 위치(%): swimY 범위 중앙에 약간의 난수 오프셋
  const fixedTopPct = useMemo(() => {
    const [minY, maxY] = fish.swimY || [30, 70];
    const mid = (minY + maxY) / 2;
    const jitter = (rand() - 0.5) * Math.min(10, Math.max(2, maxY - minY)); // 범위 최대 10% 내 소폭
    return Math.max(minY, Math.min(maxY, mid + jitter));
  }, [fish.swimY, rand]);

  const motion = useMemo(() => {
    if (!isMovable) return { travel: 0, speedSec: 0, delay: 0, bobPx: 0 };
    const travel = rand() * 80 + 45; // 45 ~ 125 %
    const speedSec = rand() * 6 + 6; // 6 ~ 12 s
    const delay = rand() * 2; // 0 ~ 2 s
    const bobPx = Math.round(rand() * 12 + 6); // 6 ~ 18 px
    return { travel, speedSec, delay, bobPx };
  }, [rand, isMovable]);

  // ✅ 좌우 방향(얼굴) 토글 — 정지면 토글/반전 없음
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

  // 반응형 너비(뷰포트 의존 제거, 컨테이너 비례)
  const sizeMul = fish.size ?? 1;
  const base = 76 * sizeMul * containerScale;
  const minPx = 32 * sizeMul * containerScale;
  const maxPx = 100 * sizeMul * containerScale;
  const widthPx = Math.max(minPx, Math.min(maxPx, base));
  const widthCss = `${Math.round(widthPx)}px`;

  // transform 합성
  const hoverScale = isHovered && isMovable ? 1.08 : 1;
  const sx = hoverScale * (facingLeft ? -1 : 1);
  const sy = hoverScale;

  /** ── 🔹랜덤 기울기/흔들림 파라미터 ───────────────────────────── */
  const tiltDegBase = useMemo(() => {
    if (!isMovable) return 0;
    return 1.5 + rand() * 4; // 1.5° ~ 4.0°
  }, [isMovable, rand]);
  const yawAmpDeg = useMemo(() => 0.6 + rand() * 1.0, [rand]);
  const yawDurationSec = useMemo(() => {
    if (!isMovable) return 0;
    const base = Math.max(2.6, motion.speedSec * 0.45);
    return (base * (0.85 + rand() * 0.5)).toFixed(2); // 0.85x ~ 1.35x 가변
  }, [isMovable, motion.speedSec, rand]);

  /** 🆕 쓰레기 전용 스핀 파라미터 */
  const spinDurationSec = useMemo(() => {
    if (!isTrash) return 0;
    // 느리게: 14 ~ 28초 (개체별 랜덤)
    return Math.round(14 + rand() * 14);
  }, [isTrash, rand]);
  const spinDelay = useMemo(
    () => (isTrash ? +(rand() * 3).toFixed(2) : 0),
    [isTrash, rand]
  );
  const spinSign = useMemo(() => (rand() < 0.5 ? -1 : 1), [rand]); // 시계/반시계 랜덤

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
    const imgH = img.clientHeight * sy; // hover 스케일까지 반영
    const SAFE_PAD = 6;
    const bob = motion.bobPx;

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
  }, [sy, motion.bobPx, overridePos.topPct, fixedTopPct, isMovable]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) recomputeTop();
    else img.addEventListener("load", recomputeTop, { once: true });
  }, []);

  // 애니메이션 문자열 구성(정지면 none)
  const swimAnim = isMovable
    ? `swim-x ${motion.speedSec}s ease-in-out ${motion.delay}s infinite alternate`
    : "none";
  const popAnim = popIn
    ? swimAnim === "none"
      ? "popIn 600ms ease-out"
      : `${swimAnim}, popIn 600ms ease-out`
    : swimAnim;

  // 진행 방향 부호 & 기울이기
  const dir = facingLeft ? -1 : 1;
  const tiltDeg = isMovable ? tiltDegBase * dir : 0;

  // z-index: 정지는 뒤쪽(1), 가동은 앞쪽(2)
  const zIndex = isMovable ? 2 : 1;

  // ✅ 등급 글로우 계산
  const { dropFilter, haloColor, haloOpacity } = useMemo(
    () => getGlowForRarity(fish.rarity, isHovered && isMovable),
    [fish.rarity, isHovered, isMovable]
  );

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
        zIndex,
      }}
    >
      {/* 상하 흔들림 */}
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
        {/* 🔹 기울기(tilt) 래퍼: 고정 회전 */}
        <div
          className="will-change-transform transform-gpu"
          style={{
            transform: `rotate(${tiltDeg}deg)`,
            transformOrigin: "50% 50%",
            transition: "transform 220ms ease-out",
          }}
        >
          {/* 🔹 미세 흔들림(yaw) 래퍼 */}
          <div
            className="will-change-transform transform-gpu"
            style={{
              animation: isMovable
                ? `yaw ${yawDurationSec}s ease-in-out ${motion.delay}s infinite`
                : "none",
              transformOrigin: "50% 50%",
              ["--yawAmp" as any]: `${yawAmpDeg}deg`,
              ["--dir" as any]: dir,
              position: "relative",
            }}
          >
            {/* ✅ 은은한 뒤광: epic=보라, legendary=골드 (스핀에는 포함되지 않음) */}
            {haloColor && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: "-24%",
                  pointerEvents: "none",
                  borderRadius: "50%",
                  background: `radial-gradient(closest-side, ${haloColor} 0%, transparent 65%)`,
                  opacity: haloOpacity,
                  filter: "blur(10px)",
                  transform: `scale(${hoverScale})`,
                  transition: "opacity 220ms ease, transform 220ms ease",
                }}
              />
            )}

            {/* 🆕 쓰레기 전용 스핀 래퍼: 이미지에만 적용 */}
            <div
              className="will-change-transform transform-gpu"
              style={{
                animation: isTrash
                  ? `slow-spin ${spinDurationSec}s linear ${spinDelay}s infinite`
                  : "none",
                transformOrigin: "50% 50%",
                ["--spinSign" as any]: spinSign,
              }}
            >
              <img
                ref={imgRef}
                src={fish.image}
                alt={fish.labelKo}
                className="pointer-events-none select-none will-change-transform transform-gpu hover:cursor-pointer"
                style={{
                  width: widthCss,
                  height: "auto",
                  transform: `scale(${sx}, ${sy})`,
                  transition: "transform 240ms ease-out",
                  transformOrigin: "50% 50%",
                  // ✅ 기존 드롭섀도우 + 등급 글로우 레이어 합성
                  filter: `drop-shadow(0 2px 2px rgba(0,0,0,.25)) ${dropFilter}`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
