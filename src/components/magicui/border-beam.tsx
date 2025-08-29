// src/components/magicui/border-beam.tsx
"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import type { MotionStyle, Transition } from "motion/react";

interface BorderBeamProps {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  transition?: Transition;
  className?: string;
  style?: React.CSSProperties;
  reverse?: boolean;
  initialOffset?: number; // 0 ~ 100
  borderWidth?: number;
}

export const BorderBeam = ({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 2,
}: BorderBeamProps) => {
  return (
    <div
      className={cn(
        // 반드시 부모가 rounded & overflow-hidden 인 상태여야 모양이 깔끔
        "pointer-events-none absolute inset-0 rounded-[inherit]",
        className
      )}
      // ⭐ 핵심: padding = borderWidth, mask로 '테두리만' 보이게
      style={
        {
          // 보더 두께 역할
          padding: `${borderWidth}px`,
          // 두 장의 마스크: content-box(안쪽)와 full(바깥)을 xor/exclude
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor", // Safari용
          maskComposite: "exclude", // 표준
          ...style,
        } as React.CSSProperties
      }
    >
      <motion.div
        className={cn(
          "absolute aspect-square",
          "bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent"
        )}
        style={
          {
            width: size,
            // 라운드 사각형 경로 따라 이동
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            // color vars
            "--color-from": colorFrom,
            "--color-to": colorTo,
            animation: `beamMove ${duration}s linear infinite`,
          } as MotionStyle
        }
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  );
};
