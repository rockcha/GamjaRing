// src/components/nav/NavIconButton.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** 이모지만 보이고, hover/focus 시 label이 툴팁으로 뜨는 네비 버튼 */
export function NavItem({
  emoji,
  label,
  disabled = false,
  onClick,
  className,
}: {
  emoji: string;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const Btn = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={label}
      title={label} // 브라우저 기본 툴팁(모바일/비상용)
      className={cn(
        // 정사각 아이콘 버튼
        "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
        // 톤 & 보더
        "bg-[#FAF7F2] text-slate-800 border border-neutral-200",
        // 상태
        "hover:bg-amber-100 transition disabled:opacity-50 disabled:cursor-not-allowed",
        // 포커스 링
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
        className
      )}
    >
      <span aria-hidden className="text-base sm:text-[18px] leading-none">
        {emoji}
      </span>
      {/* 스크린리더 전용 라벨 */}
      <span className="sr-only">{label}</span>
    </button>
  );

  // disabled일 땐 툴팁을 렌더 안 해서 혼동 방지
  if (disabled) return Btn;

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>{Btn}</TooltipTrigger>
        <TooltipContent side="top">
          <span className="text-sm">{label}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
