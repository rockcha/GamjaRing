// src/components/aquarium/TankChipsNavigator.tsx
"use client";

import { useMemo, useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Anchor, ChevronDown, ChevronUp, Info } from "lucide-react";

type Tank = { tank_no: number; title: string; theme_id: number | null };

type Props = {
  tanks: Tank[];
  idx: number;
  onSelect: (index: number) => void;
  className?: string;
  density?: "compact" | "cozy" | "comfortable";
};

export default function TankChipsNavigator({
  tanks,
  idx,
  onSelect,
  className,
  density = "cozy",
}: Props) {
  /** 기본 접힘 */
  const [open, setOpen] = useState(false);

  /** 스와이프(펼친 상태에서만 인덱스 전환) */
  const [dragging, setDragging] = useState(false);
  const swipeRef = useRef<{ startX: number; lastX: number } | null>(null);
  const [dragDx, setDragDx] = useState(0);
  const SWIPE_THRESHOLD = 48;

  /** 검색/점프 (많을 때만) */
  const MANY_COUNT = 16;
  const [query, setQuery] = useState("");

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

  /** 키보드 내비 — 펼친 상태에서만 */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!open || !items.length) return;
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
        e.preventDefault();
      if (e.key === "ArrowLeft" && canPrev) setIndex(idx - 1);
      if (e.key === "ArrowRight" && canNext) setIndex(idx + 1);
      if (e.key === "Home") setIndex(0);
      if (e.key === "End") setIndex(items.length - 1);
    },
    [open, items.length, idx, canPrev, canNext, setIndex]
  );

  /** 스와이프 — 펼친 상태에서만 */
  const onPointerDown = (e: React.PointerEvent) => {
    if (!open) return;
    swipeRef.current = { startX: e.clientX, lastX: e.clientX };
    setDragging(true);
    setDragDx(0);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!open || !swipeRef.current) return;
    swipeRef.current.lastX = e.clientX;
    setDragDx(e.clientX - swipeRef.current.startX);
  };
  const endSwipe = () => {
    if (!open) return;
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

  /** 밀도 프리셋 (박스형 버튼) */
  const DENSITY = {
    compact: {
      boxH: "h-16",
      boxPx: "px-3",
      boxPy: "py-2",
      title: "text-[12px]",
      number: "text-[11px]",
      minW: "min-w-[108px]",
    },
    cozy: {
      boxH: "h-18",
      boxPx: "px-3.5",
      boxPy: "py-2.5",
      title: "text-[13px] sm:text-[14px]",
      number: "text-[12px]",
      minW: "min-w-[128px]",
    },
    comfortable: {
      boxH: "h-20",
      boxPx: "px-4",
      boxPy: "py-3",
      title: "text-[14px] sm:text-[15px]",
      number: "text-[13px]",
      minW: "min-w-[148px]",
    },
  }[density];

  /** 통일된(은은한) 박스 색감 — 전체 동일 팔레트 */
  const BOX_BASE =
    "bg-slate-50/80 dark:bg-slate-900/50 border-slate-200/70 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10";
  const BOX_ACTIVE_RING =
    "ring-2 ring-slate-400/40 ring-offset-1 ring-offset-white dark:ring-offset-slate-900";

  /** 접힘 상태에서 보여줄 현재 탱크 정보 */
  const current = items[idx];

  return (
    <div
      className={cn(
        "w-full rounded-2xl border bg-white/70 backdrop-blur-md",
        "dark:bg-slate-900/60 dark:border-white/10",
        "shadow-[0_6px_20px_rgba(15,23,42,0.06)]",
        "px-3 pb-3 pt-2",
        className
      )}
      aria-label="아쿠아리움 네비게이터"
      role="navigation"
      onKeyDown={onKeyDown}
      style={{ WebkitTapHighlightColor: "transparent" }} // 모바일 클릭 하이라이트 제거
    >
      {/* 헤더 */}
      <div className="px-1 pb-2 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200/70 dark:border-white/10">
          <Anchor className="h-[14px] w-[14px] text-slate-600 dark:text-slate-300" />
        </span>
        <h3 className="font-semibold text-sm leading-5">탱크 선택</h3>
      </div>

      {/* 본문 */}
      {open ? (
        // ✅ 펼친 상태: 가로 스크롤 없음, 좌우 이동 버튼 제거(요청 2)
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
          {/* 검색/점프: 펼친 상태 + 많을 때만 */}
          {items.length >= MANY_COUNT && (
            <div className="mb-2 hidden md:flex items-center gap-2 px-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && jumpToMatch()}
                placeholder="검색: 이름 또는 #번호"
                className="h-8 w-44 rounded-md border px-2 text-sm bg-white/80 dark:bg-slate-900/70 outline-none"
              />
              <select
                className="h-8 rounded-md border px-2 text-sm bg-white/80 dark:bg-slate-900/70 outline-none"
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
                className="h-8 rounded-md border bg-white/85 hover:bg-white px-2 text-sm active:scale-95 transition"
                aria-label="검색 이동"
              >
                이동
              </button>
            </div>
          )}

          {/* 어항 목록 그리드 */}
          <div
            role="tablist"
            aria-label="어항 목록"
            aria-activedescendant={
              items[idx]?.tank_no ? `tank-${items[idx].tank_no}` : undefined
            }
            className={cn(
              "grid gap-2",
              "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            )}
          >
            {items.map((t, i) => {
              const active = i === idx;
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
                        "shadow-[0_6px_16px_rgba(15,23,42,0.06)]",
                        BOX_ACTIVE_RING
                      )
                  )}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn("font-medium tabular-nums", DENSITY.number)}
                    >
                      #{t.tank_no}
                    </span>
                    <span className="sr-only">{active ? "선택됨" : ""}</span>
                  </div>
                  <div
                    className={cn(
                      "line-clamp-2 leading-5",
                      DENSITY.title,
                      active ? "font-semibold" : "font-medium"
                    )}
                  >
                    {t._title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        // ✅ 접힌 상태: 현재 탱크 정보를 예쁘게 표시 + Tip
        <div className="rounded-xl border bg-white/60 dark:bg-slate-900/50 px-4 py-5">
          <div className="flex flex-col items-center gap-3 text-center">
            {/* 현재 탱크 라벨 */}
            <div
              className={cn(
                "inline-flex items-center gap-2   px-3 py-1.5",
                "bg-white/90 dark:bg-slate-900/70 "
              )}
              title={`현재 탱크: #${current?.tank_no ?? "-"} ${
                current?._title ?? ""
              }`}
            >
              <span className="text-lg  font-semibold ">현재 어항 :</span>
              <span className="text-2xl text-blue-500 font-semibold max-w-[60vw] sm:max-w-[40vw] truncate">
                #{current?.tank_no} {current?._title ?? "이름 없는 어항"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 단일 토글 버튼(아래쪽, 큼직하고 직관적) — “펼치기 버튼이 두 개” 문제 해결 */}
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "group inline-flex items-center justify-center gap-2 rounded-full border px-5 h-11",
            "bg-gradient-to-b from-white/95 to-white/85 dark:from-slate-900/80 dark:to-slate-900/70",
            "hover:from-white hover:to-white dark:hover:from-slate-900 dark:hover:to-slate-900",
            "shadow-[0_6px_16px_rgba(0,0,0,0.06)] active:scale-[0.98]",
            "transition-colors"
          )}
          aria-expanded={open}
        >
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {open ? "접기" : "어항 목록 펼치기"}
          </span>
        </button>
      </div>
    </div>
  );
}
