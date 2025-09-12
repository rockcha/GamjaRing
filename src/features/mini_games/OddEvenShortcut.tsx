// src/components/OddEvenShortcut.tsx
"use client";

import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  emoji?: string; // 기본 이모지 변경 가능
  label?: string; // 라벨 텍스트
  to?: string; // 경로 커스텀 (기본: /oddEven)
};

export default function OddEvenShortcut({
  className,
  emoji = "🎲",
  label = "홀짝",
  to = "/oddEven",
}: Props) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={cn(
        "group inline-flex flex-col items-center gap-2",
        "p-0 h-auto rounded-md transition-all duration-200",
        "hover:-translate-y-0.5 active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 focus-visible:ring-offset-2",
        className
      )}
      title={label}
      aria-label={label}
    >
      <span
        className="text-2xl leading-none transition-transform duration-200
                   group-hover:scale-110 group-active:scale-95"
      >
        {emoji}
      </span>
      <span className="text-xs font-medium text-neutral-700 group-hover:text-neutral-900">
        {label}
      </span>
    </button>
  );
}
