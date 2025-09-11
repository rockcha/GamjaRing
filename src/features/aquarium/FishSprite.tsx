"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** 등급별 글로우 */
function getGlowForRarity(rarity?: string | null): {
  dropFilter: string;
  haloColor: string | null;
  haloOpacity: number;
} {
  const r = (rarity || "").toLowerCase();
  if (r === "epic" || r === "에픽") {
    const base = 0.65;
    const c8 = `rgba(167,139,250,${base})`;
    const c4 = `rgba(167,139,250,${Math.max(0, base - 0.25)})`;
    return {
      dropFilter: `drop-shadow(0 0 6px ${c8}) drop-shadow(0 0 14px ${c4})`,
      haloColor: `rgba(167,139,250,${Math.max(0, base - 0.15)})`,
      haloOpacity: 0.65,
    };
  }
  if (r === "legendary" || r === "전설" || r === "legend") {
    const base = 0.65;
    const c8 = `rgba(250,204,21,${base})`;
    const c4 = `rgba(245,158,11,${Math.max(0, base - 0.25)})`;
    return {
      dropFilter: `drop-shadow(0 0 6px ${c8}) drop-shadow(0 0 14px ${c4})`,
      haloColor: `rgba(250,204,21,${Math.max(0, base - 0.15)})`,
      haloOpacity: 0.65,
    };
  }
  return { dropFilter: "", haloColor: null, haloOpacity: 0 };
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
};

export default function FishSprite({
  fish,
  overridePos,
  popIn = false,
  containerScale = 1,
  onMouseDown,
  isDragging = false,
  /** 드롭 후 해당 topPct를 기준으로 유영(수직 대역 이동 끄고 보브만) */
  lockTop = false,
}: {
  fish: SpriteFish;
  overridePos: { leftPct: number; topPct: number }; // 0~100
  popIn?: boolean;
  containerScale?: number;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
  lockTop?: boolean;
}) {
  const tokenRef = useRef<number>(makeToken());
  const rand = useMemo(() => mulberry32(tokenRef.current), []);

  const isMovable = fish.isMovable !== false; // undefined면 이동체
  const isTrash = (fish.price ?? Number.POSITIVE_INFINITY) <= 10;

  /** X/Y 모션 파라미터 */
  const motion = useMemo(() => {
    if (!isMovable) return { travel: 0, speedSec: 0, delay: 0, bobPx: 0 };
    const travel = rand() * 80 + 45;
    const speedSec = rand() * 6 + 6;
    const delay = rand() * 2;
    const bobPx = Math.round(rand() * 12 + 6);
    return { travel, speedSec, delay, bobPx };
  }, [rand, isMovable]);

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

  /** 크기 */
  const sizeMul = (fish.size ?? 1) * 1.2;
  const base = 62 * sizeMul * containerScale;
  const minPx = 26 * sizeMul * containerScale;
  const maxPx = 82 * sizeMul * containerScale;
  const widthPx = Math.max(minPx, Math.min(maxPx, base));
  const widthCss = `${Math.round(widthPx)}px`;
  const spinSignRef = useRef<number>(rand() < 0.5 ? -1 : 1);
  const sx = facingLeft ? -1 : 1;
  const sy = 1;

  const tiltDegBase = useMemo(
    () => (isMovable ? 1.5 + rand() * 4 : 0),
    [isMovable, rand]
  );
  const yawAmpDeg = useMemo(() => 0.6 + rand() * 1.0, [rand]);

  const yawDurationSec = useMemo(() => {
    if (!isMovable) return 0;
    const base = Math.max(2.6, motion.speedSec * 0.45);
    return +(base * (0.85 + rand() * 0.5)).toFixed(2);
  }, [isMovable, motion.speedSec, rand]);

  const spinDurationSec = useMemo(
    () => (isTrash ? Math.round(14 + rand() * 14) : 0),
    [isTrash, rand]
  );
  const spinDelay = useMemo(
    () => (isTrash ? +(rand() * 3).toFixed(2) : 0),
    [isTrash, rand]
  );

  /** 수직 대역 계산 (lockTop이면 대역 이동 끔) */
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [topBasePx, setTopBasePx] = useState<number | null>(null);
  const [yRangePx, setYRangePx] = useState<number>(0);

  const recomputeTopAndRange = () => {
    const wrap = wrapperRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;
    const container = (wrap.offsetParent as HTMLElement) ?? wrap.parentElement;
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
      const minPx = Math.min(lowPx, highPx);
      const maxPx = Math.max(lowPx, highPx);
      setTopBasePx(minPx);
      setYRangePx(Math.max(0, maxPx - minPx));
    } else {
      // 드롭 후 or 고정체: overrideTop을 기준으로 고정(보브만)
      const desiredTopRaw = (overridePos.topPct / 100) * parentH;
      const SAFE_PAD = 2;
      const imgH = img.clientHeight * sy;
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
        ? new ResizeObserver(() => requestAnimationFrame(recomputeTopAndRange))
        : null;
    if (ro) {
      const wrap = wrapperRef.current;
      const container = wrap
        ? (wrap.offsetParent as HTMLElement) ?? wrap.parentElement
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
  }, [sy, motion.bobPx, overridePos.topPct, isMovable, lockTop]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) recomputeTopAndRange();
    else img.addEventListener("load", recomputeTopAndRange, { once: true });
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

  const { dropFilter, haloColor, haloOpacity } = useMemo(
    () => getGlowForRarity(fish.rarity),
    [fish.rarity]
  );

  return (
    <div
      ref={wrapperRef}
      className="absolute will-change-transform transform-gpu"
      style={{
        left: `${overridePos.leftPct}%`,
        top:
          topBasePx != null
            ? `${topBasePx}px`
            : `${lockTop ? overridePos.topPct : fish.swimY[0]}%`,
        animation: popAnim,
        ["--travel" as any]: `${motion.travel}%`,
        zIndex,
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
      }}
      onMouseDown={onMouseDown}
    >
      {/* 수직 왕복: lockTop이거나 드래깅 중이면 끔 */}
      <div
        className="will-change-transform transform-gpu"
        style={{
          animation:
            isMovable && !lockTop && !isDragging
              ? `swim-band ${Math.max(
                  20,
                  20
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
            }}
          >
            <div
              className="will-change-transform transform-gpu"
              style={{
                animation:
                  isMovable && !isDragging
                    ? `yaw ${yawDurationSec}s ease-in-out ${motion.delay}s infinite`
                    : "none",
                transformOrigin: "50% 50%",
                ["--yawAmp" as any]: `${yawAmpDeg}deg`,
                ["--dir" as any]: dir,
                position: "relative",
              }}
            >
              {haloColor && !isDragging && (
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
                    transition: "opacity 220ms ease",
                  }}
                />
              )}

              {/* 호버 살짝 확대 */}
              <div
                className={
                  isDragging
                    ? ""
                    : "transition-transform duration-200 ease-out hover:scale-[1.1] will-change-transform transform-gpu"
                }
              >
                <div
                  className="will-change-transform transform-gpu"
                  style={{
                    animation:
                      isTrash && !isDragging
                        ? `slow-spin ${spinDurationSec}s linear ${spinDelay}s infinite`
                        : "none",
                    transformOrigin: "50% 50%",
                    // 변경 전: ["--spinSign" as any]: Math.random() < 0.5 ? -1 : 1,
                    // 변경 후(고정값):
                    ["--spinSign" as any]: spinSignRef.current,
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
                      filter: `drop-shadow(0 2px 2px rgba(0,0,0,.25)) ${dropFilter}`,
                    }}
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
