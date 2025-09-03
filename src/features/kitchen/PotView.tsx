// src/features/kitchen/PotView.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Effect = { id: number; emoji: string; dx: number; delay: number };

export default function PotView({
  lastDropEmoji,
  potEmojis, // 냄비 안에 표시할 지속 이모지들
}: {
  lastDropEmoji?: string | null;
  potEmojis: string[];
}) {
  const [effects, setEffects] = useState<Effect[]>([]);

  // 드롭 이펙트
  useEffect(() => {
    if (!lastDropEmoji) return;
    const id = Date.now();
    setEffects((prev) => [
      ...prev,
      {
        id,
        emoji: lastDropEmoji,
        dx: (Math.random() - 0.5) * 80,
        delay: Math.random() * 120,
      },
    ]);
    const t = setTimeout(
      () => setEffects((p) => p.filter((e) => e.id !== id)),
      900
    );
    return () => clearTimeout(t);
  }, [lastDropEmoji]);

  // 🔧 냄비 내부 '일직선' 배치 (Y 고정, X만 균등 분포)
  const persistent = useMemo(() => {
    const n = potEmojis.length;
    return potEmojis.map((emoji, idx) => {
      const left = n > 1 ? 20 + (idx * 60) / (n - 1) : 50; // 20% ~ 80%
      const top = 62; // 라인 고정 (냄비 중하단)
      const rot = 0; // 일직선 느낌을 위해 회전 제거
      return { id: idx, emoji, left, top, rot };
    });
  }, [potEmojis]);

  return (
    <div className="relative h-full">
      {/* 냄비 UI */}
      <div className="relative mx-auto w-64 h-64">
        {/* 본체 */}
        <div className="absolute inset-x-4 bottom-8 top-10 rounded-b-[40px] bg-gradient-to-b from-zinc-400 to-zinc-700 shadow-inner" />
        <div className="absolute inset-x-2 top-8 h-6 rounded-t-full bg-gradient-to-b from-zinc-200 to-zinc-500 shadow" />
        <div className="absolute left-[12%] top-2 w-3/4 h-3 rounded-full bg-black/10" />

        {/* 🔄 레시피 아이콘: 거품(🫧) → 🍲 으로 교체 + 강조 */}
        <div className="absolute left-1/2 -translate-x-1/2 top-9 select-none">
          <span className="text-3xl animate-pulse drop-shadow-[0_0_10px_rgba(245,158,11,0.55)]">
            🍲
          </span>
        </div>

        {/* 지속 이모지 (일직선 배치) */}
        {persistent.map((p) => (
          <span
            key={p.id}
            className="absolute text-xl select-none"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              transform: `translate(-50%, -50%) rotate(${p.rot}deg)`,
            }}
          >
            {p.emoji}
          </span>
        ))}

        {/* 드롭 이펙트 */}
        {effects.map((e) => (
          <span
            key={e.id}
            className="absolute left-1/2 top-0 text-2xl opacity-0"
            style={{
              transform: "translate(-50%, -50%)",
              animation: `k_drop .85s ease-out ${e.delay}ms forwards`,
              ["--dx" as any]: `${e.dx}px`,
            }}
          >
            {e.emoji}
          </span>
        ))}
      </div>

      {/* 키프레임 */}
      <style>{`
        @keyframes k_drop {
          0% { opacity: 0; transform: translate(-50%,-80%) rotate(-10deg) }
          30%{ opacity: 1 }
          100% { opacity: 0; transform: translate(calc(-50% + var(--dx,0)), 120px) rotate(8deg) scale(0.9) }
        }
      `}</style>
    </div>
  );
}
