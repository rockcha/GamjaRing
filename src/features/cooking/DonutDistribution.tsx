"use client";

import * as React from "react";
import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { INGREDIENTS, type IngredientTitle } from "@/features/cooking/type";

type Counts = Record<IngredientTitle, number>;

export default function DonutDistribution({
  counts,
  total,
  className,
  size = 220,
  stroke = 22,
  centerGif = null, // { src, key }
  idleGifSrc = "/cooking/default.gif", // idle 기본 GIF
}: {
  counts: Counts;
  total: number;
  className?: string;
  size?: number;
  stroke?: number;
  centerGif?: { src: string; key: number } | null;
  idleGifSrc?: string;
}) {
  const radius = useMemo(() => (size - stroke) / 2, [size, stroke]);
  const center = size / 2;
  const circumference = useMemo(() => Math.PI * 2 * radius, [radius]);

  // ── 파이 조각 계산 (접점 "직선" — overlap 없이 정확한 길이)
  const slices = useMemo(() => {
    const list = INGREDIENTS.map((it) => ({
      title: it.title as IngredientTitle,
      color: it.color ?? "#ddd",
      count: counts[it.title as IngredientTitle] ?? 0,
    })).filter((s) => s.count > 0);

    const sum = list.reduce((acc, cur) => acc + cur.count, 0);
    let accLen = 0;

    return list.map((s) => {
      const len = sum > 0 ? (s.count / sum) * circumference : 0;
      const dasharray = `${len} ${Math.max(0, circumference - len)}`;
      const dashoffset = -accLen;
      accLen += len;
      return { ...s, len, dasharray, dashoffset };
    });
  }, [counts, circumference]);

  return (
    <div
      className={cn("relative select-none", className)}
      style={{ width: size, height: size }}
      aria-label="재료 도넛 분포"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
        role="img"
        aria-hidden
        shapeRendering="geometricPrecision"
      >
        <defs>
          {/* 부드러운 배경 트랙 그라데이션 */}
          <radialGradient id="donutRadial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF7E6" />
            <stop offset="100%" stopColor="#FFE3A3" />
          </radialGradient>
          <linearGradient id="donutGloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.65)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          {/* 인너 섀도 마스크 */}
          <mask id="innerMask">
            <rect width={size} height={size} fill="white" />
            <circle
              cx={center}
              cy={center}
              r={radius - stroke * 0.35}
              fill="black"
            />
          </mask>
        </defs>

        {/* 트랙 (외곽 라인 X) */}
        <g mask="url(#innerMask)">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#donutRadial)"
            strokeWidth={stroke}
            opacity={0.95}
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#donutGloss)"
            strokeWidth={stroke * 0.45}
            opacity={0.9}
            vectorEffect="non-scaling-stroke"
          />
        </g>

        {/* 파이 조각 — 접점 “직선” */}
        <g transform={`rotate(-90, ${center}, ${center})`}>
          {slices.map((s) => (
            <motion.circle
              key={s.title}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="butt" // ← 직선 끝
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
              initial={{ opacity: 0, filter: "brightness(0.98)" }}
              animate={{ opacity: 1, filter: "brightness(1)" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      </svg>

      {/* 중앙 GIF */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <AnimatePresence mode="wait">
          {centerGif ? (
            <motion.img
              key={`action-${centerGif.key}`}
              src={centerGif.src}
              alt="cooking action"
              initial={{ opacity: 0, scale: 0.94, filter: "blur(2px)" }}
              animate={{ opacity: 1, scale: 1.02, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(1px)" }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="object-contain will-change-auto"
              width={120}
              height={120}
              style={{ width: 120, height: 120 }}
              decoding="async"
            />
          ) : (
            <motion.img
              key="idle-gif"
              src={idleGifSrc}
              alt="idle cooking"
              initial={{ opacity: 0, scale: 0.98, filter: "blur(1px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(1px)" }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="object-contain will-change-auto"
              width={120}
              height={120}
              style={{ width: 120, height: 120 }}
              decoding="async"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
