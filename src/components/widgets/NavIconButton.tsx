// src/components/nav/NavIconButton.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export type NavIconButtonProps = {
  icon: IconType;
  tooltip: string;
  href?: string;
  onClick?: () => void;
  navigate?: (href: string) => void;
  disabled?: boolean;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  size?: "icon" | "sm" | "md";
};

/* ------------------ 본체 ------------------ */
const NavIconButtonInner = React.forwardRef<
  HTMLButtonElement,
  NavIconButtonProps
>(
  (
    {
      icon: Icon,
      tooltip,
      href,
      onClick,
      navigate,
      disabled = false,
      className,
      side = "bottom",
      size = "icon",
    },
    ref
  ) => {
    const handleClick = React.useCallback(() => {
      if (disabled) return;
      if (onClick) return onClick();
      if (href) {
        if (navigate) return navigate(href);
        if (typeof window !== "undefined") window.location.assign(href);
      }
    }, [disabled, onClick, href, navigate]);

    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              variant="ghost"
              {...(size === "icon" ? { size: "icon" } : {})}
              className={cn(
                // 기본 호버(부모에서 덮어쓸 수 있음)
                "rounded-lg hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-200",
                size === "icon"
                  ? "h-10 w-10"
                  : size === "sm"
                  ? "h-8 px-2"
                  : "h-10 px-3",
                className
              )}
              aria-label={tooltip}
              onClick={handleClick}
              disabled={disabled}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={side} className="text-sm">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);
NavIconButtonInner.displayName = "NavIconButton";

/* ------------------ memo 비교 함수 ------------------ */
const areEqual = (prev: NavIconButtonProps, next: NavIconButtonProps) => {
  // 아이콘 컴포넌트 레퍼런스가 그대로인지
  if (prev.icon !== next.icon) return false;
  // 프리미티브 props 비교
  if (
    prev.tooltip !== next.tooltip ||
    prev.href !== next.href ||
    prev.disabled !== next.disabled ||
    prev.className !== next.className ||
    prev.side !== next.side ||
    prev.size !== next.size
  ) {
    return false;
  }
  // 콜백 레퍼런스 비교 (부모에서 useCallback으로 고정 추천)
  if (prev.onClick !== next.onClick) return false;
  if (prev.navigate !== next.navigate) return false;

  return true; // 전부 동일 → 리렌더 스킵
};

/* ------------------ memo 래핑된 컴포넌트 export ------------------ */
export const NavIconButton = React.memo(NavIconButtonInner, areEqual);
