"use client";
import { useMemo } from "react";
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
  isHovered = false, // ✅ 이미지에만 scale 주기 위해 추가
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

  const baseSize = 64;
  const widthPx = baseSize * (fish.size ?? 1);

  return (
    <div
      className="absolute will-change-transform transform-gpu"
      style={{
        left: `${overridePos.leftPct}%`,
        top: `${overridePos.topPct}%`,
        // 좌우 수영은 래퍼에서 (translateX만)
        animation: `swim-x ${motion.speedSec}s ease-in-out ${
          motion.delay
        }s infinite alternate${popIn ? ", popIn 600ms ease-out" : ""}`,
        ["--travel" as any]: `${motion.travel}%`,
      }}
    >
      {/* 상하 출렁임은 내부 래퍼에서 */}
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
        {/* ✅ 스케일은 이미지에만 적용 → transform 충돌/깜빡임 방지 */}
        <img
          src={fish.image}
          alt={fish.labelKo}
          className="pointer-events-none select-none will-change-transform transform-gpu hover:cursor-pointer"
          style={{
            width: `${widthPx}px`,
            height: "auto",
            transform: `scale(${isHovered ? 1.08 : 1}) `,
            transition: "transform 180ms ease-out",
            filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))",
          }}
        />
      </div>
    </div>
  );
}
