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
  /** ✅ 추가: 컨테이너 폭 기준 스케일 */
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

  // 움직임 여부 (기본 true)
  const isMovable = fish.isMovable !== false;

  // 정지 개체의 고정 Y 위치(%): swimY 범위 중앙에 약간의 난수 오프셋
  const fixedTopPct = useMemo(() => {
    const [minY, maxY] = fish.swimY || [30, 70];
    const mid = (minY + maxY) / 2;
    const jitter = (rand() - 0.5) * Math.min(10, Math.max(2, maxY - minY)); // 범위 최대 10% 내 소폭
    return Math.max(minY, Math.min(maxY, mid + jitter));
  }, [fish.swimY, rand]);

  const motion = useMemo(() => {
    // 정지라면 이동/바운스 모두 0
    if (!isMovable) {
      return { travel: 0, speedSec: 0, delay: 0, bobPx: 0 };
    }
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
  // 기준 폭(중간값) 72px, 하한/상한 28~92px → 전부 containerScale에 비례
  const base = 72 * sizeMul * containerScale;
  const minPx = 28 * sizeMul * containerScale;
  const maxPx = 92 * sizeMul * containerScale;
  const widthPx = Math.max(minPx, Math.min(maxPx, base));
  const widthCss = `${Math.round(widthPx)}px`;

  // transform 합성
  const hoverScale = isHovered && isMovable ? 1.08 : 1;
  const sx = hoverScale * (facingLeft ? -1 : 1);
  const sy = hoverScale;

  /** ── ⛳️ 바닥 침범 방지: top px 보정(clamp) ───────────────────────── */
  const wrapperRef = useRef<HTMLDivElement>(null); // absolute 박스
  const imgRef = useRef<HTMLImageElement>(null);
  const [topPx, setTopPx] = useState<number | null>(null);

  // 부모/이미지 실측해서 안전 top 계산
  const recomputeTop = () => {
    const wrap = wrapperRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;

    // absolute 기준 컨테이너(상위 relative 요소)
    const container = (wrap.offsetParent as HTMLElement) ?? wrap.parentElement;
    if (!container) return;

    const parentH = container.clientHeight;
    const imgH = img.clientHeight * sy; // hover 스케일까지 반영
    const SAFE_PAD = 6; // 위/아래 안전 여백(px)
    const bob = motion.bobPx; // 아래쪽으로 흔들릴 여지

    // 의도 top(%): 움직이면 overridePos.topPct, 정지면 fixedTopPct
    const intendedTopPct = isMovable ? overridePos.topPct : fixedTopPct;
    const desiredTop = (intendedTopPct / 100) * parentH;

    // 밑으로 빠지지 않도록 clamp
    const minTop = SAFE_PAD;
    const maxTop = Math.max(SAFE_PAD, parentH - imgH - SAFE_PAD - bob);

    const clamped = Math.min(Math.max(desiredTop, minTop), maxTop);
    setTopPx(clamped);
  };

  // 이미지 로딩/사이즈 변경/창 리사이즈/hoverScale 변경 시 재계산
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
    // 의존성: 크기/바운스/의도 위치가 바뀌면 다시 계산
  }, [sy, motion.bobPx, overridePos.topPct, fixedTopPct, isMovable]);

  // 이미지 onLoad 때도 한 번 더
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

  // z-index: 정지는 뒤쪽(1), 가동은 앞쪽(2)
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
        zIndex,
      }}
    >
      <div
        className="will-change-transform transform-gpu"
        style={{
          // 정지면 bob 애니메이션 제거
          animation: isMovable
            ? `bob-y ${Math.max(3, motion.speedSec * 0.6)}s ease-in-out ${
                motion.delay
              }s infinite`
            : "none",
          ["--bob" as any]: `${motion.bobPx}px`,
        }}
      >
        <img
          ref={imgRef}
          src={fish.image}
          alt={fish.labelKo}
          className="pointer-events-none select-none will-change-transform transform-gpu hover:cursor-pointer"
          style={{
            width: widthCss, // ✅ 컨테이너 비례 px 폭
            height: "auto",
            transform: `scale(${sx}, ${sy})`,
            transition: "transform 240ms ease-out",
            transformOrigin: "50% 50%",
            filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))",
          }}
        />
      </div>
    </div>
  );
}
