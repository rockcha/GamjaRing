// src/features/aquarium/FishSprite.tsx
"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  memo,
} from "react";

/** keyframes 1회 주입 */
function injectKeyframesOnce() {
  if (typeof document === "undefined") return;
  if (document.getElementById("aquarium-anim")) return;
  const style = document.createElement("style");
  style.id = "aquarium-anim";
  style.textContent = `
  @keyframes swim-x { 0% { transform: translateX(0) } 100% { transform: translateX(var(--travel, 60%)) } }
  @keyframes bob-y { 0%,100% { transform: translateY(0) } 50% { transform: translateY(var(--bob, 8px)) } }
  @keyframes popIn {
    0% { opacity: 0; transform: translateZ(0) scale(0.45) rotate(-10deg); }
    55% { opacity: 1; transform: translateZ(0) scale(1.15) rotate(3deg); }
    100% { opacity: 1; transform: translateZ(0) scale(1) rotate(0deg); }
  }
  @keyframes yaw {
    0% { transform: rotate(calc(var(--yawAmp, 1deg) * -1 * var(--dir, 1))); }
    50% { transform: rotate(calc(var(--yawAmp, 1deg) *  1 * var(--dir, 1))); }
    100%{ transform: rotate(calc(var(--yawAmp, 1deg) * -1 * var(--dir, 1))); }
  }
  @keyframes slow-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(calc(360deg * var(--spinSign, 1))); } }
  @keyframes swim-band { 0% { transform: translateY(0); } 100% { transform: translateY(var(--yRangePx, 0px)); } }
  `;
  document.head.appendChild(style);
}
injectKeyframesOnce();

/** 난수 유틸 */
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
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | t);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* =========================
   HUE 팔레트 & 유틸
   ========================= */
const HUE_MAP = {
  sky: { base: "#0ea5e9", light: "#7dd3fc", dark: "#0369a1" },
  blue: { base: "#3b82f6", light: "#93c5fd", dark: "#1d4ed8" },
  indigo: { base: "#6366f1", light: "#a5b4fc", dark: "#4338ca" },
  violet: { base: "#8b5cf6", light: "#c4b5fd", dark: "#6d28d9" },
  purple: { base: "#a855f7", light: "#d8b4fe", dark: "#7e22ce" },
  fuchsia: { base: "#d946ef", light: "#f0abfc", dark: "#a21caf" },
  pink: { base: "#ec4899", light: "#f9a8d4", dark: "#9d174d" },
  rose: { base: "#f43f5e", light: "#fda4af", dark: "#9f1239" },
  red: { base: "#ef4444", light: "#fca5a5", dark: "#991b1b" },
  orange: { base: "#f97316", light: "#fdba74", dark: "#9a3412" },
  amber: { base: "#f59e0b", light: "#fcd34d", dark: "#92400e" },
  yellow: { base: "#eab308", light: "#fde047", dark: "#854d0e" },
  lime: { base: "#84cc16", light: "#d9f99d", dark: "#3f6212" },
  green: { base: "#22c55e", light: "#86efac", dark: "#166534" },
  emerald: { base: "#10b981", light: "#6ee7b7", dark: "#065f46" },
  teal: { base: "#14b8a6", light: "#5eead4", dark: "#115e59" },
  cyan: { base: "#06b6d4", light: "#67e8f9", dark: "#155e75" },
  slate: { base: "#64748b", light: "#cbd5e1", dark: "#334155" },
  gray: { base: "#6b7280", light: "#d1d5db", dark: "#374151" },
  zinc: { base: "#71717a", light: "#d4d4d8", dark: "#3f3f46" },
  neutral: { base: "#737373", light: "#d4d4d4", dark: "#404040" },
} as const;
type HueKey = keyof typeof HUE_MAP;

function hexToRgba(hex: string, alpha = 1) {
  const raw = (hex || "").replace("#", "").trim().toLowerCase();
  const m =
    /^[0-9a-f]{3}$/.test(raw) || /^[0-9a-f]{6}$/.test(raw) ? raw : "000";

  const r = parseInt(
    m.length >= 6 ? m.slice(0, 2) : m.charAt(0) + m.charAt(0),
    16
  );
  const g = parseInt(
    m.length >= 6 ? m.slice(2, 4) : m.charAt(1) + m.charAt(1),
    16
  );
  const b = parseInt(
    m.length >= 6 ? m.slice(4, 6) : m.charAt(2) + m.charAt(2),
    16
  );
  const a = Math.max(0, Math.min(1, alpha));

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
/** hue 키워드 기반의 은은한 글로우 */
function getGlowForHue(hue?: string | null): {
  dropFilter: string;
  haloColor: string | null;
  haloOpacity: number;
} {
  const key = (hue ?? "").toLowerCase().trim();
  if (!key || key === "none") {
    return {
      dropFilter: "drop-shadow(0 2px 2px rgba(0,0,0,.2))",
      haloColor: null,
      haloOpacity: 0,
    };
  }
  const set = (HUE_MAP as any)[key as HueKey] ?? HUE_MAP.blue;

  // 은은하지만 확실히 보이도록 적당한 강도
  const inner = hexToRgba(set.base, 0.38); // 가까운 글로우
  const outer = hexToRgba(set.light, 0.29); // 퍼지는 글로우
  const halo = hexToRgba(set.light, 0.38); // 라디얼 오라
  return {
    dropFilter: `drop-shadow(0 2px 2px rgba(0,0,0,.25)) drop-shadow(0 0 10px ${inner}) drop-shadow(0 0 22px ${outer})`,
    haloColor: halo,
    haloOpacity: 0.6,
  };
}

/** 타입 */
export type SpriteFish = {
  id: string;
  labelKo: string;
  image: string;
  rarity?: string | null;
  size?: number | null;
  swimY: [number, number]; // 0=위, 100=아래
  isMovable?: boolean | null;
  price?: number | null;
  glowColor?: string | null; // hue 키워드('blue' | 'none' 등)
};

type PerfMode = "high" | "medium" | "low";

type Props = {
  fish: SpriteFish;
  overridePos: { leftPct: number; topPct: number }; // 0~100
  popIn?: boolean;
  containerScale?: number;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
  /** 드롭 후 해당 topPct를 기준으로 유영(수직 대역 이동 끄고 보브만) */
  lockTop?: boolean;
  perfMode?: PerfMode;
} & React.HTMLAttributes<HTMLDivElement>;

/** 내부 컴포넌트 */
const FishSpriteImpl = forwardRef<HTMLDivElement, Props>(function FishSprite(
  {
    fish,
    overridePos,
    popIn = false,
    containerScale = 1,
    onMouseDown,
    isDragging = false,
    lockTop = false,
    perfMode = "high",
    ...rest
  },
  forwardedRef
) {
  const tokenRef = useRef<number>(makeToken());
  const rand = useMemo(() => mulberry32(tokenRef.current), []);

  const isMovable = fish.isMovable !== false; // undefined면 이동체
  const isTrash = (fish.price ?? Number.POSITIVE_INFINITY) <= 10;

  /** 퍼포먼스 모드에 따른 이펙트 강도 */
  const effects = useMemo(() => {
    if (perfMode === "low") {
      return { enableGlow: false, spin: false, bobMul: 0.6, swimMul: 0.7 };
    }
    if (perfMode === "medium") {
      return { enableGlow: true, spin: isTrash, bobMul: 0.85, swimMul: 0.85 };
    }
    return { enableGlow: true, spin: isTrash, bobMul: 1.0, swimMul: 1.0 };
  }, [perfMode, isTrash]);

  /** X/Y 모션 파라미터 */
  const motion = useMemo(() => {
    if (!isMovable) return { travel: 0, speedSec: 0, delay: 0, bobPx: 0 };
    const travel = (rand() * 80 + 45) * effects.swimMul;
    const speedSec = (rand() * 6 + 6) / effects.swimMul;
    const delay = rand() * 2;
    const bobPx = Math.round((rand() * 12 + 6) * effects.bobMul);
    return { travel, speedSec, delay, bobPx };
  }, [rand, isMovable, effects.swimMul, effects.bobMul]);

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
    }, flipEveryX as number);
    return () => window.clearInterval(id);
  }, [flipEveryX, rand, isMovable]);

  /** 크기 */
  const sizeMul = (fish.size ?? 1) * 1.2;
  const base = 62 * sizeMul * containerScale;
  const widthPx = Math.max(
    26 * sizeMul * containerScale,
    Math.min(82 * sizeMul * containerScale, base)
  );
  const widthCss = `${Math.round(widthPx)}px`;
  const sx = facingLeft ? -1 : 1;
  const sy = 1;

  const tiltDegBase = useMemo(
    () => (isMovable ? 1.5 + rand() * 4 : 0),
    [isMovable, rand]
  );
  const yawAmpDeg = useMemo(() => 0.6 + rand() * 1.0, [rand]);

  const yawDurationSec = useMemo(() => {
    if (!isMovable) return 0;
    const baseDur = Math.max(2.6, motion.speedSec * 0.45);
    return +(baseDur * (0.85 + rand() * 0.5)).toFixed(2);
  }, [isMovable, motion.speedSec, rand]);

  const spinDurationSec = useMemo(
    () => (effects.spin ? Math.round(14 + rand() * 14) : 0),
    [effects.spin, rand]
  );
  const spinDelay = useMemo(
    () => (effects.spin ? +(rand() * 3).toFixed(2) : 0),
    [effects.spin, rand]
  );

  /** 수직 대역 계산 (lockTop이면 대역 이동 끔) */
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    // forwardedRef 연결: 상위에서 DOM 직접 이동 가능
    if (typeof forwardedRef === "function") {
      forwardedRef(wrapperRef.current!);
    } else if (forwardedRef) {
      (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current =
        wrapperRef.current;
    }
  }, [forwardedRef]);

  const [topBasePx, setTopBasePx] = useState<number | null>(null);
  const [yRangePx, setYRangePx] = useState<number>(0);

  const recomputeTopAndRange = () => {
    const wrap = wrapperRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;
    const container =
      ((wrap.offsetParent as HTMLElement | null) ?? wrap.parentElement) || null;
    if (!container) return;

    const parentH = container.clientHeight;
    const imgH = img.clientHeight * sy;
    const SAFE_PAD = 2;
    const FLOOR_BIAS_PX = 6;

    const clampPx = (px: number) =>
      Math.min(
        Math.max(px, SAFE_PAD),
        Math.max(SAFE_PAD, parentH - imgH - SAFE_PAD)
      );

    if (isMovable && !lockTop) {
      // 평상시: swimY 대역 전체를 왕복
      const [a, b] = fish.swimY ?? [30, 50];
      const lowPct = Math.max(0, Math.min(100, Math.min(a, b)));
      const highPct = Math.max(0, Math.min(100, Math.max(a, b)));
      let lowPx = (lowPct / 100) * parentH + FLOOR_BIAS_PX;
      let highPx = (highPct / 100) * parentH + FLOOR_BIAS_PX;
      lowPx = clampPx(lowPx);
      highPx = clampPx(highPx);
      const minPx2 = Math.min(lowPx, highPx);
      const maxPx2 = Math.max(lowPx, highPx);
      setTopBasePx(minPx2);
      setYRangePx(Math.max(0, maxPx2 - minPx2));
    } else {
      // 드롭 후 or 고정체: overrideTop을 기준으로 고정(보브만)
      const desiredTopRaw = (overridePos.topPct / 100) * parentH;
      const desiredTop = Math.min(
        Math.max(desiredTopRaw, SAFE_PAD),
        Math.max(SAFE_PAD, parentH - imgH - SAFE_PAD)
      );
      setTopBasePx(desiredTop);
      setYRangePx(0);
    }
  };

  useLayoutEffect(() => {
    recomputeTopAndRange();
    const ro: ResizeObserver | null =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() =>
            requestAnimationFrame(() => recomputeTopAndRange())
          )
        : null;
    if (ro) {
      const wrap = wrapperRef.current;
      const container = wrap
        ? (wrap.offsetParent as HTMLElement | null) ?? wrap.parentElement
        : null;
      if (container) ro.observe(container);
      if (imgRef.current) ro.observe(imgRef.current);
    }
    const onResize = () => recomputeTopAndRange();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [sy, motion.bobPx, overridePos.topPct, isMovable, lockTop, fish.swimY]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) recomputeTopAndRange();
    else img.addEventListener("load", recomputeTopAndRange, { once: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const swimAnimX =
    isMovable && !isDragging
      ? `swim-x ${motion.speedSec}s ease-in-out ${motion.delay}s infinite alternate`
      : "none";

  const popAnim =
    popIn && swimAnimX !== "none"
      ? `${swimAnimX}, popIn 600ms ease-out`
      : popIn
      ? "popIn 600ms ease-out"
      : swimAnimX;

  const dir = (facingLeft ? -1 : 1) as 1 | -1;
  const tiltDeg = isMovable && !isDragging ? tiltDegBase * dir : 0;
  const zIndex = isDragging ? 50 : isMovable ? 2 : 1;

  // hue 키워드: camel/snake 모두 대응(호환성)
  const hueKey = (fish as any).glowColor ?? (fish as any).glow_color ?? null;

  const { dropFilter, haloColor, haloOpacity } = useMemo(() => {
    if (!effects.enableGlow)
      return {
        dropFilter: "drop-shadow(0 2px 2px rgba(0,0,0,.2))",
        haloColor: null,
        haloOpacity: 0,
      };
    return getGlowForHue(hueKey);
  }, [hueKey, effects.enableGlow]);

  return (
    <div
      ref={wrapperRef}
      className="absolute will-change-transform transform-gpu"
      style={{
        left: `${overridePos.leftPct}%`,
        top:
          topBasePx != null
            ? `${topBasePx}px`
            : `${lockTop ? overridePos.topPct : fish.swimY?.[0] ?? 40}%`,
        animation: popAnim,
        ["--travel" as any]: `${motion.travel}%`,
        zIndex,
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
      }}
      onMouseDown={onMouseDown}
      {...rest}
    >
      {/* 수직 왕복: lockTop이거나 드래깅 중이면 끔 */}
      <div
        className="will-change-transform transform-gpu"
        style={{
          animation:
            isMovable && !lockTop && !isDragging
              ? `swim-band ${Math.max(
                  20 *
                    (perfMode === "low"
                      ? 0.7
                      : perfMode === "medium"
                      ? 0.85
                      : 1),
                  18
                )}s ease-in-out 0s infinite alternate`
              : "none",
          ["--yRangePx" as any]: `${yRangePx}px`,
        }}
      >
        <div
          className="will-change-transform transform-gpu"
          style={{
            animation:
              isMovable && !isDragging
                ? `bob-y ${Math.max(3, motion.speedSec * 0.6)}s ease-in-out ${
                    motion.delay
                  }s infinite`
                : "none",
            ["--bob" as any]: `${motion.bobPx}px`,
          }}
        >
          <div
            className="will-change-transform transform-gpu"
            style={{
              transform: `rotate(${tiltDeg}deg)`,
              transformOrigin: "50% 50%",
              transition: "transform 220ms ease-out",
              position: "relative", // stacking context
              zIndex: 0,
            }}
          >
            {/* 은은한 색상 Halo — 이미지 아래쪽 레이어 */}
            {haloColor && !isDragging && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: "-26%",
                  pointerEvents: "none",
                  borderRadius: "50%",
                  background: `radial-gradient(closest-side, ${haloColor} 0%, transparent 65%)`,
                  opacity: haloOpacity,
                  filter: "blur(20px)",
                  transition: "opacity 220ms ease",
                  mixBlendMode: "screen",
                  zIndex: 0,
                }}
              />
            )}

            {/* 호버 살짝 확대 + 이미지 레이어를 위로 */}
            <div
              className={
                isDragging
                  ? ""
                  : "transition-transform duration-200 ease-out hover:scale-[1.1] will-change-transform transform-gpu"
              }
              style={{ position: "relative", zIndex: 1 }}
            >
              <div
                className="will-change-transform transform-gpu"
                style={{
                  animation:
                    effects.spin && !isDragging
                      ? `slow-spin ${spinDurationSec}s linear ${spinDelay}s infinite`
                      : "none",
                  transformOrigin: "50% 50%",
                  ["--spinSign" as any]: useRef(rand() < 0.5 ? -1 : 1).current,
                }}
              >
                <img
                  ref={imgRef}
                  src={fish.image}
                  alt={fish.labelKo}
                  className="select-none will-change-transform transform-gpu pointer-events-none"
                  style={{
                    width: widthCss,
                    height: "auto",
                    transform: `scale(${sx}, ${sy})`,
                    transition: "transform 240ms ease-out",
                    transformOrigin: "50% 50%",
                    // 기본 그림자 + 색상 글로우
                    filter: dropFilter,
                  }}
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

/** 메모화: 자신 관련 prop 변경시에만 리렌더 */
const areEqual = (prev: Props, next: Props) => {
  return (
    prev.fish.id === next.fish.id &&
    prev.overridePos.leftPct === next.overridePos.leftPct &&
    prev.overridePos.topPct === next.overridePos.topPct &&
    prev.isDragging === next.isDragging &&
    prev.containerScale === next.containerScale &&
    prev.lockTop === next.lockTop &&
    prev.perfMode === next.perfMode &&
    prev.popIn === next.popIn
  );
};

export default memo(FishSpriteImpl, areEqual);
