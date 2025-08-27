// src/features/nav/NavDock.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/contexts/ToastContext";
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

function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/** 반응형: width에 따라 Dock 크기/간격 조절 (전체 높이 살짝 감소) */
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
      iconSize: 34, // ↓ 38 → 34
      iconMagnification: 72, // ↓ 76 → 72
      iconDistance: 128,
      gap: 8,
      sepH: 24, // ↓ 32 → 28
    };
  if (w < 640)
    return {
      iconSize: 36, // ↓ 40 → 36
      iconMagnification: 74, // ↓ 78 → 74
      iconDistance: 136,
      gap: 8,
      sepH: 28, // ↓ 36 → 32
    };
  if (w < 768)
    return {
      iconSize: 40, // ↓ 44 → 40
      iconMagnification: 78, // ↓ 82 → 78
      iconDistance: 146,
      gap: 10,
      sepH: 32, // ↓ 40 → 36
    };
  if (w < 1024)
    return {
      iconSize: 44, // ↓ 48 → 44
      iconMagnification: 81, // ↓ 85 → 81
      iconDistance: 156,
      gap: 12,
      sepH: 36, // ↓ 44 → 40
    };
  return {
    iconSize: 52, // ↓ 56 → 52
    iconMagnification: 86, // ↓ 90 → 86
    iconDistance: 176,
    gap: 12,
    sepH: 40, // ↓ 48 → 44
  };
}

export default function NavDock({
  className,
  onNavigate,
  hrefBase = "/tmp",
}: NavDockProps) {
  const { user, isCoupled } = useUser();
  const coupled = !!isCoupled;
  const uid = user?.id ?? null;
  const { open } = useToast();

  const { iconSize, iconMagnification, iconDistance, gap, sepH } =
    useResponsiveDock();

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
            "bg-white/90"
          )}
        >
          <div className="mx-auto w-full max-w-screen-md px-4">
            {/* ↓ py-3 → py-2 / pb 12px → 8px : 전체 높이 살짝 감소 */}
            <div className="flex justify-center py-2 pb-[calc(8px+env(safe-area-inset-bottom))]">
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
