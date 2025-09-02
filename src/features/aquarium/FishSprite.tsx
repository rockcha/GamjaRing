// src/features/aquarium/FishSprite.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
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
  const motion = useMemo(() => {
    const travel = Math.random() * 80 + 45;
    const speedSec = Math.random() * 6 + 6;
    const delay = Math.random() * 2;
    const bobPx = Math.round(Math.random() * 12 + 6);
    return { travel, speedSec, delay, bobPx };
  }, []);

  // ✅ 좌우 방향(얼굴) 확률적으로 토글
  const [facingLeft, setFacingLeft] = useState(() => Math.random() < 0.5);
  const flipEvery = useMemo(() => 2400 + Math.random() * 2400, []);
  useEffect(() => {
    const id = window.setInterval(() => {
      // 0.22(22%) 확률로 방향 전환 (원하면 수치만 조절)
      if (Math.random() < 0.22) setFacingLeft((v) => !v);
    }, flipEvery);
    return () => clearInterval(id);
  }, [flipEvery]);

  const baseSize = 64;
  const widthPx = baseSize * (fish.size ?? 1);

  const basePxMin = 28; // 최소 크기(모바일)
  const baseVw = 6; // 뷰포트 비율
  const basePxMax = 92; // 최대 크기(데스크톱)
  const widthCss = `clamp(${basePxMin * (fish.size ?? 1)}px, ${
    baseVw * (fish.size ?? 1)
  }vw, ${basePxMax * (fish.size ?? 1)}px)`;

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
            width: widthCss, // ← 숫자(px) 대신 clamp()로 반응형
            height: "auto",
            transform: `scale(${isHovered ? 1.08 : 1})`,
            transition: "transform 180ms ease-out",
            filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))",
          }}
        />
      </div>
    </div>
  );
}
