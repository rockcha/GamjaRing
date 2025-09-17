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
import type { LucideIcon } from "lucide-react";

/** 아이콘만 보이고, hover/focus 시 label이 툴팁으로 뜨는 네비 버튼 */
export function NavItem({
  icon: Icon,
  label,
  disabled = false,
  onClick,
  className,
}: {
  icon: LucideIcon; // 루시드 아이콘 컴포넌트
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
      className={cn(
        // 정사각 아이콘 버튼
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        // 톤 & 보더
        "bg-[#FAF7F2] text-slate-800 border",
        // 상태
        "hover:bg-amber-200 transition disabled:opacity-50 disabled:cursor-not-allowed",
        // 포커스 링
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
        className
      )}
    >
      {/* 아이콘만 노출 (이전 이모지 대체) */}
      <Icon aria-hidden className="h-5 w-5 sm:h-[18px] sm:w-[18px]" />
      {/* 스크린리더 전용 라벨 */}
      <span className="sr-only">{label}</span>
    </button>
  );

  // disabled일 땐 툴팁 렌더 X (혼동 방지)
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
