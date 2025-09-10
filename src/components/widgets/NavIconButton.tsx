// src/components/nav/NavIconButton.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

/** 툴팁 없이 아이콘 + 텍스트가 기본 노출되는 단순 네비 아이템 */
export function NavItem({
  icon: Icon,
  label,
  disabled = false,
  onClick,
  className,
}: {
  icon: IconType;
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
        "w-full inline-flex items-center rounded-md px-2.5 py-2 text-sm",
        "bg-white/70 border hover:bg-amber-200 transition",
        "text-slate-800 border-slate-200",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="ml-2 truncate">{label}</span>
    </button>
  );
}
