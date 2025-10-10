// src/components/widgets/Cards/NewSpeciesBanner.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faFilter,
  faChevronUp,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";

/** View row from v_aquarium_featured */
export type FeaturedRow = {
  created_at: string;
  entity_id: string;
  name_ko: string | null;
  rarity: string | null;
  price: number | null;
  size: number | null;
  description: string | null;
};

export type RarityKey = "common" | "rare" | "epic" | "legend";

function normalizeRarity(raw?: string | null): RarityKey {
  const v = (raw ?? "common").toString().trim().toLowerCase();
  if (v === "common" || v === "rare" || v === "epic" || v === "legend")
    return v as RarityKey;
  if (["일반"].includes(v)) return "common";
  if (["레어", "희귀"].includes(v)) return "rare";
  if (["에픽", "영웅"].includes(v)) return "epic";
  if (["전설"].includes(v)) return "legend";
  return "common";
}

const rarityStyle: Record<
  RarityKey,
  { card: string; badge: string; ring: string; glow: string }
> = {
  common: {
    card: "bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800",
    badge: "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
    ring: "ring-slate-200 dark:ring-slate-800",
    glow: "shadow-[0_0_24px_-12px_rgba(100,116,139,0.35)]",
  },
  rare: {
    card: "bg-sky-50 border-sky-200 dark:bg-sky-900/30 dark:border-sky-800/50",
    badge: "bg-sky-200 text-sky-900 dark:bg-sky-800 dark:text-sky-100",
    ring: "ring-sky-200 dark:ring-sky-800/60",
    glow: "shadow-[0_0_28px_-10px_rgba(56,189,248,0.45)]",
  },
  epic: {
    card: "bg-violet-50 border-violet-200 dark:bg-violet-900/30 dark:border-violet-800/50",
    badge:
      "bg-violet-200 text-violet-900 dark:bg-violet-800 dark:text-violet-100",
    ring: "ring-violet-200 dark:ring-violet-800/60",
    glow: "shadow-[0_0_28px_-10px_rgba(167,139,250,0.5)]",
  },
  legend: {
    card: "bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800/50",
    badge: "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100",
    ring: "ring-amber-200 dark:ring-amber-800/60",
    glow: "shadow-[0_0_32px_-10px_rgba(245,158,11,0.55)]",
  },
};

function buildEntityImageUrl(rarity: string | null, id: string) {
  const r = normalizeRarity(rarity);
  return `/aquarium/${r}/${id}.png`;
}

function RarityBadge({ rarity }: { rarity?: string | null }) {
  const r = normalizeRarity(rarity);
  const sty = rarityStyle[r];
  const label = r.replace(/^[a-z]/, (c) => c.toUpperCase());
  return (
    <Badge variant="outline" className={cn("border", sty.badge)}>
      {label}
    </Badge>
  );
}

type Props = {
  limit?: number;
  speed?: number; // px/sec
  pauseOnHover?: boolean;
  className?: string;
  /** 자동 접힘 타이머: null이면 비활성 */
  autoCollapseAfter?: number | null;
};

export default function NewSpeciesBanner({
  limit = 30,
  speed = 24,
  pauseOnHover = false,
  className,
  autoCollapseAfter = null,
}: Props) {
  // Data
  const [rows, setRows] = useState<FeaturedRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  // UI States (기본 접힘)
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    getLS<boolean>("nsb:collapsed", true)
  );
  const [filterRarity, setFilterRarity] = useState<RarityKey | "all">(() =>
    getLS("nsb:filter", "all")
  );
  const [unseenCount, setUnseenCount] = useState<number>(0);

  // Scroller refs
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isFocusedRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);

  // Fetch
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("v_aquarium_featured")
        .select("*")
        .limit(limit);
      if (!alive) return;
      const list = error ? [] : (data as FeaturedRow[]) ?? [];
      setRows(list);
      setLoading(false);

      // unseen 계산 (lastSeenAt 기반)
      const newest = list.reduce<string | null>((acc, r) => {
        const t = r.created_at ? new Date(r.created_at).toISOString() : null;
        if (!t) return acc;
        return !acc || t > acc ? t : acc;
      }, null);
      const lastSeenAt = getLS<string | null>("nsb:lastSeenAt", null);
      if (newest && (!lastSeenAt || newest > lastSeenAt)) {
        const n = list.filter((r) =>
          lastSeenAt ? new Date(r.created_at) > new Date(lastSeenAt) : true
        ).length;
        setUnseenCount(n);
      }
    })();
    return () => {
      alive = false;
    };
  }, [limit]);

  // Auto collapse (옵션)
  useEffect(() => {
    if (collapsed || autoCollapseAfter == null) return;
    const id = window.setTimeout(() => {
      setCollapsed(true);
      persistStates({ collapsed: true });
    }, autoCollapseAfter);
    return () => window.clearTimeout(id);
  }, [collapsed, autoCollapseAfter]);

  const list = rows ?? [];

  // Filtered list
  const filtered = useMemo(() => {
    if (filterRarity === "all") return list;
    return list.filter((r) => normalizeRarity(r.rarity) === filterRarity);
  }, [list, filterRarity]);

  // Loop list (marquee effect)
  const loopList = useMemo(() => [...filtered, ...filtered], [filtered]);

  // Scroller helpers
  const reinitPosition = () => {
    const vp = viewportRef.current;
    const track = trackRef.current;
    if (!vp || !track) return;
    setTranslateX(track, 0);
    const half = track.scrollWidth / 2;
    if (half > 0) vp.scrollLeft = Math.max(0, Math.floor(half / 2));
  };

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const onResize = () => reinitPosition();
    const ro =
      "ResizeObserver" in window
        ? new ResizeObserver(() => reinitPosition())
        : null;

    const imgLoadHandler = () => reinitPosition();
    const bindImgListeners = () => {
      const imgs = Array.from(vp.querySelectorAll("img"));
      imgs.forEach((img) =>
        img.addEventListener("load", imgLoadHandler, { once: true })
      );
      return () => {
        imgs.forEach((img) =>
          img.removeEventListener("load", imgLoadHandler as any)
        );
      };
    };

    const unbind = bindImgListeners();
    window.addEventListener("resize", onResize);
    ro?.observe?.(vp);
    reinitPosition();

    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect?.();
      unbind();
    };
  }, [loopList.length]);

  useEffect(() => {
    const step = (ts: number) => {
      const vp = viewportRef.current;
      const track = trackRef.current;

      if (!vp || !track) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      const canAuto =
        !isDraggingRef.current &&
        !(pauseOnHover && isHoveredRef.current) &&
        !isFocusedRef.current &&
        speed > 0;

      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.max(0, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      if (canAuto) {
        if (Math.abs(getTranslateX(track)) > 0.5) setTranslateX(track, 0);

        const trackW = track.scrollWidth || 0;
        const hasOverflow = trackW > vp.clientWidth + 1;

        if (hasOverflow) {
          const half = trackW / 2;
          vp.scrollLeft += speed * dt;
          if (vp.scrollLeft >= half) vp.scrollLeft -= half;
          if (vp.scrollLeft < 0) vp.scrollLeft += half;
        } else {
          const nowX = getTranslateX(track);
          const amplitude = Math.max(
            16,
            Math.min(64, Math.round(vp.clientWidth * 0.08))
          );
          const drift = speed * 0.6 * dt;
          const nextX = wrapPingPong(nowX - drift, -amplitude, amplitude);
          setTranslateX(track, nextX);
        }
      }

      rafRef.current = requestAnimationFrame(step);
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else {
        if (!rafRef.current) {
          lastTsRef.current = 0;
          rafRef.current = requestAnimationFrame(step);
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    lastTsRef.current = 0;
    queueMicrotask(reinitPosition);
    rafRef.current = requestAnimationFrame(step);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [speed, pauseOnHover, loopList.length]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const vp = viewportRef.current;
    if (!vp) return;
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startScrollLeftRef.current = vp.scrollLeft;
    vp.setPointerCapture?.(e.pointerId);
    (vp as any).style.scrollBehavior = "auto";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const vp = viewportRef.current;
    const track = trackRef.current;
    if (!vp || !track) return;
    const dx = e.clientX - startXRef.current;
    vp.scrollLeft = startScrollLeftRef.current - dx;

    const half = (track.scrollWidth || 0) / 2;
    if (half > 0) {
      if (vp.scrollLeft >= half) vp.scrollLeft -= half;
      if (vp.scrollLeft < 0) vp.scrollLeft += half;
    }
  };

  const onPointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const vp = viewportRef.current;
    if (!vp) return;
    isDraggingRef.current = false;
    try {
      vp.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  // Helpers to persist UI
  function persistStates(
    partial: Partial<{
      collapsed: boolean;
      filter: any;
      lastSeenAt: string;
    }>
  ) {
    if (partial.collapsed !== undefined)
      setLS("nsb:collapsed", partial.collapsed);
    if (partial.filter !== undefined) setLS("nsb:filter", partial.filter);
    if (partial.lastSeenAt !== undefined)
      setLS("nsb:lastSeenAt", partial.lastSeenAt);
  }

  // A11y labels
  const regionLabel = "신규 어종 배너";

  // Loading view
  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <div className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-semibold">신규 출시</span>
          </div>
          <div className="mb-1 text-sm text-muted-foreground">
            새로운 어종들을 만나보세요
          </div>
          <div className="mt-3 flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-48 rounded-xl" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!list.length) return null;

  // 필터 칩 (Glass 제거)
  const Chip = ({
    active,
    children,
    onClick,
    ariaLabel,
  }: {
    active?: boolean;
    children: React.ReactNode;
    onClick?: () => void;
    ariaLabel?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium ring-1 transition",
        active
          ? "bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white"
          : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700",
        "hover:opacity-90"
      )}
    >
      {children}
    </button>
  );

  // 헤더 바 (토글만 남김)
  const headerBar = (
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={!collapsed}
          onClick={() => {
            const next = !collapsed;
            setCollapsed(next);
            persistStates({ collapsed: next });

            // 펼칠 때 신작 카운트 읽음 처리
            if (!next) return;
            const newest = list.reduce<string | null>((acc, r) => {
              const t = r.created_at
                ? new Date(r.created_at).toISOString()
                : null;
              if (!t) return acc;
              return !acc || t > acc ? t : acc;
            }, null);
            if (newest) {
              setUnseenCount(0);
              persistStates({ lastSeenAt: newest });
            }
          }}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold shadow-sm ring-1",
            "bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white"
          )}
        >
          <FontAwesomeIcon icon={faBolt} className="h-3.5 w-3.5" />
          <span>신규 출시</span>
          {unseenCount > 0 && collapsed && (
            <span className="ml-1 rounded-full bg-amber-500 text-white text-[10px] px-2 py-[2px]">
              {unseenCount}
            </span>
          )}
          {collapsed ? (
            <FontAwesomeIcon icon={faChevronDown} className="ml-1 h-3 w-3" />
          ) : (
            <FontAwesomeIcon icon={faChevronUp} className="ml-1 h-3 w-3" />
          )}
        </button>
      </div>

      {/* 오른쪽 컨트롤 전부 제거됨 */}
      <div />
    </div>
  );

  return (
    <Card
      className={cn("overflow-hidden", className)}
      role="region"
      aria-label={regionLabel}
    >
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="p-4 relative transition-all duration-200">
        {headerBar}

        {/* 접힘 상태에서는 카드/트랙 완전 숨김 */}
        {!collapsed && (
          <>
            {/* 필터 칩: md 이상에서만 */}
            <div className="hidden md:flex items-center gap-1 mb-2">
              {(["all", "common", "rare", "epic", "legend"] as const).map(
                (k) => (
                  <Chip
                    key={k}
                    active={filterRarity === k}
                    onClick={() => {
                      setFilterRarity(k as any);
                      persistStates({ filter: k });
                    }}
                    ariaLabel={`희귀도 ${k} 필터`}
                  >
                    {k === "all" ? (
                      <>
                        <FontAwesomeIcon
                          icon={faFilter}
                          className="mr-1 h-3 w-3"
                        />
                        전체
                      </>
                    ) : (
                      <>
                        {(k as string).replace(/^[a-z]/, (c) =>
                          c.toUpperCase()
                        )}
                      </>
                    )}
                  </Chip>
                )
              )}
            </div>

            {/* Track */}
            <div
              ref={viewportRef}
              className={cn(
                "relative overflow-x-scroll no-scrollbar select-none",
                "cursor-grab active:cursor-grabbing touch-pan-x py-2"
              )}
              aria-label="신규 어종 자동 스크롤 배너"
              role="listbox"
              tabIndex={0}
              onKeyDown={(e) => {
                const vp = viewportRef.current;
                const track = trackRef.current;
                if (!vp || !track) return;
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  const delta = Math.round(vp.clientWidth * 0.2);
                  vp.scrollLeft += e.key === "ArrowRight" ? delta : -delta;

                  const half = (track.scrollWidth || 0) / 2;
                  if (half > 0) {
                    if (vp.scrollLeft >= half) vp.scrollLeft -= half;
                    if (vp.scrollLeft < 0) vp.scrollLeft += half;
                  }
                }
              }}
              onFocus={() => (isFocusedRef.current = true)}
              onBlur={() => (isFocusedRef.current = false)}
              onMouseEnter={() => {
                if (pauseOnHover) isHoveredRef.current = true;
              }}
              onMouseLeave={() => {
                if (pauseOnHover) isHoveredRef.current = false;
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUpOrCancel}
              onPointerCancel={onPointerUpOrCancel}
            >
              <div
                ref={trackRef}
                className="flex gap-3 w-max will-change-transform"
              >
                {loopList.map((r, idx) => {
                  const rarity = normalizeRarity(r.rarity);
                  const sty = rarityStyle[rarity];
                  const img = buildEntityImageUrl(rarity, r.entity_id);

                  return (
                    <div
                      key={`${r.entity_id}-${idx}`}
                      role="option"
                      className={cn(
                        "shrink-0 rounded-2xl border transition-transform duration-150 w-64 p-3",
                        "hover:scale-[1.02] focus-within:scale-[1.02]",
                        sty.card,
                        "ring-1 ring-inset",
                        sty.ring,
                        sty.glow
                      )}
                      tabIndex={-1}
                    >
                      <div
                        className={cn(
                          "relative overflow-hidden rounded-xl border bg-background/50",
                          "aspect-video"
                        )}
                      >
                        <img
                          src={img}
                          alt={r.name_ko ?? r.entity_id}
                          className={cn(
                            "absolute inset-0 m-auto max-h-full max-w-full object-contain p-4"
                          )}
                          loading="lazy"
                        />
                        <div className="absolute left-2 top-2">
                          <RarityBadge rarity={rarity} />
                        </div>
                      </div>

                      <div className="mt-2 px-1">
                        <div className="font-medium truncate">
                          {r.name_ko ?? r.entity_id}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {r.description ?? `#${r.entity_id}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

/* ========== utils ========== */
function getTranslateX(el: HTMLElement): number {
  const style = window.getComputedStyle(el);
  const matrix = style.transform || "matrix(1, 0, 0, 1, 0, 0)";
  const matched = matrix.match(/matrix\(([^)]+)\)/);
  if (!matched) return 0;
  const parts = matched[1].split(",").map((v) => parseFloat(v.trim()));
  return parts.length >= 6 && Number.isFinite(parts[4]) ? parts[4] : 0;
}

function setTranslateX(el: HTMLElement, x: number) {
  el.style.transform = `translateX(${x}px)`;
}

/** -limit ~ +limit 사이 왕복 */
function wrapPingPong(x: number, min: number, max: number) {
  if (min >= max) return 0;
  const range = max - min;
  let t = (x - min) % (2 * range);
  if (t < 0) t += 2 * range;
  return t <= range ? min + t : max - (t - range);
}

// localStorage helpers
function getLS<T = any>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setLS(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
