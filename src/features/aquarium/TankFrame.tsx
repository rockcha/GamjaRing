"use client";
import React from "react";

/**
 * 수조(glass tank) 느낌을 주는 데코용 래퍼
 */
export default function TankFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-fit">
      {/* 🟦 상단 수면 라인 */}
      <div className="absolute -top-2 left-3 right-3 h-2 rounded-t-xl bg-gradient-to-b from-sky-200/70 to-transparent blur-[1px]" />

      {/* 하단 받침대 */}
      <div className="absolute -bottom-5 left-6 right-6 h-5 rounded-b-xl bg-gradient-to-t from-slate-700 to-slate-500 shadow-lg" />

      {/* 외곽 유리 두께감 */}
      <div className="absolute inset-0 rounded-2xl border-4 border-sky-200/30 pointer-events-none" />

      {/* 유리 하이라이트 */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1/4 bg-gradient-to-r from-white/15 to-transparent" />
        <div className="absolute right-4 top-4 h-28 w-28 rotate-45 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* 수중 반사광 */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-cyan-200/10 via-transparent to-transparent blur-md" />
      </div>

      {/* 실제 어항 내용물 */}
      <div
        className="
          relative rounded-2xl overflow-hidden
          shadow-[inset_0_4px_14px_rgba(255,255,255,.35),inset_0_-12px_30px_rgba(0,0,0,.18)]
          bg-gradient-to-b from-sky-100/40 to-sky-200/20
          backdrop-blur-[2px]
        "
      >
        {children}
      </div>
    </div>
  );
}
