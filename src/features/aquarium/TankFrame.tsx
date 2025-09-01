"use client";
import React from "react";

/**
 * 수조(glass tank) 느낌을 주는 데코용 래퍼
 * - 상단 림/하단 받침대/유리 광택/외곽 링 등
 * - 자식은 그대로 렌더(예: AquariumBox)
 */
export default function TankFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-fit">
      {/* 외곽 링(유리 테두리) */}
      <div className="pointer-events-none absolute inset-0 -inset-x-2 -inset-y-2 rounded-3xl ring-4 ring-sky-200/60" />

      {/* 상단 림 */}
      <div className="absolute -top-3 left-4 right-4 h-3 rounded-t-xl bg-gradient-to-b from-slate-200 to-slate-300 shadow" />

      {/* 하단 받침대 */}
      <div className="absolute -bottom-4 left-6 right-6 h-4 rounded-b-xl bg-gradient-to-t from-slate-700 to-slate-500 shadow-lg" />

      {/* 유리 광택(가벼운 하이라이트) */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-white/15 to-transparent" />
        <div className="absolute right-3 top-3 h-24 w-24 rotate-45 rounded-full bg-white/10 blur-xl" />
      </div>

      {/* 내용물(실제 어항) */}
      <div className="relative rounded-2xl overflow-hidden shadow-[inset_0_4px_14px_rgba(255,255,255,.35),inset_0_-12px_30px_rgba(0,0,0,.18)] backdrop-blur-[1px]">
        {children}
      </div>
    </div>
  );
}
