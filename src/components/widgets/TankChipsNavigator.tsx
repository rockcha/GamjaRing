// src/components/aquarium/TankChipsNavigator.tsx
"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Anchor } from "lucide-react";

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

  /** 선택된 항목이 중앙 근처로 보이도록 */
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-index="${idx}"]`
    );
    if (el) {
      el.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
    }
  }, [idx, tanks.length]);

  const items = useMemo(
    () =>
      tanks.map((t) => ({
        ...t,
        _title: t.title?.trim() || `${t.tank_no}번 어항`,
      })),
    [tanks]
  );

  /** 단순 키보드 내비게이션(↑/↓/Home/End) */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!tanks.length) return;
      if (["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key))
        e.preventDefault();
      if (e.key === "ArrowUp") onSelect(Math.max(0, idx - 1));
      if (e.key === "ArrowDown") onSelect(Math.min(tanks.length - 1, idx + 1));
      if (e.key === "Home") onSelect(0);
      if (e.key === "End") onSelect(tanks.length - 1);
    },
    [idx, tanks.length, onSelect]
  );

  return (
    <aside
      className={cn(
        "sticky top-20 max-h-[calc(100svh-120px)]",
        "w-full sm:w-[248px] rounded-xl border bg-white/70 backdrop-blur-md",
        "dark:bg-slate-900/60 dark:border-white/10",
        "shadow-[0_6px_20px_rgba(15,23,42,0.06)]",
        "p-3 flex flex-col",
        className
      )}
      aria-label="아쿠아리움 이름 네비게이터"
      role="navigation"
    >
      {/* 헤더 (미니멀) */}
      <header className="px-1 py-0.5 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200/70 dark:border-white/10">
          <Anchor className="h-[14px] w-[14px] text-slate-600 dark:text-slate-300" />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm leading-5">네비게이터</h3>
          <p className="text-[11px] text-muted-foreground/90 leading-4">
            어항을 빠르게 이동하세요
          </p>
        </div>
      </header>

      <Separator className="my-2" />

      {/* 리스트: 페이드 제거, 깔끔 스크롤 */}
      <div
        ref={listRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={cn(
          "min-h-0 overflow-y-auto pr-1 flex flex-col gap-1.5",
          "focus:outline-none"
        )}
        aria-label="어항 목록"
        role="listbox"
        aria-activedescendant={
          items[idx]?.tank_no ? `tank-${items[idx].tank_no}` : undefined
        }
      >
        {items.map((t, i) => {
          const active = i === idx;
          return (
            <div key={t.tank_no} role="option" aria-selected={active}>
              <Button
                id={`tank-${t.tank_no}`}
                data-index={i}
                onClick={() => onSelect(i)}
                variant="ghost"
                aria-current={active ? "true" : undefined}
                className={cn(
                  "group w-full h-9 rounded-lg justify-start gap-2 pl-3 pr-2 text-[13px]",
                  "border transition-all duration-150",
                  // ▶ 미니멀 스타일: 중립 톤 유지, 과한 색/효과 제거
                  active
                    ? [
                        "bg-white dark:bg-slate-900",
                        "border-slate-300/80 dark:border-white/15",
                        "ring-1 ring-slate-400/40 dark:ring-white/20",
                        "text-slate-900 dark:text-slate-100",
                      ]
                    : [
                        "border-transparent",
                        "hover:bg-slate-950/[0.03] dark:hover:bg-white/5",
                        "text-slate-800 dark:text-slate-200",
                        "focus-visible:ring-2 focus-visible:ring-slate-300/70 dark:focus-visible:ring-slate-600/70 focus-visible:ring-offset-2",
                      ]
                )}
              >
                {/* 타이틀 */}
                <span
                  className={cn(
                    "truncate",
                    active ? "font-semibold" : "font-medium"
                  )}
                >
                  {t._title}
                </span>

                {/* 번호 (미니 칩) */}
                <span
                  className={cn(
                    "ml-auto text-[11px] tabular-nums inline-flex items-center rounded px-1.5 py-[1px] border",
                    active
                      ? "border-slate-300/80 bg-slate-50 text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-200"
                      : "border-slate-200/70 bg-white/60 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                  )}
                  aria-hidden
                >
                  #{t.tank_no}
                </span>
              </Button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
