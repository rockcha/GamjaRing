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
  rarity: string | null; // can be Korean or English
  price: number | null;
  size: number | null;
  description: string | null;
};

type RarityKey = "common" | "rare" | "epic" | "legend";

/** Normalize rarity: Korean → English keys */
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

/** Rarity-based styles */
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

/** Build public image path: /public/aquarium/<rarity>/<id>.png  */
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
  limit = 12,
  speed = 30, // px/sec (자동 스크롤 속도)
  className,
}: {
  limit?: number;
  speed?: number;
  className?: string;
}) {
  const [rows, setRows] = useState<FeaturedRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  // ▼ 스크롤/드래그 제어
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);
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
      if (error) {
        console.error(error);
        setRows([]);
      } else {
        setRows((data as FeaturedRow[]) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [limit]);

  const list = rows ?? [];
  const loopList = useMemo(() => [...list, ...list], [list]);

  // 초기 위치 세팅 + rAF 루프 시작
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const init = () => {
      // 콘텐츠가 2배로 복제되므로 절반 중앙 근처로 위치
      const half = vp.scrollWidth / 2;
      if (half > 0) {
        // 뷰포트 가운데쯤으로 위치시키면 앞/뒤로 자연스럽게 드래그 가능
        vp.scrollLeft = half / 2;
      }
    };

    // 이미지 로딩 이후에도 한번 더 보정
    const imgLoadHandler = () => init();
    vp.querySelectorAll("img").forEach((img) =>
      img.addEventListener("load", imgLoadHandler, { once: true })
    );

    init();

    const step = (ts: number) => {
      const vpNow = viewportRef.current;
      if (!vpNow) return;

      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      const canAuto =
        !isHoveredRef.current &&
        !isDraggingRef.current &&
        vpNow.scrollWidth > vpNow.clientWidth;

      if (canAuto && speed > 0) {
        vpNow.scrollLeft += speed * dt; // 자동 스크롤
        // 무한 루프 보정
        const half = vpNow.scrollWidth / 2;
        if (vpNow.scrollLeft >= half) vpNow.scrollLeft -= half;
        if (vpNow.scrollLeft < 0) vpNow.scrollLeft += half;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loopList.length, speed]);

  // 포인터 드래그 핸들러
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
    if (!vp) return;

    const dx = e.clientX - startXRef.current;
    vp.scrollLeft = startScrollLeftRef.current - dx;

    // 무한 루프 보정
    const half = vp.scrollWidth / 2;
    if (vp.scrollLeft >= half) vp.scrollLeft -= half;
    if (vp.scrollLeft < 0) vp.scrollLeft += half;
  };

  const onPointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const vp = viewportRef.current;
    if (!vp) return;
    isDraggingRef.current = false;
    try {
      vp.releasePointerCapture?.(e.pointerId);
    } catch {}
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

  // 카드 너비/갭은 스타일로 처리 (자동 스크롤은 JS가 수행)
  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* component-scoped styles */}
      <style>{`
        /* 스크롤바 숨김 */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="p-4 relative">
        {/* 상단 가독성 강화용 그라데이션 띠 */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-3 -top-2 h-16 rounded-2xl",
            "bg-gradient-to-b from-black/15 via-black/8 to-transparent",
            "dark:from-slate-950/40 dark:via-slate-950/25 dark:to-transparent",
            "backdrop-blur-[2px]"
          )}
        />

        {/* 제목 캡션 배지 */}
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

        {/* viewport (가로 스크롤 + 드래그) */}
        <div
          ref={viewportRef}
          className={cn(
            "relative overflow-x-scroll no-scrollbar select-none",
            "cursor-grab active:cursor-grabbing",
            "touch-pan-x"
          )}
          aria-label="신규 어종 자동 스크롤 배너"
          role="listbox"
          onMouseEnter={() => (isHoveredRef.current = true)}
          onMouseLeave={() => (isHoveredRef.current = false)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUpOrCancel}
          onPointerCancel={onPointerUpOrCancel}
        >
          {/* track: 2배 복제로 무한 루프 구현 */}
          <div className="flex gap-3 py-1 w-max">
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
                  tabIndex={0}
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
          <div className="text-[11px] text-neutral-500">
            드래그해서 이동할 수 있어요.
          </div>
          <div className="text-[11px] bg-white/80 rounded-xl text-muted-foreground px-3 py-1">
            배너에 마우스를 올리면 일시정지됩니다.
          </div>
        </div>
      </div>
    </Card>
  );
}
