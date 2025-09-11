// src/features/aquarium/AquariumBox.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FISH_BY_ID } from "./fishes";
import FishSprite from "./FishSprite";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import AquariumDetailButton from "./AquariumDetailButton";

type Slot = { key: string; id: string; leftPct: number; topPct: number };
type SellPayload = { index: number; fishId: string; sellPrice: number };

// (참고용 상수이지만 초기 표시엔 쓰지 않음)
const BASE_THEME_ID = 12;
const BASE_THEME_TITLE = "수중 정원";
const themeImageUrl = (title: string) =>
  `/aquarium/themes/${encodeURIComponent(title)}.png`;

/* ── 유틸 ─────────────────────────────────────────────── */
function randInRange(min: number, max: number) {
  if (max < min) [min, max] = [max, min];
  return min + Math.random() * (max - min);
}
function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function SpawnBurst({ leftPct, topPct }: { leftPct: number; topPct: number }) {
  const particles = Array.from({ length: 18 }).map((_, i) => ({
    id: i,
    dx: Math.random() * 48 - 24,
    dy: Math.random() * -48 - 12,
    delay: Math.random() * 140,
    scale: 0.8 + Math.random() * 1.2,
    char: ["💦", "✨", "🐟", "💧"][Math.floor(Math.random() * 4)],
  }));

  return (
    <>
      <div
        className="absolute pointer-events-none will-change-transform transform-gpu"
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          transform: "translate(-50%, -50%) translateZ(0)",
        }}
      >
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: 0, top: 0 }}
        >
          <div className="w-12 h-12 rounded-full border-2 border-white/60 animate-[ringPulse_800ms_ease-out_forwards]" />
          <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-white/40 animate-[ringPulse_1000ms_ease-out_forwards]" />
          <div className="absolute inset-0 w-28 h-28 rounded-full border-2 border-white/20 animate-[ringPulse_1200ms_ease-out_forwards]" />
        </div>

        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute text-[18px] will-change-transform transform-gpu opacity-0"
            style={{
              left: 0,
              top: 0,
              animation: `burst 820ms ease-out ${p.delay}ms forwards`,
              transform: `translateZ(0) translate(0,0) scale(${p.scale})`,
              ["--dx" as any]: `${p.dx}px`,
              ["--dy" as any]: `${p.dy}px`,
            }}
          >
            {p.char}
          </span>
        ))}
      </div>

      <style>
        {`
          @keyframes ringPulse {
            0%   { opacity: .6; transform: translateZ(0) scale(0.6); }
            100% { opacity: 0;  transform: translateZ(0) scale(1.6); }
          }
          @keyframes burst {
            0%   { opacity: 0; transform: translateZ(0) translate(0,0) scale(0.7); }
            25%  { opacity: 1; }
            100% { opacity: 0; transform: translateZ(0) translate(var(--dx,0), var(--dy,0)) scale(1); }
          }
          @keyframes popIn {
            0%   { opacity: 0; transform: scale(0.6) rotate(-8deg); filter: blur(4px); }
            60%  { opacity: 1; transform: scale(1.1) rotate(2deg);  filter: blur(0); }
            100% { opacity: 1; transform: scale(1)   rotate(0deg); }
          }
        `}
      </style>
    </>
  );
}

export default function AquariumBox({
  fishIds: fishIdsProp,
  isLoading: isLoadingProp = false,
  loadingText,
  onSell,
  readOnly = false,
  aspectRatio = "800 / 410",
  fitToContainer = false,
  showDetailButton = true,
}: {
  fishIds?: string[];
  isLoading?: boolean;
  loadingText?: string;
  onSell?: (payload: SellPayload) => Promise<void> | void;
  readOnly?: boolean;
  aspectRatio?: string;
  fitToContainer?: boolean;
  showDetailButton?: boolean;
}) {
  const { couple, fetchCoupleData } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [fishIdsInternal, setFishIdsInternal] = useState<string[]>([]);

  const [loadingInternal, setLoadingInternal] = useState(false);

  // ✅ 테마 상태
  const [themeTitle, setThemeTitle] = useState<string | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgReady, setBgReady] = useState(false);
  const [themeLoading, setThemeLoading] = useState(false);

  const fishIds = fishIdsProp ?? fishIdsInternal;
  const isLoading = isLoadingProp || loadingInternal;

  const [themeRefreshTick, setThemeRefreshTick] = useState(0);
  useEffect(() => {
    const handler = () => setThemeRefreshTick((n) => n + 1);
    window.addEventListener("aquarium-theme-applied", handler);
    return () => window.removeEventListener("aquarium-theme-applied", handler);
  }, []);

  /* ── DB: 어항 물고기/브리드 카운트 ───────────────────── */
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (fishIdsProp) return; // 외부 주입 모드
      if (!coupleId) {
        setFishIdsInternal([]);

        return;
      }
      try {
        setLoadingInternal(true);
        const { data, error } = await supabase
          .from("couple_aquarium")
          .select("aquarium_fishes")
          .eq("couple_id", coupleId)
          .maybeSingle();

        if (!mounted) return;

        if (error || !data) {
          await supabase
            .from("couple_aquarium")
            .upsert(
              { couple_id: coupleId, aquarium_fishes: [] },
              { onConflict: "couple_id" }
            );
          setFishIdsInternal([]);
        } else {
          const arr = Array.isArray(data.aquarium_fishes)
            ? (data.aquarium_fishes as string[])
            : [];
          setFishIdsInternal(arr);
        }
      } finally {
        if (mounted) setLoadingInternal(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [coupleId, fishIdsProp]);

  /* ── DB: 테마 로드 (theme_id → title → 이미지 URL) ───── */
  useEffect(() => {
    let mounted = true;

    (async () => {
      setThemeLoading(true);
      setBgReady(false);
      setBgUrl(null);
      setThemeTitle(null);

      try {
        if (!coupleId) return;

        const cur = await supabase
          .from("couple_aquarium")
          .select("theme_id")
          .eq("couple_id", coupleId)
          .maybeSingle();

        let themeId = cur.data?.theme_id as number | null;

        if (!Number.isFinite(themeId)) themeId = BASE_THEME_ID;

        const th = await supabase
          .from("aquarium_themes")
          .select("title")
          .eq("id", themeId!)
          .maybeSingle();

        const title =
          th.data?.title && typeof th.data.title === "string"
            ? th.data.title
            : BASE_THEME_TITLE;

        if (!mounted) return;

        setThemeTitle(title);
        setBgUrl(themeImageUrl(title));
      } catch {
        if (!mounted) return;
        setThemeTitle("이미지 로드 실패");
        setBgUrl(
          "data:image/svg+xml;utf8," +
            encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1536 1024'><rect width='100%' height='100%' fill='#0ea5e9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='28'>테마 이미지를 불러오지 못했어요</text></svg>`
            )
        );
        setBgReady(true);
      } finally {
        setThemeLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [coupleId, themeRefreshTick]);

  /** 외부에서도 부를 수 있게 새로고침 함수 노출 */
  const refreshFromDB = async () => {
    if (!coupleId) return;
    const { data } = await supabase
      .from("couple_aquarium")
      .select("aquarium_fishes")
      .eq("couple_id", coupleId)
      .maybeSingle();
    const arr = Array.isArray(data?.aquarium_fishes)
      ? (data!.aquarium_fishes as string[])
      : [];
    setFishIdsInternal(arr);

    await fetchCoupleData?.();
  };

  /* ── 보유수/슬롯/연출 ───────────────────────────────── */
  const countsById = useMemo(() => {
    const m = new Map<string, number>();
    for (const id of fishIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [fishIds]);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [appearingKeys, setAppearingKeys] = useState<string[]>([]);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  useEffect(() => {
    setSlots((prev) => {
      const next: Slot[] = [];
      for (let i = 0; i < fishIds.length; i++) {
        const id = fishIds[i] as string;
        if (!id) continue;

        const key = `${id}-${i}`;
        const found = prev.find((s) => s.key === key);
        if (found) {
          next.push(found);
        } else {
          const fish = FISH_BY_ID[id];
          const [minY, maxY] = fish?.swimY ?? [10, 90];
          const safeMinY = clamp(minY, 0, 100);
          const safeMaxY = clamp(maxY, 0, 100);
          const topPct = clamp(randInRange(safeMinY, safeMaxY), 0, 100);

          const size = fish?.size ?? 1;
          const sidePad = Math.min(8 + size * 2, 12);
          const leftPct = clamp(randInRange(sidePad, 100 - sidePad), 0, 100);

          next.push({ key, id, leftPct, topPct });
        }
      }
      return next;
    });
  }, [fishIds]);

  useEffect(() => {
    if (fishIds.length === 0) return;
    const lastKey = `${fishIds[fishIds.length - 1]}-${fishIds.length - 1}`;
    setAppearingKeys((p) => [...p, lastKey]);
    const t = setTimeout(
      () => setAppearingKeys((p) => p.filter((k) => k !== lastKey)),
      900
    );
    return () => clearTimeout(t);
  }, [fishIds]);

  /* ── 컨테이너 스케일 계산 ───────────────────────────── */
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerScale, setContainerScale] = useState(1); // 기준 800px

  useEffect(() => {
    if (!fitToContainer) return;
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const width = rect.width;
      const scale = Math.max(0.8, Math.min(2.0, width / 800));
      setContainerScale(scale);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [fitToContainer]);

  /* ── 드래그 (롱프레스 없이 즉시 시작) ─────────────────── */
  const [dragKey, setDragKey] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ ox: number; oy: number }>({ ox: 0, oy: 0 });

  const getPointerPct = (evt: MouseEvent | TouchEvent) => {
    const el = containerRef.current;
    if (!el) return { xPct: 0, yPct: 0 };
    const rect = el.getBoundingClientRect();

    let clientX: number, clientY: number;
    if ("touches" in evt) {
      const t = evt.touches[0] ?? evt.changedTouches[0];
      clientX = t?.clientX ?? 0;
      clientY = t?.clientY ?? 0;
    } else {
      clientX = (evt as MouseEvent).clientX;
      clientY = (evt as MouseEvent).clientY;
    }

    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    return { xPct: x, yPct: y };
  };

  const startDrag = (
    key: string,
    e: React.MouseEvent | React.TouchEvent,
    slot: Slot
  ) => {
    if (readOnly) return;
    setDragKey(key);
    const native = e.nativeEvent as any as MouseEvent | TouchEvent;
    const { xPct, yPct } = getPointerPct(native);
    dragOffsetRef.current = { ox: xPct - slot.leftPct, oy: yPct - slot.topPct };
  };

  const handleMoveWhileDrag = (evt: MouseEvent | TouchEvent) => {
    if (!dragKey) return;
    if ("touches" in evt) evt.preventDefault(); // 모바일 스크롤 방지
    const { xPct, yPct } = getPointerPct(evt);
    const { ox, oy } = dragOffsetRef.current;
    const nx = clamp(xPct - ox, 0, 100);
    const ny = clamp(yPct - oy, 0, 100);
    setSlots((prev) =>
      prev.map((s) =>
        s.key === dragKey ? { ...s, leftPct: nx, topPct: ny } : s
      )
    );
  };

  const endDrag = () => setDragKey(null);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => handleMoveWhileDrag(e);
    const onUp = () => endDrag();

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchcancel", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove as any);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("touchcancel", onUp);
    };
  }, [dragKey]);

  /* ── 로딩 화면(물고기 데이터) ───────────────────────── */
  if (isLoading) {
    return (
      <div className="w-full">
        <div
          className="relative rounded-xl overflow-hidden mx-auto"
          style={{ height: "73vh", width: "min(100%, calc(73vh * 1.5))" }}
        >
          <div className="absolute inset-0 bg-slate-200 dark:bg-zinc-800 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-4 py-2 rounded-lg bg-white/70 text-slate-700 font-medium shadow">
              {loadingText ?? "🫧 어항 준비중 …"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showBgSkeleton = themeLoading || !bgUrl || !bgReady;

  return (
    <div className="w-full">
      {/* 드래그 시 애니메이션 일시정지용 전역 스타일 */}
      <style>{`.drag-pause * { animation-play-state: paused !important; }`}</style>

      {/* 1536×1024 (3:2) 비율, 높이 75vh */}
      <div
        ref={containerRef}
        className={`relative rounded-xl overflow-hidden will-change-transform transform-gpu mx-auto  ${
          dragKey ? "cursor-grabbing select-none" : ""
        }`}
        style={{ height: "74vh", width: "min(100%, calc(85vw ))" }}
      >
        {/* 좌상단 상세보기 버튼 (판매 후 콜백으로 새로고침) */}
        {showDetailButton && (
          <div className="absolute left-2 top-2 z-20">
            <AquariumDetailButton onChanged={refreshFromDB} />
          </div>
        )}

        {/* 배경 이미지 */}
        {bgUrl && (
          <img
            src={bgUrl}
            alt={themeTitle ?? ""}
            className="absolute inset-0 w-full h-full object-cover z-0"
            onLoad={() => setBgReady(true)}
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              el.style.opacity = "0.9";
              el.src =
                "data:image/svg+xml;utf8," +
                encodeURIComponent(
                  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1536 1024'><rect width='100%' height='100%' fill='#0ea5e9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='28'>테마 이미지를 불러오지 못했어요</text></svg>`
                );
              setBgReady(true);
            }}
          />
        )}

        {/* 이미지 로딩 전 스켈레톤 */}
        {showBgSkeleton && (
          <div className="absolute inset-0 bg-slate-200 dark:bg-zinc-800 animate-pulse" />
        )}

        {/* 물고기/이펙트 레이어 */}
        <div
          className={` 
            readOnly ? "absolute inset-0 pointer-events-none" 
          }`}
        >
          {slots.map((slot) => {
            const fish = FISH_BY_ID[slot.id];
            if (!fish) return null;
            const isAppearing = appearingKeys.includes(slot.key);
            const isHovered = hoverKey === slot.key;
            const isDragging = dragKey === slot.key;

            // 즉시 드래그 시작 (모달 오픈 로직 제거)
            const eventProps = {
              onMouseDown: (e: React.MouseEvent) =>
                startDrag(slot.key, e, slot),
              onTouchStart: (e: React.TouchEvent) =>
                startDrag(slot.key, e, slot),
              onMouseUp: () => endDrag(),
              onTouchEnd: () => endDrag(),
            };

            return (
              <div
                key={slot.key}
                {...eventProps}
                onMouseEnter={() => setHoverKey(slot.key)}
                onMouseLeave={() => setHoverKey(null)}
                className={`${
                  isDragging ? "drag-pause cursor-grabbing" : "cursor-pointer"
                }`}
                style={{ touchAction: "none" }}
              >
                {isAppearing && (
                  <SpawnBurst leftPct={slot.leftPct} topPct={slot.topPct} />
                )}
                <FishSprite
                  fish={fish}
                  overridePos={{ leftPct: slot.leftPct, topPct: slot.topPct }}
                  popIn={isAppearing}
                  isHovered={isHovered || isDragging}
                  containerScale={fitToContainer ? containerScale : 1}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
