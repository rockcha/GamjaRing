// src/components/aquarium/TankChipsNavigator.tsx
"use client";

import { useMemo, useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type Tank = { tank_no: number; title: string; theme_id: number | null };

type Props = {
  tanks: Tank[];
  idx: number;
  onSelect: (index: number) => void;
  /** 어항 이름 변경 콜백 */
  onRename?: (tankNo: number, newTitle: string) => void;
  className?: string;
  density?: "compact" | "cozy" | "comfortable";
};

export default function TankChipsNavigator({
  tanks,
  idx,
  onSelect,
  onRename,
  className,
  density = "compact", // ✅ 기본을 compact로
}: Props) {
  /** 스와이프 */
  const [dragging, setDragging] = useState(false);
  const swipeRef = useRef<{ startX: number; lastX: number } | null>(null);
  const [dragDx, setDragDx] = useState(0);
  const SWIPE_THRESHOLD = 48;

  /** 검색/점프 (많을 때만) */
  const MANY_COUNT = 16;
  const [query, setQuery] = useState("");

  /** 이름 편집 상태 */
  const [editingTankNo, setEditingTankNo] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const items = useMemo(
    () =>
      (tanks ?? []).map((t) => ({
        ...t,
        _title: (t.title ?? "").trim() || `${t.tank_no}번 어항`,
      })),
    [tanks]
  );

  const canPrev = idx > 0;
  const canNext = idx < items.length - 1;

  const setIndex = useCallback(
    (next: number) => {
      const last = items.length - 1;
      const clamped = Math.max(0, Math.min(last, next));
      if (clamped !== idx) onSelect(clamped);
    },
    [idx, items.length, onSelect]
  );

  /** 키보드 내비 */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!items.length) return;
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
        e.preventDefault();
      if (e.key === "ArrowLeft" && canPrev) setIndex(idx - 1);
      if (e.key === "ArrowRight" && canNext) setIndex(idx + 1);
      if (e.key === "Home") setIndex(0);
      if (e.key === "End") setIndex(items.length - 1);
    },
    [items.length, idx, canPrev, canNext, setIndex]
  );

  /** 스와이프 */
  const onPointerDown = (e: React.PointerEvent) => {
    swipeRef.current = { startX: e.clientX, lastX: e.clientX };
    setDragging(true);
    setDragDx(0);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!swipeRef.current) return;
    swipeRef.current.lastX = e.clientX;
    setDragDx(e.clientX - swipeRef.current.startX);
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

  /** 검색/점프 */
  const jumpToMatch = useCallback(() => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const i = items.findIndex(
      (t) => t._title.toLowerCase().includes(q) || String(t.tank_no).includes(q)
    );
    if (i >= 0) setIndex(i);
  }, [query, items, setIndex]);

  /** 이름 편집 시작 */
  const startEdit = useCallback(
    (tankNo: number) => {
      const target = items.find((t) => t.tank_no === tankNo);
      if (!target) return;
      setEditingTankNo(tankNo);
      setEditValue(target._title);
    },
    [items]
  );

  /** 이름 편집 완료 (저장) */
  const finishEdit = useCallback(
    (opts?: { cancel?: boolean }) => {
      if (editingTankNo === null) return;
      const trimmed = editValue.trim();
      const tankNo = editingTankNo;

      if (!opts?.cancel && trimmed && onRename) {
        onRename(tankNo, trimmed);
      }

      setEditingTankNo(null);
      setEditValue("");
    },
    [editingTankNo, editValue, onRename]
  );

  /** 밀도 프리셋 */
  const DENSITY = {
    compact: {
      boxH: "h-14",
      boxPx: "px-2.5",
      boxPy: "py-1.5",
      title: "text-[11px] sm:text-[12px]",
      number: "text-[11px]",
      minW: "min-w-[96px]",
    },
    cozy: {
      boxH: "h-16",
      boxPx: "px-3",
      boxPy: "py-2",
      title: "text-[12px] sm:text-[13px]",
      number: "text-[11px]",
      minW: "min-w-[112px]",
    },
    comfortable: {
      boxH: "h-16", // ⬅️ h-18 → h-16 로 정리
      boxPx: "px-3.5",
      boxPy: "py-2.5",
      title: "text-[13px] sm:text-[14px]",
      number: "text-[12px]",
      minW: "min-w-[128px]",
    },
  }[density];

  const BOX_BASE =
    "bg-slate-50/80 dark:bg-slate-900/50 border-slate-200/70 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10";
  const BOX_ACTIVE_RING =
    "ring-2 ring-slate-400/40 ring-offset-1 ring-offset-white dark:ring-offset-slate-900";

  return (
    <div
      className={cn(
        "w-full rounded-2xl bg-white/70 backdrop-blur-md",
        "dark:bg-slate-900/60 dark:border-white/10",
        "shadow-[0_6px_20px_rgba(15,23,42,0.06)]",
        "px-3 pb-3 pt-2",
        className
      )}
      aria-label="아쿠아리움 네비게이터"
      role="navigation"
      onKeyDown={onKeyDown}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endSwipe}
        onPointerCancel={onPointerCancel}
        className={cn(
          "rounded-xl border bg-white/60 dark:bg-slate-900/50 px-2 py-2",
          dragging && "select-none"
        )}
        style={{
          transform: `translateX(${dragging ? dragDx * 0.06 : 0}px)`,
          transition: dragging ? "none" : "transform 160ms ease",
          touchAction: "pan-y",
        }}
      >
        {/* 검색/점프: 많을 때만 */}
        {items.length >= MANY_COUNT && (
          <div className="mb-2 flex flex-wrap gap-2 items-center px-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && jumpToMatch()}
              placeholder="검색: 이름 또는 #번호"
              className="h-8 w-40 rounded-md border px-2 text-xs bg-white/80 dark:bg-slate-900/70 outline-none"
            />
            <select
              className="h-8 rounded-md border px-2 text-xs bg-white/80 dark:bg-slate-900/70 outline-none"
              value={idx}
              onChange={(e) => setIndex(Number(e.target.value))}
              title="탱크로 점프"
            >
              {items.map((t, i) => (
                <option key={t.tank_no} value={i}>
                  #{t.tank_no} · {t._title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={jumpToMatch}
              className="h-8 rounded-md border bg-white/85 hover:bg-white px-2 text-xs active:scale-95 transition"
              aria-label="검색 이동"
            >
              이동
            </button>
          </div>
        )}

        {/* ✅ 스크롤 영역: 요소 넘치면 세로 스크롤 */}
        <ScrollArea className="mt-1 h-[280px] pr-1">
          <div
            role="tablist"
            aria-label="어항 목록"
            aria-activedescendant={
              items[idx]?.tank_no ? `tank-${items[idx].tank_no}` : undefined
            }
            className={cn(
              "grid gap-1.5 sm:gap-2",
              "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
            )}
          >
            {items.map((t, i) => {
              const active = i === idx;
              const isEditing = editingTankNo === t.tank_no;

              return (
                <button
                  type="button"
                  key={t.tank_no}
                  id={`tank-${t.tank_no}`}
                  role="tab"
                  data-index={i}
                  aria-selected={active}
                  onClick={() => onSelect(i)}
                  title={`${t._title} (#${t.tank_no})`}
                  className={cn(
                    "group relative w-full rounded-lg border transition-all duration-150",
                    DENSITY.boxH,
                    DENSITY.boxPx,
                    DENSITY.boxPy,
                    DENSITY.minW,
                    "text-left",
                    BOX_BASE,
                    "outline-none focus-visible:outline-none ring-0 focus:ring-0 active:ring-0",
                    active &&
                      cn(
                        "shadow-[0_4px_10px_rgba(15,23,42,0.06)]",
                        BOX_ACTIVE_RING
                      )
                  )}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={cn("font-medium tabular-nums", DENSITY.number)}
                    >
                      #{t.tank_no}
                    </span>
                    {onRename && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(t.tank_no);
                        }}
                        aria-label="어항 이름 변경"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    <span className="sr-only">{active ? "선택됨" : ""}</span>
                  </div>

                  {/* 이름 영역: 보기 vs 편집 */}
                  {isEditing ? (
                    <div
                      className="mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => finishEdit()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            finishEdit();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            finishEdit({ cancel: true });
                          }
                        }}
                        className={cn(
                          "w-full rounded-md border px-1.5 py-0.5 text-[11px]",
                          "bg-white/90 dark:bg-slate-900/80 outline-none"
                        )}
                        placeholder={`${t.tank_no}번 어항`}
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "line-clamp-2 leading-4",
                        DENSITY.title,
                        active ? "font-semibold" : "font-medium"
                      )}
                    >
                      {t._title}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
