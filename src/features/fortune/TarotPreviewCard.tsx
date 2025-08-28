// src/features/fortune/TarotPreviewCard.tsx
"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TAROT_CARD_SRC, THEME } from "./theme";
import type { Grade } from "./generateFortune";

// 등급별 글로우 색 (테두리만 은은하게)
const GLOW_RGBA: Record<Grade, string> = {
  초대박: "rgba(253, 186, 116, 0.45)", // orange-300
  대박: "rgba(110, 231, 183, 0.45)", // emerald-300
  좋음: "rgba(125, 211, 252, 0.45)", // sky-300
  보통: "rgba(212, 212, 212, 0.45)", // neutral-300 (approx)
  주의: "rgba(165, 180, 252, 0.45)", // indigo-300
  조심: "rgba(196, 181, 253, 0.45)", // purple-300
  위험: "rgba(253, 164, 175, 0.45)", // rose-300
};

export default function TarotPreviewCard({
  grade,
  title,
  onClick,
}: {
  grade: Grade;
  title: string;
  onClick?: () => void;
}) {
  const theme = THEME[grade];
  const src = TAROT_CARD_SRC[grade];

  const ringCls = theme.ring; // e.g. ring-emerald-300
  const borderCls = ringCls.replace("ring-", "border-");
  const chipBg = theme.chip.split(" ").find((c) => c.startsWith("bg-")) ?? "";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="오늘의 운세 상세 보기"
      className={[
        "group relative w-full h-full rounded-lg overflow-hidden",
        THEME[grade].bg,
        "border-none",
        `ring-2 ${ringCls} ${borderCls}`,
        "transition-all", // ✅ hover 관련 효과 제거
        "active:scale-[0.99] focus:outline-none",
      ].join(" ")}
    >
      {/* 카드 이미지 */}
      <img
        src={src}
        alt={`${grade} 타로카드`}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />

      {/* 🔆 테두리 글로우 레이어(hover시에만 나타남) */}
      <div
        className={[
          "pointer-events-none absolute -inset-[2px] rounded-[1.5rem]",
          "border-2", // 테두리만 남기고
          borderCls, // 등급 색
          "opacity-0 ",
        ].join(" ")}
        style={{
          // 경계만 은은하게 퍼지도록 blur + 바깥쪽 글로우
          filter: "blur(6px)",
          boxShadow: `0 0 22px 6px ${GLOW_RGBA[grade]}`,
        }}
      />

      {/* hover 색 오버레이(아주 옅게) */}
      <div
        className={`pointer-events-none absolute inset-0 opacity-0  transition ${chipBg}`}
        style={{ mixBlendMode: "screen" }}
      />

      {/* 하단 타이틀 */}
    </button>
  );
}
