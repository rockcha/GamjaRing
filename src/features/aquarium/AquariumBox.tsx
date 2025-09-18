// src/features/aquarium/AquariumBox.tsx
"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import FishSprite, { type SpriteFish } from "./FishSprite";

// ✅ shadcn/ui
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

/* ---------- types ---------- */
type Slot = { leftPct: number; topPct: number };

type EntityRow = {
  id: string;
  name_ko: string | null;
  rarity: string | null;
  size: number | null;
  swim_y: [number, number]; // 0=위, 100=아래 (항상 존재)
  is_movable: boolean | null;
  price: number | null;
  glow_color: string | null; // ← 추가: hue 키워드('none' 기본)
};

type InvRow = {
  id?: string; // ★ 인벤토리 row id (안정 키)
  entity_id: string;
  created_at?: string;
};

type RenderFish = {
  slotKey: string;
  entityId: string;
  labelKo: string;
  image: string;
  rarity: string | null;
  size: number | null;
  swimY: [number, number];
  isMovable: boolean | null;
  price: number | null;
  glowColor: string | null; // ← 추가
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

function rarityToFolder(
  r?: string | null
): "common" | "rare" | "epic" | "legend" {
  const x = (r ?? "").trim().toLowerCase();
  if (x === "희귀" || x === "rare") return "rare";
  if (x === "에픽" || x === "epic") return "epic";
  if (x === "전설" || x === "legend" || x === "legendary") return "legend";
  return "common";
}
function entityImagePath(ent: Pick<EntityRow, "id" | "rarity">) {
  const folder = rarityToFolder(ent.rarity);
  return `/aquarium/${folder}/${encodeURIComponent(ent.id)}.png`;
}

/** Postgres int4range → [number, number] 파서 */
function parseIntRangeToBand(v: unknown): [number, number] | undefined {
  if (!v) return undefined;

  if (Array.isArray(v) && v.length >= 2) {
    const a = Number(v[0]),
      b = Number(v[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
    return [a, b];
  }
  if (typeof v === "object" && v !== null) {
    const lo = (v as any).lower;
    const up = (v as any).upper;
    const bounds = (v as any).bounds;
    if (lo != null && up != null) {
      let a = Number(lo),
        b = Number(up);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
      if (typeof bounds === "string") {
        if (bounds[0] === "(") a += 1;
        if (bounds[1] === ")") b -= 1;
      }
      return [a, b];
    }
  }
  if (typeof v === "string") {
    const m = v.match(/^\s*([\[\(])\s*(-?\d+)\s*,\s*(-?\d+)\s*([\]\)])\s*$/);
    if (!m) return undefined;
    const [, lb, s1, s2, rb] = m;
    let a = Number(s1),
      b = Number(s2);
    if (lb === "(") a += 1;
    if (rb === ")") b -= 1;
    return [a, b];
  }
  return undefined;
}
function normalizeBand(
  v: [number, number] | undefined,
  fb: [number, number] = [30, 70]
): [number, number] {
  const src = v ?? fb;
  let a = Math.max(0, Math.min(100, Number(src[0])));
  let b = Math.max(0, Math.min(100, Number(src[1])));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return fb;
  if (a > b) [a, b] = [b, a];
  if (a === b) b = Math.min(100, a + 1);
  return [a, b];
}
function isEntityRow(x: unknown): x is EntityRow {
  return !!x && typeof (x as any).id === "string";
}

/* ======== 핵심 추가: 시드 랜덤 기본 슬롯 생성기 ======== */
function seededRand(seedStr: string) {
  // 간단한 FNV-1a + 섞기
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let r = Math.imul(h ^ (h >>> 15), 1 | h);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | h);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function seededInitialSlot(
  key: string,
  swimY: [number, number],
  size: number | null
): Slot {
  const rnd = seededRand(key);
  const [minY, maxY] = swimY;
  const topPct = clamp(minY + (maxY - minY) * rnd(), 0, 100);
  const sidePad = Math.min(8 + Number(size ?? 1) * 2, 12);
  const leftPct = clamp(sidePad + (100 - sidePad * 2) * rnd(), 0, 100);
  return { leftPct, topPct };
}

export default function AquariumBox({
  tankNo,
  fitToContainer = false,
  heightVh = 80,
}: {
  tankNo: number;
  fitToContainer?: boolean;
  heightVh?: number;
}) {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  /** 테마(배경) */
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgReady, setBgReady] = useState(false);
  const [themeLoading, setThemeLoading] = useState(false);
  const [noTank, setNoTank] = useState(false);

  /** 인벤토리/엔티티 */
  const [invRows, setInvRows] = useState<InvRow[]>([]);
  const [entityMap, setEntityMap] = useState<Record<string, EntityRow>>({});
  const [loading, setLoading] = useState(false);

  /** 위치/레이아웃 (Record) */
  const [slots, setSlots] = useState<Record<string, Slot>>({});
  const [appearingKeys, setAppearingKeys] = useState<string[]>([]);

  /** 드래그 상태 */
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ dxPct: number; dyPct: number }>({
    dxPct: 0,
    dyPct: 0,
  });

  /** 컨테이너 스케일 */
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

  /* ======== 1) 테마 로드 ======== */
  useEffect(() => {
    (async () => {
      setThemeLoading(true);
      setBgReady(false);
      setBgUrl(null);
      setNoTank(false);
      try {
        if (!coupleId || !tankNo) return;

        const { data: tank, error: tErr } = await supabase
          .from("aquarium_tanks")
          .select("theme_id")
          .eq("couple_id", coupleId)
          .eq("tank_no", tankNo)
          .maybeSingle();
        if (tErr) throw tErr;

        if (!tank) {
          setNoTank(true);
          return;
        }

        const themeId = tank.theme_id;
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

  /* ======== 2) 인벤토리 & 엔티티 ======== */
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
        .select(
          "id, name_ko, rarity, size, swim_y, is_movable, price, glow_color"
        ) // ← glow_color 추가
        .in("id", ids);
      if (entErr) throw entErr;

      const map: Record<string, EntityRow> = {};
      for (const row of ents ?? []) {
        const parsed = normalizeBand(
          parseIntRangeToBand((row as any).swim_y),
          [30, 70]
        );
        map[String(row.id)] = {
          id: String(row.id),
          name_ko: (row as any).name_ko ?? null,
          rarity: (row as any).rarity ?? null,
          size: (row as any).size ?? null,
          swim_y: parsed, // 항상 튜플
          is_movable: (row as any).is_movable ?? null,
          price: (row as any).price ?? null,
          glow_color: (row as any).glow_color ?? null, // ← 저장
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
      loadTank();
    };
    window.addEventListener("aquarium-updated", onUpd as EventListener);
    return () =>
      window.removeEventListener("aquarium-updated", onUpd as EventListener);
  }, [coupleId, tankNo, loadTank]);

  useEffect(() => {
    loadTank();
  }, [loadTank]);

  /* ======== 3) 렌더용 리스트 ======== */
  const fishes = useMemo<RenderFish[]>(() => {
    return invRows
      .map((row) => {
        if (!row.id) return null; // ★ id 없으면 스킵(안정 키 보장)
        const ent = entityMap[row.entity_id];
        if (!ent) return null;

        return {
          slotKey: row.id, // 안정 키
          entityId: ent.id,
          labelKo: ent.name_ko ?? ent.id,
          image: entityImagePath(ent),
          rarity: ent.rarity ?? null,
          size: ent.size ?? null,
          swimY: ent.swim_y,
          isMovable: ent.is_movable ?? null,
          price: ent.price ?? null,
          glowColor: ent.glow_color ?? null, // ← 전달
        };
      })
      .filter((x): x is RenderFish => x !== null);
  }, [invRows, entityMap]);

  /* ======== 4) 초기 랜덤 배치 (페인트 전 확정) ======== */
  useLayoutEffect(() => {
    if (fishes.length === 0) return;
    setSlots((prev) => {
      const next: Record<string, Slot> = { ...prev };

      // 새 물고기만 시드 랜덤 좌표 생성
      for (const f of fishes) {
        if (!next[f.slotKey]) {
          next[f.slotKey] = seededInitialSlot(f.slotKey, f.swimY, f.size);
        }
      }

      // 사라진 물고기 슬롯 정리(옵션)
      for (const k in next) {
        if (!fishes.some((ff) => ff.slotKey === k)) delete next[k];
      }
      return next;
    });
  }, [fishes]);

  // 등장 애니메이션 표시
  useEffect(() => {
    if (fishes.length === 0) return;
    const lastKey = fishes.at(-1)!.slotKey;
    setAppearingKeys((p) => [...p, lastKey]);
    const t = setTimeout(
      () => setAppearingKeys((p) => p.filter((k) => k !== lastKey)),
      900
    );
    return () => clearTimeout(t);
  }, [fishes.length]);

  /* ======== 5) 드래그 로직 (데스크탑 전용) ======== */
  const pctFromClient = (clientX: number, clientY: number) => {
    const el = stageRef.current; // ★ 여기 기준
    if (!el) return { leftPct: 50, topPct: 50 };
    const rect = el.getBoundingClientRect();
    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    return { leftPct: x, topPct: y };
  };

  const dragKeyRef = useRef<string | null>(null);

  const onMouseDownSprite = (slotKey: string) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const stageEl = stageRef.current;
    const wrapEl = e.currentTarget as HTMLDivElement;

    const { leftPct: mx, topPct: my } = pctFromClient(e.clientX, e.clientY);

    if (stageEl && wrapEl) {
      const stageRect = stageEl.getBoundingClientRect();
      const wrapRect = wrapEl.getBoundingClientRect();

      // 현재 보이는 위치(애니메이션 포함)를 %로 환산
      const effLeftPct = clamp(
        ((wrapRect.left - stageRect.left) / stageRect.width) * 100,
        0,
        100
      );
      const effTopPct = clamp(
        ((wrapRect.top - stageRect.top) / stageRect.height) * 100,
        0,
        100
      );

      // 1) 먼저 슬롯을 "현재 보이는 위치"로 고정 (jump 방지 핵심)
      setSlots((prev) => ({
        ...prev,
        [slotKey]: { leftPct: effLeftPct, topPct: effTopPct },
      }));

      // 2) 오프셋 계산 (마우스와 물고기 사이 간격)
      dragOffsetRef.current = {
        dxPct: effLeftPct - mx,
        dyPct: effTopPct - my,
      };
    } else {
      // 폴백
      const s = slots[slotKey] ?? seededInitialSlot(slotKey, [30, 70], null);
      dragOffsetRef.current = { dxPct: s.leftPct - mx, dyPct: s.topPct - my };
    }

    // 3) 드래그 시작
    dragKeyRef.current = slotKey;
    setDragKey(slotKey);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, { once: true });
    document.body.style.cursor = "grabbing";
  };

  const onMove = (e: MouseEvent) => {
    const activeKey = dragKeyRef.current;
    if (!activeKey) return;

    const { leftPct: mx, topPct: my } = pctFromClient(e.clientX, e.clientY);
    const { dxPct, dyPct } = dragOffsetRef.current;
    const nx = clamp(mx + dxPct, 0, 100);
    const ny = clamp(my + dyPct, 0, 100);

    setSlots((prev) => ({
      ...prev,
      [activeKey]: { leftPct: nx, topPct: ny },
    }));
  };

  const onUp = () => {
    document.body.style.cursor = "";
    dragKeyRef.current = null;
    setDragKey(null);
    window.removeEventListener("mousemove", onMove);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.body.style.cursor = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-comments
  }, []);

  /* ======== render ======== */
  const showBgSkeleton = themeLoading || !bgUrl || !bgReady;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-0">
        <div
          ref={containerRef}
          className={cn(
            "relative overflow-hidden will-change-transform transform-gpu mx-auto rounded-2xl"
          )}
          style={{
            height: `${heightVh}vh`,
            width: "min(100%, calc(85vw))",
          }}
        >
          {/* 배경 */}
          {bgUrl && (
            <img
              src={bgUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover z-0 select-none pointer-events-none"
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
              draggable={false}
            />
          )}

          {/* shadcn Skeleton로 대체 */}
          {showBgSkeleton && (
            <Skeleton className="absolute inset-0 z-0" aria-hidden />
          )}

          {/* 탱크 없음 안내 (shadcn Alert) */}
          {noTank && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-black/10">
              <Alert className="w-fit rounded-lg bg-white/90 backdrop-blur border shadow">
                <AlertTitle>어항이 없어요</AlertTitle>
                <AlertDescription>
                  우리만의 어항을 만들어보세요.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* 물고기 레이어 */}
          <div className="absolute inset-0" ref={stageRef}>
            {loading ? (
              <div
                className="absolute inset-0 grid place-items-center"
                aria-live="polite"
                aria-busy="true"
              >
                <Badge
                  variant="secondary"
                  className="px-3 py-1.5 rounded-full bg-white/85 border shadow text-sm"
                >
                  어항 청소하는 중... 🫧
                </Badge>
              </div>
            ) : (
              fishes.map((f) => {
                // ★ 슬롯이 없으면 "즉시" 시드 랜덤 기본 슬롯 사용 → 50/50 프레임 노출 방지
                const slot =
                  slots[f.slotKey] ??
                  seededInitialSlot(f.slotKey, f.swimY, f.size);

                const isAppearing = appearingKeys.includes(f.slotKey);
                const isDragging = dragKey === f.slotKey;

                const fishData: SpriteFish = {
                  id: f.entityId,
                  labelKo: f.labelKo,
                  image: f.image,
                  rarity: f.rarity,
                  size: f.size,
                  swimY: f.swimY,
                  isMovable: f.isMovable,
                  price: f.price,
                  glowColor: f.glowColor, // ← hue 전달
                };

                return (
                  <FishSprite
                    key={f.slotKey}
                    fish={fishData}
                    overridePos={slot}
                    popIn={isAppearing}
                    containerScale={fitToContainer ? containerScale : 1}
                    onMouseDown={onMouseDownSprite(f.slotKey)}
                    isDragging={isDragging}
                    /** 드롭 후 그 자리에서 보브만 유지 (수직 왕복 off) */
                    lockTop={true}
                  />
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
