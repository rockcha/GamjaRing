// src/features/fortune/TarotPreviewCard.tsx
"use client";

import React from "react";
import { TAROT_CARD_SRC, THEME } from "./theme";
import type { Grade } from "./generateFortune";
import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/magicui/border-beam";

const DEFAULT_THEME: Record<
  Grade,
  { light: string; primary: string; border: string[] }
> = {
  초대박: {
    light: "#fef3eb",
    primary: "#fb923c",
    border: ["#fdba74", "#f97316", "#7c2d12"],
  },
  대박: {
    light: "#ecfdf5",
    primary: "#34d399",
    border: ["#6ee7b7", "#10b981", "#064e3b"],
  },
  좋음: {
    light: "#f0f9ff",
    primary: "#38bdf8",
    border: ["#7dd3fc", "#0ea5e9", "#0c4a6e"],
  },
  보통: {
    light: "#f5f5f6",
    primary: "#a1a1aa",
    border: ["#d4d4d8", "#71717a", "#27272a"],
  },
  주의: {
    light: "#eef2ff",
    primary: "#6366f1",
    border: ["#a5b4fc", "#4f46e5", "#1e1b4b"],
  },
  조심: {
    light: "#f8f4ff",
    primary: "#8b5cf6",
    border: ["#c4b5fd", "#7c3aed", "#312e81"],
  },
  위험: {
    light: "#fef2f2",
    primary: "#ef4444",
    border: ["#fca5a5", "#dc2626", "#450a0a"],
  },
};

function resolveTheme(grade: Grade) {
  const t = (THEME as any)?.[grade];
  return {
    light: t?.light ?? DEFAULT_THEME[grade].light,
    primary: t?.primary ?? DEFAULT_THEME[grade].primary,
    border: t?.border ?? DEFAULT_THEME[grade].border,
  };
}

type Props = {
  grade: Grade;
  title: string;
  onClick?: () => void;
  className?: string;
};

export default function TarotPreviewCard({
  grade,
  title,
  onClick,
  className,
}: Props) {
  const img = TAROT_CARD_SRC[grade];
  const { light, border } = resolveTheme(grade);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative block w-full h-full rounded-3xl overflow-hidden focus:outline-none",
        "transition-transform duration-200 hover:scale-105", // ✅ 호버 시 살짝 커짐
        className
      )}
      style={{ backgroundColor: light }}
      title={title}
      aria-label={title}
    >
      {/* 카드 이미지 */}
      <img
        src={img}
        alt={`${grade} 타로카드`}
        className="absolute inset-0 w-full h-full object-cover select-none z-0"
        loading="lazy"
        draggable={false}
      />

      {/* BorderBeam: 정방향 */}
      <BorderBeam
        borderWidth={4}
        duration={8}
        size={150}
        colorFrom={border[0]}
        colorTo={border[2]}
        className="z-10"
        initialOffset={0}
      />
    </button>
  );
}
