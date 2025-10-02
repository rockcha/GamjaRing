// src/components/aquarium/TankChipsNavigator.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
// ⬇️ Provider까지 함께 import
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

type Tank = { tank_no: number; title: string; theme_id: number | null };

type Props = {
  tanks: Tank[];
  idx: number;
  onSelect: (index: number) => void;
  className?: string;
};

export default function TankChipsNavigator({
  tanks,
  idx,
  onSelect,
  className,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-index="${idx}"]`
    );
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [idx, tanks.length]);

  const items = useMemo(
    () =>
      tanks.map((t) => ({
        ...t,
        _title: t.title?.trim() || `${t.tank_no}번 어항`,
      })),
    [tanks]
  );

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "sticky top-20 max-h-[calc(100svh-120px)]",
          "w-full sm:w-[240px] rounded-2xl border bg-white/70 backdrop-blur shadow-sm",
          "p-2 sm:p-3 flex flex-col",
          className
        )}
        aria-label="아쿠아리움 이름 네비게이터"
      >
        <header className="px-1 py-0.5">
          <h3 className="font-semibold text-sm">네비게이터</h3>
        </header>

        <Separator className="my-2" />

        <div
          ref={listRef}
          className="min-h-0 overflow-y-auto pr-1 flex flex-col gap-1.5"
        >
          {items.map((t, i) => {
            const active = i === idx;
            const themeHue = ((t.theme_id ?? 12) * 11) % 360;

            return (
              <Tooltip key={t.tank_no}>
                <TooltipTrigger asChild>
                  <Button
                    data-index={i}
                    onClick={() => onSelect(i)}
                    variant={active ? "default" : "ghost"}
                    className={cn(
                      "w-full h-9 rounded-full justify-start gap-2 px-2.5 text-sm",
                      active
                        ? "bg-amber-600 text-white hover:bg-amber-600"
                        : "hover:bg-amber-50"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "inline-block h-3 w-3 rounded-full ring-2 ring-white/70",
                        active && "animate-pulse"
                      )}
                      style={{ background: `hsl(${themeHue} 70% 60%)` }}
                    />
                    <span className={cn("truncate", active && "font-semibold")}>
                      {t._title}
                    </span>
                    <span
                      className={cn(
                        "ml-auto text-[11px] tabular-nums",
                        active ? "text-white/90" : "text-muted-foreground"
                      )}
                    >
                      #{t.tank_no}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {t.tank_no}번 • {t._title}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </aside>
    </TooltipProvider>
  );
}
