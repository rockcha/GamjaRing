// src/features/cooking/CookingFX.tsx
"use client";

import { useEffect, useMemo } from "react";

type CookingFXProps = {
  /** 애니메이션 표시 시간 (기본 2000ms) */
  durationMs?: number;
  /** 끝났을 때 불릴 콜백 (2초 뒤 호출) */
  onDone?: () => void;
  /** 필요 시 부모에서 스타일 덮어쓰는 용 */
  className?: string;
};

export default function CookingFX({
  durationMs = 2000,
  onDone,
  className,
}: CookingFXProps) {
  // /public/cooking/gif1.gif, gif2.gif, gif3.gif 중 하나 선택
  const src = useMemo(() => {
    const idx = Math.floor(Math.random() * 3) + 1; // 1~3
    return `/cooking/cooking${idx}.gif`;
  }, []);

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onDone]);

  return (
    <div
      className={
        // 부모 모달을 꽉 채우도록 absolute inset-0 사용
        `absolute inset-0 bg-black/80 flex items-center justify-center ${
          className ?? ""
        }`
      }
      role="status"
      aria-live="polite"
    >
      {/* 모달 전체 채우기: object-cover */}
      <img
        src={src}
        alt="요리중"
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* 진행 배지 */}
      <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-md bg-black/60 text-white text-sm font-semibold backdrop-blur-[2px]">
        요리중… ⏳
      </div>
    </div>
  );
}
