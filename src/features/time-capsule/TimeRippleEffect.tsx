"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  icon?: string; // 중앙 아이콘 (기본 ⏳)
  durationMs?: number; // 전체 길이
  className?: string;
  onDone?: () => void;
  variant?: "global" | "inline"; // ★ 추가: 다이얼로그 내부용
};

export default function TimeRippleEffect({
  open,
  icon = "⏳",
  durationMs = 1300,
  className,
  onDone,
  variant = "global",
}: Props) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    // (선택) 사운드/햅틱
    try {
      const a = new Audio("/sfx/time_ripple.mp3");
      a.volume = 0.7;
      a.play().catch(() => {});
    } catch {}
    if ("vibrate" in navigator) navigator.vibrate(20);

    const t = setTimeout(() => onDone?.(), durationMs);
    return () => clearTimeout(t);
  }, [open, durationMs, onDone]);

  const containerCls =
    variant === "global"
      ? "pointer-events-none fixed inset-0 z-[100] grid place-items-center"
      : "pointer-events-none absolute inset-0 grid place-items-center"; // ★ 부모를 relative로

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(containerCls, className)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 배경 라이트/비네팅 (inline일 땐 부모 영역 한정) */}
          {!reduce && (
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.12) 35%, rgba(0,0,0,0.10) 75%, rgba(0,0,0,0.0) 100%)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18 }}
            />
          )}

          {/* 중심 타임 코어 + 링 */}
          <div className="relative">
            {!reduce && (
              <>
                <RippleRing delay={0.0} size={220} />
                <RippleRing delay={0.1} size={280} />
                <RippleRing delay={0.2} size={340} />
              </>
            )}
            <motion.div
              className="relative grid place-items-center"
              initial={{ scale: 0.85, rotate: -6, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 520, damping: 26 }}
            >
              <div
                className="relative w-28 h-28 rounded-full shadow-[0_8px_32px_rgba(59,130,246,0.35)]"
                style={{
                  background:
                    "radial-gradient(120% 120% at 30% 30%, #93c5fd 0%, #60a5fa 45%, #7c3aed 100%)",
                }}
              >
                <div className="absolute inset-0 grid place-items-center">
                  <motion.div
                    className="text-4xl select-none drop-shadow-sm"
                    initial={{ scale: 0.92 }}
                    animate={{ scale: [0.92, 1.0, 0.97, 1.0] }}
                    transition={{ duration: 0.5, times: [0, 0.35, 0.7, 1] }}
                  >
                    {icon}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RippleRing({
  delay = 0,
  size = 260,
}: {
  delay?: number;
  size?: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full border-2"
      style={{
        width: size,
        height: size,
        borderColor: "rgba(255,255,255,0.7)",
        boxShadow:
          "0 0 36px rgba(125,211,252,0.35), inset 0 0 40px rgba(255,255,255,0.25)",
        backdropFilter: "blur(1px)",
      }}
      initial={{ scale: 0.3, opacity: 0.95 }}
      animate={{ scale: 1.35, opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeOut", delay }}
    />
  );
}
