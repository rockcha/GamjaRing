// src/components/nav/NavIconButton.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** 이모지 + 라벨 단순 네비 버튼 (가로 배치/랩핑용) */
export function NavItem({
  emoji,
  label,
  disabled = false,
  onClick,
  className,
}: {
  emoji: string; // ✅ 이모지로 받기
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-lg px-2.5 py-1.5",
        "text-xs sm:text-[13px] bg-[#FAF7F2]  text-slate-800 border border-neutral-200",
        "hover:bg-amber-100 transition disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      <span aria-hidden className="text-base sm:text-[18px] leading-none">
        {emoji}
      </span>
      <span className="ml-1.5 sm:ml-2 truncate">{label}</span>
    </button>
  );
}
