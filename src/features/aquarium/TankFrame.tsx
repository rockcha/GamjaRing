// src/features/aquarium/TankFrame.tsx
"use client";
import React from "react";

export default function TankFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[1100px] ">
      {/* ✅ 심플한 검정 테두리 */}
      <div className="absolute inset-0 rounded-2xl ring-8 ring-neutral-600 pointer-events-none" />

      {/* ✅ 내용물: 모서리만 라운드, 배경은 투명 (AquariumBox가 배경을 가짐) */}
      <div
        className="
          relative w-full rounded-2xl overflow-hidden
          shadow-[0_8px_28px_rgba(0,0,0,0.35)]
          bg-transparent
        "
      >
        {children}
      </div>
    </div>
  );
}
