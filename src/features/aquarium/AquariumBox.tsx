// src/features/aquarium/AquariumBox.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import FishSprite from "./FishSprite";

/* ---------- types ---------- */
type Slot = { key: string; id: string; leftPct: number; topPct: number };

type EntityRow = {
  id: string;
  name_ko: string | null;
  rarity: string | null;
  size: number | null;
  swim_y: [number, number] | null;
  is_movable: boolean | null;
};

type InvRow = {
  id?: string; // 인벤토리 고유 id (1행=1마리)
  entity_id: string; // 렌더에 사용할 엔티티 id
  created_at?: string;
};

/* ---------- utils ---------- */
function randInRange(min: number, max: number) {
  if (max < min) [min, max] = [max, min];
  return min + Math.random() * (max - min);
}
function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}
const themeImageUrl = (title: string) =>
  `/aquarium/themes/${encodeURIComponent(title)}.png`;

/** 희귀도 → 폴더명 매핑 (ko/en 모두 허용) */
function rarityToFolder(
  r?: string | null
): "common" | "rare" | "epic" | "legend" {
  const x = (r ?? "").trim().toLowerCase();
  if (x === "희귀" || x === "rare") return "rare";
  if (x === "에픽" || x === "epic") return "epic";
  if (x === "전설" || x === "legend" || x === "legendary") return "legend";
  return "common"; // 기본값
}
/** 엔티티 → 이미지 경로 생성 */
function entityImagePath(ent: Pick<EntityRow, "id" | "rarity">) {
  const folder = rarityToFolder(ent.rarity);
  return `/aquarium/${folder}/${encodeURIComponent(ent.id)}.png`;
}

export default function AquariumBox({
  tankNo,
  fitToContainer = false,
}: {
  tankNo: number;
  fitToContainer?: boolean;
}) {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  /** 테마(배경) */
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgReady, setBgReady] = useState(false);
  const [themeLoading, setThemeLoading] = useState(false);

  /** 인벤토리/엔티티 */
  const [invRows, setInvRows] = useState<InvRow[]>([]);
  const [entityMap, setEntityMap] = useState<Record<string, EntityRow>>({});
  const [loading, setLoading] = useState(false);

  /** 위치/인터랙션 */
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appearingKeys, setAppearingKeys] = useState<string[]>([]);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ ox: number; oy: number }>({ ox: 0, oy: 0 });

  /** 컨테이너 스케일 */
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerScale, setContainerScale] = useState(1);

  useEffect(() => {
    if (!fitToContainer) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setContainerScale(Math.max(0.8, Math.min(2.0, rect.width / 800)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitToContainer]);

  /* ======== 1) 이 탱크의 theme_id로만 배경 로드 ======== */
  useEffect(() => {
    (async () => {
      setThemeLoading(true);
      setBgReady(false);
      setBgUrl(null);
      try {
        if (!coupleId || !tankNo) return;

        const { data: tank, error: tErr } = await supabase
          .from("aquarium_tanks")
          .select("theme_id")
          .eq("couple_id", coupleId)
          .eq("tank_no", tankNo)
          .maybeSingle();
        if (tErr) throw tErr;

        const themeId = tank?.theme_id;
        if (themeId == null) {
          setBgUrl(
            "data:image/svg+xml;utf8," +
              encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1536 1024'><rect width='100%' height='100%' fill='#0284c7'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='28'>이 탱크에 테마가 설정되지 않았어요</text></svg>`
              )
          );
          setBgReady(true);
          return;
        }

        const { data: th, error: thErr } = await supabase
          .from("aquarium_themes")
          .select("title")
          .eq("id", themeId)
          .maybeSingle();
        if (thErr) throw thErr;

        if (th?.title) setBgUrl(themeImageUrl(th.title));
        else {
          setBgUrl(
            "data:image/svg+xml;utf8," +
              encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1536 1024'><rect width='100%' height='100%' fill='#0ea5e9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='28'>테마 정보를 찾을 수 없어요</text></svg>`
              )
          );
          setBgReady(true);
        }
      } catch {
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
  }, [coupleId, tankNo]);

  /* ======== 2) 인벤토리(1행=1마리) & 엔티티 ======== */
  const loadTank = useCallback(async () => {
    if (!coupleId || !tankNo) return;
    setLoading(true);
    try {
      const { data: inv, error: invErr } = await supabase
        .from("couple_aquarium_inventory")
        .select("id, entity_id, created_at")
        .eq("couple_id", coupleId)
        .eq("tank_no", tankNo)
        .order("created_at", { ascending: true });
      if (invErr) throw invErr;

      const rows: InvRow[] = (inv ?? []).map((r: any) => ({
        id: r.id ?? undefined,
        entity_id: String(r.entity_id),
        created_at: r.created_at ?? undefined,
      }));
      setInvRows(rows);

      const ids = Array.from(new Set(rows.map((r) => r.entity_id)));
      if (ids.length === 0) {
        setEntityMap({});
        return;
      }
      const { data: ents, error: entErr } = await supabase
        .from("aquarium_entities")
        .select("id, name_ko, rarity, size, swim_y, is_movable")
        .in("id", ids);
      if (entErr) throw entErr;

      const map: Record<string, EntityRow> = {};
      for (const row of ents ?? []) {
        map[String(row.id)] = {
          id: String(row.id),
          name_ko: (row as any).name_ko ?? null,
          rarity: (row as any).rarity ?? null,
          size: (row as any).size ?? null,
          swim_y: (row as any).swim_y ?? null,
          is_movable: (row as any).is_movable ?? null,
        };
      }
      setEntityMap(map);
    } catch (e: any) {
      toast.error(`어항 데이터를 불러오지 못했어요: ${e?.message ?? e}`);
      setInvRows([]);
      setEntityMap({});
    } finally {
      setLoading(false);
    }
  }, [coupleId, tankNo]);

  useEffect(() => {
    const onUpd = (e: Event) => {
      const ev = e as CustomEvent<{ coupleId: string; tankNo?: number }>;
      if (!coupleId) return;
      const d = ev.detail;
      if (!d) return;
      if (d.coupleId !== coupleId) return;
      if (d.tankNo && d.tankNo !== tankNo) return;
      // 이 어항의 변경이면 재조회
      loadTank();
    };
    window.addEventListener("aquarium-updated", onUpd as EventListener);
    return () =>
      window.removeEventListener("aquarium-updated", onUpd as EventListener);
  }, [coupleId, tankNo, loadTank]);

  useEffect(() => {
    loadTank();
  }, [loadTank]);

  /* ======== 3) 렌더 리스트 (경로 규칙으로 이미지 구성) ======== */
  const fishes = useMemo(() => {
    return invRows
      .map((row) => entityMap[row.entity_id])
      .filter(Boolean)
      .map((ent) => ({
        id: ent.id,
        labelKo: ent.name_ko ?? ent.id,
        image: entityImagePath(ent), // ✅ 규칙 기반 경로
        rarity: ent.rarity,
        size: ent.size,
        swimY: ent.swim_y,
        isMovable: ent.is_movable,
      }));
  }, [invRows, entityMap]);

  /* ======== 4) 슬롯 배치 ======== */
  useEffect(() => {
    setSlots((prev) => {
      const next: Slot[] = [];
      for (let i = 0; i < fishes.length; i++) {
        const id = fishes[i]!.id;
        const key = `${id}-${i}`;
        const found = prev.find((s) => s.key === key);
        if (found) next.push(found);
        else {
          const ent = entityMap[id];
          const swim = (ent?.swim_y as any) ?? [30, 70];
          const minY = Number(swim?.[0] ?? 30);
          const maxY = Number(swim?.[1] ?? 70);
          const safeMinY = clamp(minY, 0, 100);
          const safeMaxY = clamp(maxY, 0, 100);
          const topPct = clamp(randInRange(safeMinY, safeMaxY), 0, 100);
          const sizeMul = Number(ent?.size ?? 1);
          const sidePad = Math.min(8 + sizeMul * 2, 12);
          const leftPct = clamp(randInRange(sidePad, 100 - sidePad), 0, 100);
          next.push({ key, id, leftPct, topPct });
        }
      }
      return next;
    });
  }, [fishes, entityMap]);

  useEffect(() => {
    if (fishes.length === 0) return;
    const lastKey = `${fishes.at(-1)!.id}-${fishes.length - 1}`;
    setAppearingKeys((p) => [...p, lastKey]);
    const t = setTimeout(
      () => setAppearingKeys((p) => p.filter((k) => k !== lastKey)),
      900
    );
    return () => clearTimeout(t);
  }, [fishes.length]);

  /* ======== 5) 드래그(로컬) ======== */
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
    setDragKey(key);
    const native = e.nativeEvent as any as MouseEvent | TouchEvent;
    const { xPct, yPct } = getPointerPct(native);
    dragOffsetRef.current = { ox: xPct - slot.leftPct, oy: yPct - slot.topPct };
  };
  const handleMoveWhileDrag = (evt: MouseEvent | TouchEvent) => {
    if (!dragKey) return;
    if ("touches" in evt) evt.preventDefault();
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
    window.addEventListener("touchmove", onMove as any, { passive: false });
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

  /* ======== render ======== */
  const showBgSkeleton = themeLoading || !bgUrl || !bgReady;

  return (
    <div className="w-full">
      <style>{`.drag-pause * { animation-play-state: paused !important; }`}</style>

      <div
        ref={containerRef}
        className={cn(
          "relative rounded-xl overflow-hidden will-change-transform transform-gpu mx-auto",
          dragKey ? "cursor-grabbing select-none" : ""
        )}
        style={{ height: "74vh", width: "min(100%, calc(85vw ))" }}
      >
        {/* 배경 */}
        {bgUrl && (
          <img
            src={bgUrl}
            alt=""
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
        {showBgSkeleton && (
          <div className="absolute inset-0 bg-slate-200 dark:bg-zinc-800 animate-pulse z-0" />
        )}

        {/* 물고기 레이어 */}
        <div className="absolute inset-0">
          {loading ? (
            <div className="absolute inset-0 grid place-items-center">
              <div className="px-3 py-1.5 rounded-md bg-white/80 border shadow text-sm">
                어항 청소하는 중...🫧
              </div>
            </div>
          ) : (
            fishes.map((f, i) => {
              const slot = slots[i] ?? {
                key: `${f.id}-${i}`,
                id: f.id,
                leftPct: 50,
                topPct: 50,
              };
              const isAppearing = appearingKeys.includes(slot.key);
              const isHovered = hoverKey === slot.key;
              const isDragging = dragKey === slot.key;

              const ev = {
                onMouseDown: (e: React.MouseEvent) =>
                  startDrag(slot.key, e, slot),
                onTouchStart: (e: React.TouchEvent) =>
                  startDrag(slot.key, e, slot),
                onMouseUp: () => endDrag(),
                onTouchEnd: () => endDrag(),
                onMouseEnter: () => setHoverKey(slot.key),
                onMouseLeave: () => setHoverKey(null),
              };

              return (
                <div
                  key={slot.key}
                  {...ev}
                  className={cn(
                    isDragging ? "drag-pause cursor-grabbing" : "cursor-pointer"
                  )}
                  style={{ touchAction: "none" }}
                >
                  <FishSprite
                    fish={
                      {
                        id: f.id,
                        labelKo: f.labelKo,
                        image: f.image, // ✅ 규칙 경로 사용
                        rarity: f.rarity ?? undefined,
                        size: f.size ?? undefined,
                        swimY: (f.swimY as any) ?? undefined,
                        isMovable: f.isMovable ?? undefined,
                      } as any
                    }
                    overridePos={{ leftPct: slot.leftPct, topPct: slot.topPct }}
                    popIn={isAppearing}
                    isHovered={isHovered || isDragging}
                    containerScale={fitToContainer ? containerScale : 1}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
