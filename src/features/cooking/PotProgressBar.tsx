"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  total: number;
  min: number;
  max: number; // COOK_TARGET_MAX
  segments?: number; // 기본 10
  className?: string;
};

export default function PotProgressBar({
  total,
  min,
  max,
  segments = 10,
  className,
}: Props) {
  const pct = Math.max(0, Math.min(1, total / max));
  const segs = Array.from({ length: segments }, (_, i) => i);
  const perSeg = max / segments;

  // thumb 위치(px 대신 %로)
  const thumbLeft = `${pct * 100}%`;

  // 적정 범위 넓이(%)
  const goodStart = Math.max(0, Math.min(1, min / max)) * 100;
  const goodEnd = 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* 적정 범위 하이라이트 (뒤쪽 띠) */}
        <div
          className="absolute inset-y-0 rounded-xl"
          style={{
            left: `${goodStart}%`,
            width: `${goodEnd - goodStart}%`,
            background:
              "linear-gradient(to right, rgba(16,185,129,0.14), rgba(16,185,129,0.08))",
          }}
        />

        {/* 세그먼트 바 */}
        <div
          className={cn(
            "relative grid rounded-xl overflow-hidden ring-1 ring-amber-200/70 bg-white"
          )}
          style={{
            gridTemplateColumns: `repeat(${segments}, 1fr)`,
            height: "14px",
          }}
        >
          {segs.map((i) => {
            const segFilled = total >= (i + 1) * perSeg;
            const isLastFilled =
              total >= i * perSeg && total < (i + 1) * perSeg;
            return (
              <div
                key={i}
                className={cn(
                  "relative h-full border-r border-amber-200/60 last:border-r-0"
                )}
              >
                {/* 채움 레이어 */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{
                    scaleX: segFilled
                      ? 1
                      : isLastFilled
                      ? (total - i * perSeg) / perSeg
                      : 0,
                  }}
                  transition={{
                    type: "tween",
                    duration: 0.22,
                    delay: i * 0.02,
                  }}
                  className="origin-left h-full"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(251,191,36,0.95), rgba(234,179,8,0.9))",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* 현재값 배지(thumb) */}
        <motion.div
          initial={false}
          animate={{ left: thumbLeft }}
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 28,
            mass: 0.4,
          }}
          className="absolute -top-6"
          style={{ translateX: "-50%" }}
        >
          <div className="select-none rounded-md bg-amber-900 text-amber-50 px-2 py-0.5 text-[11px] tabular-nums shadow-sm">
            {total}/{max}
          </div>
          {/* 아래 작은 포인터 */}
          <div className="mx-auto h-2 w-[2px] rounded bg-amber-900/70" />
        </motion.div>
      </div>

      {/* 라벨 줄 */}
      <div className="mt-1 flex justify-between text-[10px] text-amber-900/70">
        <span>0</span>
        <span className="tabular-nums">min {min}</span>
        <span className="tabular-nums">max {max}</span>
      </div>
    </div>
  );
}
