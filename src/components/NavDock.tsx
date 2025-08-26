// src/features/nav/NavDock.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/contexts/ToastContext"; // ✅ 토스트 복구
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dock, DockIcon } from "@/components/magicui/dock";
import {
  Home,
  Info,
  Settings,
  Bell,
  MessageSquareText,
  Package,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";

type Item = {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type NavDockProps = {
  className?: string;
  onNavigate?: (id: string) => void;
  hrefBase?: string; // 기본 "/tmp" → /tmp/[id]
};

// 모든 아이콘 동일 처리 (홈 포함)
const GROUPS: Item[][] = [
  [{ id: "home", label: "홈", icon: Home }],
  [
    { id: "info", label: "info", icon: Info },
    { id: "settings", label: "설정", icon: Settings },
  ],
  [{ id: "notifications", label: "알림", icon: Bell }],
  [
    { id: "questions", label: "답변", icon: MessageSquareText },
    { id: "bundle", label: "답변꾸러미", icon: Package },
  ],
  [{ id: "scheduler", label: "스케쥴러", icon: CalendarClock }],
];

/** 메뉴 접근 가드 */
const GUARDS: Record<
  string,
  { requireLogin?: boolean; requireCouple?: boolean }
> = {
  home: {},
  info: {},
  settings: { requireLogin: true },
  notifications: { requireLogin: true },
  questions: { requireLogin: true, requireCouple: true },
  bundle: { requireLogin: true, requireCouple: true },
  scheduler: { requireLogin: true, requireCouple: true },
};

// body 포털
function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/** 반응형: width에 따라 Dock 크기/간격 조절 */
function useResponsiveDock() {
  const [w, setW] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );

  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (w < 360)
    return {
      iconSize: 38,
      iconMagnification: 76,
      iconDistance: 132,
      gap: 8,
      sepH: 32,
    };
  if (w < 640)
    return {
      iconSize: 40,
      iconMagnification: 78,
      iconDistance: 140,
      gap: 8,
      sepH: 36,
    };
  if (w < 768)
    return {
      iconSize: 44,
      iconMagnification: 82,
      iconDistance: 150,
      gap: 10,
      sepH: 40,
    };
  if (w < 1024)
    return {
      iconSize: 48,
      iconMagnification: 85,
      iconDistance: 160,
      gap: 12,
      sepH: 44,
    };
  return {
    iconSize: 56,
    iconMagnification: 90,
    iconDistance: 180,
    gap: 12,
    sepH: 48,
  };
}

export default function NavDock({
  className,
  onNavigate,
  hrefBase = "/tmp",
}: NavDockProps) {
  // ✅ useUser에서 user, isCoupled만 사용
  const { user, isCoupled } = useUser();
  const coupled = !!isCoupled;
  const uid = user?.id ?? null;

  // ✅ 토스트 훅은 컴포넌트 내부에서 호출
  const { open } = useToast();

  const { iconSize, iconMagnification, iconDistance, gap, sepH } =
    useResponsiveDock();

  /** 접근 가드 + 이동 */
  const go = (id: string) => {
    const guard = GUARDS[id] || {};

    if (guard.requireLogin && !uid) {
      open("로그인이 필요해요.");
      return;
    }
    if (guard.requireCouple && !coupled) {
      open("커플 연동이 필요해요.");
      return;
    }

    if (onNavigate) return onNavigate(id);
    if (typeof window !== "undefined")
      window.location.assign(`${hrefBase}/${id}`);
  };

  /** 아이템 비활성화(시각 힌트) 여부 */
  const disabledByState = (id: string) => {
    const guard = GUARDS[id] || {};
    if (guard.requireLogin && !uid) return true;
    if (guard.requireCouple && !coupled) return true;
    return false;
  };

  return (
    <BodyPortal>
      <TooltipProvider delayDuration={80}>
        <footer
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 border-t",
            // ✅ 베이지 그라데이션 + 살짝 블러
            "bg-gradient-to-t from-[#FFF9F0]/95 via-[#F5EDE3]/85 to-transparent",
            "backdrop-blur supports-[backdrop-filter]:bg-[#FFF9F0]/60"
          )}
        >
          <div className="mx-auto w-full max-w-screen-md px-4">
            <div className="flex justify-center py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
              <Dock
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 180, damping: 18 }}
                className={cn("px-1", className)}
                iconSize={iconSize}
                iconMagnification={iconMagnification}
                iconDistance={iconDistance}
              >
                {GROUPS.map((group, gi) => (
                  <div key={gi} className="flex items-center" style={{ gap }}>
                    {group.map((item) => {
                      const Icon = item.icon;
                      const disabled = disabledByState(item.id);
                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>
                            <DockIcon
                              role="button"
                              tabIndex={0}
                              aria-label={item.label}
                              aria-disabled={disabled}
                              onClick={() => go(item.id)}
                              onKeyDown={(e) =>
                                (e.key === "Enter" || e.key === " ") &&
                                go(item.id)
                              }
                              whileHover={{ y: disabled ? 0 : -2 }}
                              className={cn(
                                "bg-[#E6842A] hover:bg-[#CC6512]",
                                "transition-colors",
                                disabled &&
                                  "opacity-60 saturate-75 cursor-not-allowed hover:bg-[#E6842A]"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-[90%] w-[90%] text-white",
                                  disabled && "text-white/90"
                                )}
                              />
                            </DockIcon>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="px-2 py-1 text-xs"
                          >
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}

                    {/* 그룹 구분선 */}
                    {gi < GROUPS.length - 1 && (
                      <div
                        className="w-[1px] mx-2 rounded-xl bg-neutral-400/70"
                        style={{ height: sepH }}
                        aria-hidden
                      />
                    )}
                  </div>
                ))}
              </Dock>
            </div>
          </div>
        </footer>
      </TooltipProvider>
    </BodyPortal>
  );
}
