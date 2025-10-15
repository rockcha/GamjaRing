// src/components/aquarium/TankChipsNavigator.tsx
"use client";

import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Anchor, ChevronLeft, ChevronRight } from "lucide-react";

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

  /** 스와이프 상태 */
  const [dragging, setDragging] = useState(false);
  const swipeRef = useRef<{ startX: number; lastX: number } | null>(null);
  const [dragDx, setDragDx] = useState(0);
  const SWIPE_THRESHOLD = 48;

  const items = useMemo(
    () =>
      tanks.map((t) => ({
        ...t,
        _title: t.title?.trim() || `${t.tank_no}번 어항`,
      })),
    [tanks]
  );

  const canPrev = idx > 0;
  const canNext = idx < items.length - 1;

  const setIndex = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(items.length - 1, next));
      if (clamped !== idx) onSelect(clamped);
    },
    [idx, items.length, onSelect]
  );

  /** 선택된 항목이 중앙 근처로 보이도록 (부모 호환 유지) */
  useEffect(() => {
    const scroller = listRef.current;
    if (!scroller) return;
    const el = scroller.querySelector<HTMLButtonElement>(
      `[data-index="${idx}"]`
    );
    if (el) {
      el.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: "smooth",
      });
    }
  }, [idx, items.length]);

  /** 키보드 내비: 좌/우/Home/End */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!items.length) return;
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
        e.preventDefault();
      if (e.key === "ArrowLeft") setIndex(idx - 1);
      if (e.key === "ArrowRight") setIndex(idx + 1);
      if (e.key === "Home") setIndex(0);
      if (e.key === "End") setIndex(items.length - 1);
    },
    [idx, items.length, setIndex]
  );

  /** 스와이프 제스처 (pointer capture 제거: 클릭 먹힘 방지) */
  const onPointerDown = (e: React.PointerEvent) => {
    swipeRef.current = { startX: e.clientX, lastX: e.clientX };
    setDragging(true);
    setDragDx(0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!swipeRef.current) return;
    swipeRef.current.lastX = e.clientX;
    const dx = e.clientX - swipeRef.current.startX;
    setDragDx(dx);
  };

  const endSwipe = () => {
    if (!swipeRef.current) {
      setDragging(false);
      setDragDx(0);
      return;
    }
    const dx = swipeRef.current.lastX - swipeRef.current.startX;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      if (dx < 0 && canNext) setIndex(idx + 1);
      if (dx > 0 && canPrev) setIndex(idx - 1);
    }
    swipeRef.current = null;
    setDragging(false);
    setDragDx(0);
  };

  const onPointerCancel = () => {
    swipeRef.current = null;
    setDragging(false);
    setDragDx(0);
  };

  /** 휠/트랙패드 */
  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (e.deltaX > 10 && canNext) setIndex(idx + 1);
      if (e.deltaX < -10 && canPrev) setIndex(idx - 1);
    } else {
      const scroller = listRef.current;
      if (!scroller) return;
      scroller.scrollLeft += e.deltaY;
    }
  };

  return (
    <div
      className={cn(
        "w-full rounded-xl border bg-white/70 backdrop-blur-md",
        "dark:bg-slate-900/60 dark:border-white/10",
        "shadow-[0_6px_20px_rgba(15,23,42,0.06)]",
        "px-3 py-2",
        className
      )}
      aria-label="아쿠아리움 가로 네비게이터"
      role="navigation"
    >
      {/* 헤더 (미니멀) */}
      <div className="px-1 pb-2 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200/70 dark:border-white/10">
          <Anchor className="h-[14px] w-[14px] text-slate-600 dark:text-slate-300" />
        </span>
        <h3 className="font-semibold text-sm leading-5">탱크 선택</h3>

        {/* 좌/우 버튼 */}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIndex(idx - 1)}
            disabled={!canPrev}
            aria-label="이전 탱크"
            className={cn(
              "h-8 w-8 grid place-items-center rounded-full border bg-white/85 hover:bg-white",
              "backdrop-blur supports-[backdrop-filter]:backdrop-blur",
              "disabled:opacity-40"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setIndex(idx + 1)}
            disabled={!canNext}
            aria-label="다음 탱크"
            className={cn(
              "h-8 w-8 grid place-items-center rounded-full border bg-white/85 hover:bg-white",
              "backdrop-blur supports-[backdrop-filter]:backdrop-blur",
              "disabled:opacity-40"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 가로 스와이프 영역 */}
      <div
        ref={listRef}
        tabIndex={0}
        role="tablist"
        aria-label="어항 목록"
        aria-activedescendant={
          items[idx]?.tank_no ? `tank-${items[idx].tank_no}` : undefined
        }
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endSwipe}
        onPointerCancel={onPointerCancel}
        onWheel={onWheel}
        className={cn(
          "relative flex items-center gap-1.5 overflow-x-auto scrollbar-none",
          "rounded-lg border bg-white/60 dark:bg-slate-900/50",
          "px-2 py-2",
          "snap-x snap-mandatory",
          dragging && "cursor-grabbing select-none"
        )}
        style={{
          scrollBehavior: "smooth",
          transform: `translateX(${dragging ? dragDx * 0.12 : 0}px)`,
          transition: dragging ? "none" : "transform 160ms ease",
          touchAction: "pan-y", // 세로 스크롤은 통과(클릭 보존)
        }}
      >
        {items.map((t, i) => {
          const active = i === idx;
          return (
            <button
              type="button" // ✅ 클릭 먹힘 방지
              key={t.tank_no}
              id={`tank-${t.tank_no}`}
              data-index={i}
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(i)}
              className={cn(
                "group relative shrink-0 rounded-full border transition-all duration-150 snap-start",
                "h-9 px-3.5 text-[13px] sm:text-[14px]",
                active
                  ? [
                      "bg-white dark:bg-slate-900",
                      "border-slate-300/80 dark:border-white/15",
                      "ring-1 ring-slate-400/30 dark:ring-white/15",
                      "shadow-[0_6px_16px_rgba(15,23,42,0.06)]",
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
                  "mr-2 inline-block h-2.5 w-2.5 rounded-full ring-1 align-[-1px]",
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
            </button>
          );
        })}
      </div>

      {/* 페이지 인디케이터 (미니 점) */}
      <div className="mt-2 flex justify-center gap-1.5">
        {items.map((_, i) => (
          <span
            key={i}
            role="button"
            aria-label={`${i + 1}번째 탱크로 이동`}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all pointer-events-auto",
              i === idx
                ? "w-4 bg-slate-700 dark:bg-slate-200"
                : "w-1.5 bg-slate-300 dark:bg-slate-600"
            )}
          />
        ))}
      </div>
    </div>
  );
}
