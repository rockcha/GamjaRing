// src/components/widgets/Cards/NewSpeciesBanner.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt } from "@fortawesome/free-solid-svg-icons";

/** View row from v_aquarium_featured */
type FeaturedRow = {
  created_at: string;
  entity_id: string;
  name_ko: string | null;
  rarity: string | null;
  price: number | null;
  size: number | null;
  description: string | null;
};

type RarityKey = "common" | "rare" | "epic" | "legend";

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
  { card: string; badge: string; ring: string }
> = {
  common: {
    card: "bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800",
    badge: "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
    ring: "ring-slate-200 dark:ring-slate-800",
  },
  rare: {
    card: "bg-sky-50 border-sky-200 dark:bg-sky-900/30 dark:border-sky-800/50",
    badge: "bg-sky-200 text-sky-900 dark:bg-sky-800 dark:text-sky-100",
    ring: "ring-sky-200 dark:ring-sky-800/60",
  },
  epic: {
    card: "bg-violet-50 border-violet-200 dark:bg-violet-900/30 dark:border-violet-800/50",
    badge:
      "bg-violet-200 text-violet-900 dark:bg-violet-800 dark:text-violet-100",
    ring: "ring-violet-200 dark:ring-violet-800/60",
  },
  legend: {
    card: "bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800/50",
    badge: "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100",
    ring: "ring-amber-200 dark:ring-amber-800/60",
  },
};

function buildEntityImageUrl(rarity: string | null, id: string) {
  const r = normalizeRarity(rarity);
  return `/aquarium/${r}/${id}.png`;
}

function RarityBadge({ rarity }: { rarity?: string | null }) {
  const r = normalizeRarity(rarity);
  const sty = rarityStyle[r];
  const label = r.replace(/^\w/, (c) => c.toUpperCase());
  return (
    <Badge variant="outline" className={cn("border", sty.badge)}>
      {label}
    </Badge>
  );
}

export default function NewSpeciesBanner({
  limit = 30,
  speed = 24, // 기본 속도 살짝 상향
  pauseOnHover = false, // 호버 일시정지 원하면 true로
  className,
}: {
  limit?: number;
  speed?: number; // px/sec
  pauseOnHover?: boolean;
  className?: string;
}) {
  const [rows, setRows] = useState<FeaturedRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isFocusedRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("v_aquarium_featured")
        .select("*")
        .limit(limit);
      if (!alive) return;
      setRows(error ? [] : (data as FeaturedRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [limit]);

  const list = rows ?? [];
  const loopList = useMemo(() => [...list, ...list], [list]);

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
          // 오버플로우 없어도 확실히 보이게 왕복
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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
  };

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <div className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-semibold">신규 어종</span>
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

  return (
    <Card className={cn("overflow-hidden", className)}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="p-4 relative">
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-3 -top-2 h-16 rounded-2xl",
            "bg-gradient-to-b from-black/15 via-black/8 to-transparent",
            "dark:from-slate-950/40 dark:via-slate-950/25 dark:to-transparent",
            "backdrop-blur-[2px]"
          )}
        />

        <div className="mb-2 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
              "text-white shadow-sm ring-1 ring-white/15",
              "bg-gradient-to-r from-slate-900/75 via-slate-900/60 to-slate-900/75",
              "backdrop-blur-md"
            )}
          >
            <FontAwesomeIcon icon={faBolt} className="h-3.5 w-3.5" />
            <span>새로운 카드 출시!</span>
          </span>
        </div>

        <div
          ref={viewportRef}
          className={cn(
            "relative overflow-x-scroll no-scrollbar select-none",
            "cursor-grab active:cursor-grabbing",
            "touch-pan-x"
          )}
          aria-label="신규 어종 자동 스크롤 배너"
          role="listbox"
          tabIndex={0}
          onKeyDown={onKeyDown}
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
            className="flex gap-3 py-1 w-max will-change-transform"
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
                    "w-56 shrink-0 rounded-2xl border p-2 transition-transform",
                    "hover:scale-[1.02] focus-within:scale-[1.02]",
                    sty.card,
                    "ring-1 ring-inset",
                    sty.ring
                  )}
                  tabIndex={-1}
                >
                  <div className="relative aspect-[5/3] overflow-hidden rounded-xl border bg-background/50">
                    <img
                      src={img}
                      alt={r.name_ko ?? r.entity_id}
                      className="absolute inset-0 m-auto max-h-full max-w-full object-contain p-3"
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

        <div className="mt-2 flex justify-between items-center gap-2">
          <div className="text-[11px] bg-white/80 rounded-xl text-muted-foreground px-3 py-1">
            {pauseOnHover
              ? "마우스를 올리면 일시정지돼요."
              : "천천히 자동으로 이동합니다. 드래그로도 넘길 수 있어요."}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* utils */
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
