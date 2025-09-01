// src/features/cooking/CookingFX.tsx
"use client";

import { useMemo } from "react";

type CookingFXProps = {
  emojis?: string[];
  intensity?: number; // 0.0 ~ 1.0 (기본 0.85) → 전체 이펙트 강도
  count?: number; // 이모지 개수 (기본 10)
  sparks?: number; // 스파크 개수 (기본 16)
  bubbles?: number; // 기포 개수 (기본 10)
};

export default function CookingFX({
  emojis = ["🥕", "🍖", "🧅", "🧄", "🌶️", "🍄", "🥔", "🥬", "🍚", "🧀"],
  intensity = 0.85,
  count = 10,
  sparks = 16,
  bubbles = 10,
}: CookingFXProps) {
  // 이모지 파티클 (곡선 부유)
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const emoji = emojis[i % emojis.length] ?? "🥔";
      // 시작 좌표는 카드 하단 근처에서 위/좌우로 곡선 이동
      const startX = 20 + Math.random() * 60; // 20% ~ 80%
      const startY = 70 + Math.random() * 20; // 70% ~ 90%
      const ampX = 6 + Math.random() * 10; // 좌우 진폭
      const lift = 25 + Math.random() * 35; // 상승 높이
      const duration = 6 + Math.random() * 6; // 6~12s
      const delay = -(Math.random() * 4); // 음수 지연으로 시점 분산
      const rotate = Math.floor(Math.random() * 16) - 8; // -8~8deg
      const scale = 0.9 + Math.random() * 0.8;
      return {
        emoji,
        startX,
        startY,
        ampX,
        lift,
        duration,
        delay,
        rotate,
        scale,
      };
    });
  }, [emojis, count]);

  // 스파크(불꽃 튀김)
  const sparkList = useMemo(() => {
    return Array.from({ length: sparks }).map((_, i) => {
      const x = 40 + Math.random() * 20; // 40~60% (냄비 중앙 근처)
      const spread = 18 + Math.random() * 28; // 좌우 퍼짐
      const height = 35 + Math.random() * 45; // 상승 높이
      const size = 2 + Math.random() * 3; // px
      const dur = 0.9 + Math.random() * 1.8;
      const del = -(Math.random() * 1.2);
      return { x, spread, height, size, dur, del };
    });
  }, [sparks]);

  // 기포(보글보글)
  const bubbleList = useMemo(() => {
    return Array.from({ length: bubbles }).map((_, i) => {
      const x = 45 + Math.random() * 10; // 중앙 좁은 영역
      const drift =
        Math.random() < 0.5 ? -6 - Math.random() * 5 : 6 + Math.random() * 5;
      const size = 6 + Math.random() * 10; // px
      const height = 30 + Math.random() * 35;
      const dur = 1.8 + Math.random() * 2.2;
      const del = -(Math.random() * 1.5);
      return { x, drift, size, height, dur, del };
    });
  }, [bubbles]);

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden
    >
      {/* 🔥 하단 불꽃(글로우 + 이글거림) */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "radial-gradient(60% 85% at 50% 100%, rgba(255,158,28,0.55), rgba(253,141,20,0.28) 55%, rgba(255,90,0,0.15) 75%, transparent 88%)",
          opacity: 0.85 * intensity,
          animation: "heatWobble 2.4s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "radial-gradient(40% 60% at 48% 100%, rgba(255,210,64,0.45), rgba(255,140,0,0.22) 50%, transparent 80%)",
          mixBlendMode: "screen",
          opacity: 0.7 * intensity,
          animation: "heatWobble 3.1s ease-in-out infinite",
          animationDelay: "-1.1s",
        }}
      />

      {/* 💨 열기/증기(아주 옅게) */}
      <div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[140%] h-2/3"
        style={{
          background:
            "radial-gradient(50% 90% at 50% 100%, rgba(255,255,255,0.18), rgba(255,255,255,0.06) 45%, transparent 70%)",
          opacity: 0.28 * intensity,
          animation: "steamRise 6.2s linear infinite",
        }}
      />

      {/* ✨ 스파크 */}
      {sparkList.map((s, idx) => (
        <i
          key={`sp-${idx}`}
          className="absolute block rounded-full"
          style={
            {
              left: `${s.x}%`,
              bottom: "8%",
              width: `${s.size}px`,
              height: `${s.size}px`,
              background:
                "radial-gradient(circle, rgba(255,230,120,1) 0%, rgba(255,170,20,0.9) 60%, rgba(255,120,0,0.0) 70%)",
              boxShadow: "0 0 12px rgba(255,170,20,0.8)",
              opacity: 0.85 * intensity,
              transform: "translateX(0) translateY(0) scale(1)",
              animation: `sparkRise ${s.dur}s ease-out infinite`,
              animationDelay: `${s.del}s`,
              // 커스텀 속성 (키프레임에서 var()로 참조)
              // @ts-ignore
              "--spread": `${s.spread}px`,
              "--height": `${s.height}%`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* 🫧 기포 */}
      {bubbleList.map((b, idx) => (
        <span
          key={`bb-${idx}`}
          className="absolute block rounded-full border"
          style={
            {
              left: `${b.x}%`,
              bottom: "12%",
              width: `${b.size}px`,
              height: `${b.size}px`,
              borderColor: "rgba(255,255,255,0.75)",
              background:
                "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55), rgba(255,255,255,0.15) 55%, rgba(255,255,255,0.05) 70%, transparent 80%)",
              opacity: 0.9 * intensity,
              transform: "translateX(0) translateY(0) scale(0.9)",
              animation: `bubbleUp ${b.dur}s ease-out infinite`,
              animationDelay: `${b.del}s`,
              // @ts-ignore
              "--drift": `${b.drift}px`,
              "--bHeight": `${b.height}%`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* 🍲 재료(곡선 부유, 또렷하게) */}
      {particles.map((p, idx) => (
        <span
          key={`em-${idx}`}
          className="absolute text-2xl md:text-3xl select-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]"
          style={
            {
              left: `${p.startX}%`,
              top: `${p.startY}%`,
              transform: `translate(-50%, -50%) rotate(${p.rotate}deg) scale(${p.scale})`,
              opacity: 0.85 * intensity,
              animation: `floatArc ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
              // @ts-ignore
              "--ampX": `${p.ampX}%`,
              "--lift": `${p.lift}%`,
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}

      {/* 애니메이션 키프레임 + 모션 축소 대응 */}
      <style>{`
        @keyframes heatWobble {
          0%, 100% { transform: scaleY(1) translateY(0); opacity: 0.92; }
          50% { transform: scaleY(1.04) translateY(-2%); opacity: 1; }
        }
        @keyframes steamRise {
          0% { transform: translate(-50%, 10%); opacity: 0.22; }
          60% { opacity: 0.32; }
          100% { transform: translate(-50%, -28%); opacity: 0.12; }
        }
        @keyframes sparkRise {
          0%   { transform: translateX(0) translateY(0) scale(0.9); opacity: 0.0; }
          10%  { opacity: 1; }
          70%  { transform: translateX(var(--spread)) translateY(calc(-1 * var(--height))); opacity: 0.9; }
          100% { transform: translateX(calc(var(--spread) * 1.1)) translateY(calc(-1.15 * var(--height))) scale(0.95); opacity: 0; }
        }
        @keyframes bubbleUp {
          0%   { transform: translateX(0) translateY(0) scale(0.8); opacity: 0; }
          15%  { opacity: 0.95; }
          70%  { transform: translateX(var(--drift)) translateY(calc(-1 * var(--bHeight))) scale(1.05); opacity: 0.9; }
          85%  { transform: translateX(calc(var(--drift) * 1.1)) translateY(calc(-1.07 * var(--bHeight))) scale(0.9); opacity: 0.35; }
          100% { transform: translateX(calc(var(--drift) * 1.15)) translateY(calc(-1.12 * var(--bHeight))) scale(0.7); opacity: 0; }
        }
        @keyframes floatArc {
          0%   { transform: translate(-50%, -50%) translateX(0) translateY(0) rotate(0deg) scale(1); }
          25%  { transform: translate(-50%, -50%) translateX(calc(var(--ampX) * -1)) translateY(calc(var(--lift) * -0.35)) rotate(-2deg) scale(1.02); }
          50%  { transform: translate(-50%, -50%) translateX(calc(var(--ampX))) translateY(calc(var(--lift) * -0.7)) rotate(2deg) scale(1.03); }
          75%  { transform: translate(-50%, -50%) translateX(calc(var(--ampX) * -0.5)) translateY(calc(var(--lift) * -0.9)) rotate(0deg) scale(1.02); }
          100% { transform: translate(-50%, -50%) translateX(calc(var(--ampX) * 0.6)) translateY(calc(var(--lift) * -1)) rotate(0deg) scale(1.0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}
