// src/features/aquarium/FishSprite.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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

/** ── 난수 유틸: 토큰 기반 PRNG (mulberry32) ───────────────────────────── */
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
}: {
  fish: FishInfo;
  overridePos: { leftPct: number; topPct: number };
  popIn?: boolean;
  isHovered?: boolean;
}) {
  /** 개체별 토큰(고정) → PRNG */
  const tokenRef = useRef<number>(makeToken());
  const rand = useMemo(() => mulberry32(tokenRef.current), []);

  const motion = useMemo(() => {
    const travel = rand() * 80 + 45; // 45 ~ 125 %
    const speedSec = rand() * 6 + 6; // 6 ~ 12 s
    const delay = rand() * 2; // 0 ~ 2 s
    const bobPx = Math.round(rand() * 12 + 6); // 6 ~ 18 px
    return { travel, speedSec, delay, bobPx };
  }, [rand]);

  // ✅ 좌우 방향(얼굴) 토글 (X축 반전만 유지)
  const [facingLeft, setFacingLeft] = useState(() => rand() < 0.5);
  const flipEveryX = useMemo(() => 2400 + rand() * 2400, [rand]); // 2.4 ~ 4.8s
  useEffect(() => {
    const id = window.setInterval(() => {
      // 낮은 확률로 가끔 반전 (원하면 0.1~0.3 사이로 조절)
      if (rand() < 0.15) setFacingLeft((v) => !v);
    }, flipEveryX);
    return () => clearInterval(id);
  }, [flipEveryX, rand]);

  // 반응형 너비
  const sizeMul = fish.size ?? 1;
  const widthCss = `clamp(${28 * sizeMul}px, ${6 * sizeMul}vw, ${
    92 * sizeMul
  }px)`;

  // transform 합성: scale(sx, sy) 한 번으로
  const hoverScale = isHovered ? 1.08 : 1;
  const sx = hoverScale * (facingLeft ? -1 : 1); // 좌우 반전 + hover
  const sy = hoverScale; // 세로는 반전 없이 hover만

  return (
    <div
      className="absolute will-change-transform transform-gpu"
      style={{
        left: `${overridePos.leftPct}%`,
        top: `${overridePos.topPct}%`,
        animation: `swim-x ${motion.speedSec}s ease-in-out ${
          motion.delay
        }s infinite alternate${popIn ? ", popIn 600ms ease-out" : ""}`,
        ["--travel" as any]: `${motion.travel}%`,
      }}
    >
      <div
        className="will-change-transform transform-gpu"
        style={{
          animation: `bob-y ${Math.max(
            3,
            motion.speedSec * 0.6
          )}s ease-in-out ${motion.delay}s infinite`,
          ["--bob" as any]: `${motion.bobPx}px`,
        }}
      >
        <img
          src={fish.image}
          alt={fish.labelKo}
          className="pointer-events-none select-none will-change-transform transform-gpu hover:cursor-pointer"
          style={{
            width: widthCss,
            height: "auto",
            transform: `scale(${sx}, ${sy})`, // ← X만 가끔 반전
            transition: "transform 240ms ease-out",
            transformOrigin: "50% 50%",
            filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))",
          }}
        />
      </div>
    </div>
  );
}
