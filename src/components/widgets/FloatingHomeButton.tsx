// src/components/FloatingHomeButton.tsx
"use client";

import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FloatingHomeButtonProps = {
  href?: string; // 이동 경로 (기본: /main)
  className?: string; // 추가 스타일
  offset?: { bottom?: number; left?: number }; // 위치 보정
  hideOnMain?: boolean; // 이미 /main이면 숨김
  tooltip?: string; // hover 시 툴팁/접근성 라벨
};

export default function FloatingHomeButton({
  href = "/main",
  className,
  offset = { bottom: 16, left: 16 },
  hideOnMain = true,
  tooltip = "홈으로 이동",
}: FloatingHomeButtonProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // ✅ 훅은 항상 호출 (조건부로 건너뛰지 않음)
  const style = useMemo(
    () => ({
      bottom: `${offset.bottom ?? 16}px`,
      left: `${offset.left ?? 16}px`,
    }),
    [offset.bottom, offset.left]
  );

  // 표시 여부는 훅 후에 결정
  const shouldHide = hideOnMain && pathname.startsWith(href);
  if (shouldHide) return null;

  return (
    <div className={cn("fixed z-[10]", className)} style={style}>
      <Button
        size="icon"
        variant="default"
        className={cn(
          "h-12 w-12 rounded-full shadow-lg ",
          "bg-neutral-600 hover:bg-neutral-700", // ✅ 배경: 중립 회색
          "text-white", // ✅ 아이콘 색: 흰색
          "transition-transform hover:scale-105 active:scale-95"
        )}
        onClick={() => navigate(href)}
        aria-label={tooltip}
        title={tooltip}
      >
        <Home className="h-6 w-6" aria-hidden="true" />
        <span className="sr-only">홈</span>
      </Button>
    </div>
  );
}
