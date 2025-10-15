// src/components/aquarium/TankChipsRail.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Anchor } from "lucide-react";

type Tank = { tank_no: number; title: string; theme_id: number | null };

type Props = {
  tanks: Tank[];
  idx: number;
  onSelect: (index: number) => void;
  className?: string;
  size?: "sm" | "md";
};

export default function TankChipsRail({
  tanks,
  idx,
  onSelect,
  className,
  size = "md",
}: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [dragging, setDragging] = useState(false);
  const posRef = useRef<{ x: number; scroll: number; moved: boolean } | null>(
    null
  );

  const items = useMemo(
    () =>
      tanks.map((t) => ({
        ...t,
        _title: (t.title ?? "").trim() || `${t.tank_no}번 어항`,
      })),
    [tanks]
  );

  const updateEdges = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 2);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = railRef.current;
    if (!el) return;
    const on = () => updateEdges();
    el.addEventListener("scroll", on, { passive: true });
    const ro = new ResizeObserver(on);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", on);
      ro.disconnect();
    };
  }, [updateEdges]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLButtonElement>(`[data-index="${idx}"]`);
    if (active) {
      active.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [idx, items.length]);

  /** 🎯 드래그/스와이프: pointer capture 없이 임계치 기반 */
  const DRAG_THRESHOLD = 6; // px

  const onPointerDown = (e: React.PointerEvent) => {
    const el = railRef.current;
    if (!el) return;
    posRef.current = { x: e.clientX, scroll: el.scrollLeft, moved: false };
    // 기본 클릭 동작을 막지 않기 위해 preventDefault/stopPropagation 안 함
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!posRef.current) return;
    const el = railRef.current;
    if (!el) return;
    const dx = e.clientX - posRef.current.x;
    if (Math.abs(dx) >= DRAG_THRESHOLD) {
      posRef.current.moved = true;
      setDragging(true);
    }
    if (posRef.current.moved) {
      el.scrollLeft = posRef.current.scroll - dx;
    }
  };

  const stopDrag = () => {
    // 클릭 억제는 굳이 하지 않음: moved=false면 버튼이 정상 클릭되고,
    // moved=true면 사용자가 드래그로 처리했을 것
    posRef.current = null;
    setDragging(false);
  };

  /** 수평 휠 지원 */
  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    const el = railRef.current;
    if (!el) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    el.scrollLeft += e.deltaY;
  };

  /** 키보드 좌/우/Home/End */
  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!items.length) return;
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
      e.preventDefault();
    if (e.key === "ArrowLeft") onSelect(Math.max(0, idx - 1));
    if (e.key === "ArrowRight") onSelect(Math.min(items.length - 1, idx + 1));
    if (e.key === "Home") onSelect(0);
    if (e.key === "End") onSelect(items.length - 1);
  };

  const chipBase =
    size === "sm"
      ? "h-8 px-3 text-[13px]"
      : "h-9 px-3.5 text-[13px] sm:text-[14px]";

  const nudge = (dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.6);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/10">
          <Anchor className="h-[14px] w-[14px] text-slate-600 dark:text-slate-300" />
        </span>
        <div className="text-sm font-semibold">탱크 선택</div>
        <div className="text-xs text-muted-foreground ml-1">
          스와이프/스크롤 가능
        </div>
      </div>

      {/* 좌/우 페이드 */}
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-10 transition-opacity",
          canLeft ? "opacity-100" : "opacity-0"
        )}
        aria-hidden
      >
        <div className="h-full w-full bg-gradient-to-r from-white/90 via-white/40 to-transparent dark:from-slate-950/80 dark:via-slate-950/20" />
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 transition-opacity",
          canRight ? "opacity-100" : "opacity-0"
        )}
        aria-hidden
      >
        <div className="h-full w-full bg-gradient-to-l from-white/90 via-white/40 to-transparent dark:from-slate-950/80 dark:via-slate-950/20" />
      </div>

      {/* 좌/우 보조 버튼 */}
      <button
        type="button"
        onClick={() => nudge(-1)}
        className={cn(
          "absolute left-1 top-1/2 -translate-y-1/2 z-10 grid place-items-center",
          "h-8 w-8 rounded-full border bg-white/90 shadow hover:bg-white",
          "disabled:opacity-40"
        )}
        disabled={!canLeft}
        aria-label="왼쪽으로 스크롤"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => nudge(1)}
        className={cn(
          "absolute right-1 top-1/2 -translate-y-1/2 z-10 grid place-items-center",
          "h-8 w-8 rounded-full border bg-white/90 shadow hover:bg-white",
          "disabled:opacity-40"
        )}
        disabled={!canRight}
        aria-label="오른쪽으로 스크롤"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* 칩 레일 */}
      <div
        ref={railRef}
        role="tablist"
        aria-label="어항 가로 네비게이터"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onWheel={onWheel}
        className={cn(
          "relative flex gap-1.5 overflow-x-auto scrollbar-none",
          "rounded-xl border bg-white/70 dark:bg-slate-900/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur",
          "px-2 py-2",
          "snap-x snap-mandatory",
          dragging ? "cursor-grabbing select-none" : "cursor-grab"
        )}
        style={{ scrollBehavior: "smooth" }}
      >
        {items.map((t, i) => {
          const active = i === idx;
          return (
            <button
              key={t.tank_no}
              type="button"
              data-index={i}
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(i)}
              className={cn(
                "group relative shrink-0 rounded-full border transition-all duration-150 snap-start",
                chipBase,
                active
                  ? [
                      "bg-white dark:bg-slate-900",
                      "border-slate-300/80 dark:border-white/15",
                      "shadow-[0_6px_20px_rgba(15,23,42,0.08)]",
                      "ring-1 ring-slate-400/30 dark:ring-white/15",
                      "scale-[1.02]",
                    ]
                  : [
                      "bg-white/60 dark:bg-white/5",
                      "border-transparent hover:border-slate-200/70 dark:hover:border-white/10",
                    ]
              )}
            >
              <span
                className={cn(
                  "mr-2 inline-block h-2.5 w-2.5 rounded-full ring-1",
                  t.theme_id
                    ? "bg-emerald-400/80 ring-emerald-600/30"
                    : "bg-slate-300/80 ring-slate-400/30"
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "truncate",
                  active ? "font-semibold" : "font-medium"
                )}
              >
                {t._title}
              </span>
              <span
                className={cn(
                  "ml-2 text-[11px] tabular-nums rounded px-1.5 py-[1px] border",
                  active
                    ? "border-slate-300/80 bg-slate-50 text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-200"
                    : "border-slate-200/70 bg-white/60 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                )}
                aria-hidden
              >
                #{t.tank_no}
              </span>
              <span
                className={cn(
                  "pointer-events-none absolute -bottom-[6px] left-3 right-3 h-2 rounded-full",
                  "transition-opacity duration-150",
                  active ? "opacity-100" : "opacity-0",
                  "bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300/90"
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
