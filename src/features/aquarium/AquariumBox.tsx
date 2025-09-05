// src/features/aquarium/AquariumBox.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { FISH_BY_ID } from "./fishes";
import FishSprite from "./FishSprite";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { toast } from "sonner";
import FishActionModal from "./FishActionModal"; // ✅ 외부 파일 모달 import

type Slot = { key: string; id: string; leftPct: number; topPct: number };

function randInRange(min: number, max: number) {
  if (max < min) [min, max] = [max, min];
  return min + Math.random() * (max - min);
}
function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function SpawnBurst({ leftPct, topPct }: { leftPct: number; topPct: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        dx: Math.random() * 48 - 24,
        dy: Math.random() * -48 - 12,
        delay: Math.random() * 140,
        scale: 0.8 + Math.random() * 1.2,
        char: ["💦", "✨", "🐟", "💧"][Math.floor(Math.random() * 4)],
      })),
    []
  );

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

type SellPayload = {
  index: number;
  fishId: string;
  sellPrice: number;
};

export default function AquariumBox({
  fishIds: fishIdsProp,
  isLoading: isLoadingProp = false,
  loadingText,
  onSell,
}: {
  fishIds?: string[];
  isLoading?: boolean;
  loadingText?: string;
  onSell?: (payload: SellPayload) => Promise<void> | void;
}) {
  const { couple, fetchCoupleData } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [fishIdsInternal, setFishIdsInternal] = useState<string[]>([]);
  const [breedCount, setBreedCount] = useState<number>(0);
  const [loadingInternal, setLoadingInternal] = useState(false);

  const fishIds = fishIdsProp ?? fishIdsInternal;
  const isLoading = isLoadingProp || loadingInternal;

  // DB에서 초기 로드 / 없으면 생성
  useEffect(() => {
    if (fishIdsProp) return;
    if (!coupleId) {
      setFishIdsInternal([]);
      setBreedCount(0);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        setLoadingInternal(true);
        const { data, error } = await supabase
          .from("couple_aquarium")
          .select("aquarium_fishes, breed_count")
          .eq("couple_id", coupleId)
          .maybeSingle();

        if (!mounted) return;

        if (error || !data) {
          await supabase
            .from("couple_aquarium")
            .upsert(
              { couple_id: coupleId, aquarium_fishes: [], breed_count: 0 },
              { onConflict: "couple_id" }
            );
          setFishIdsInternal([]);
          setBreedCount(0);
        } else {
          const arr = Array.isArray(data.aquarium_fishes)
            ? (data!.aquarium_fishes as string[])
            : [];
          setFishIdsInternal(arr);
          setBreedCount(
            Number.isFinite(data.breed_count as number)
              ? (data.breed_count as number)
              : 0
          );
        }
      } finally {
        setLoadingInternal(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [coupleId, fishIdsProp]);

  // 내부 리프레시 유틸
  const refreshFromDB = async () => {
    if (!coupleId) return;
    const { data } = await supabase
      .from("couple_aquarium")
      .select("aquarium_fishes, breed_count")
      .eq("couple_id", coupleId)
      .maybeSingle();
    const arr = Array.isArray(data?.aquarium_fishes)
      ? (data!.aquarium_fishes as string[])
      : [];
    setFishIdsInternal(arr);
    setBreedCount(
      Number.isFinite(data?.breed_count as number)
        ? (data?.breed_count as number)
        : 0
    );
    await fetchCoupleData?.();
  };

  // 종별 보유수
  const countsById = useMemo(() => {
    const m = new Map<string, number>();
    for (const id of fishIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [fishIds]);

  // 슬롯/연출
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appearingKeys, setAppearingKeys] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
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

  if (isLoading) {
    return (
      <div className="mx-auto w-full px-2" style={{ maxWidth: 1100 }}>
        <div
          className="relative w-full rounded-xl overflow-hidden"
          style={{ aspectRatio: "800 / 420" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-sky-200 to-sky-300 animate-pulse" />
          <div className="absolute inset-0 opacity-30 bg-[url('/aquarium/water.jpg')] bg-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-4 py-2 rounded-lg bg-white/70 text-slate-700 font-medium shadow">
              {loadingText ?? "🫧 어항 청소중 …"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedSlot = selectedKey
    ? slots.find((s) => s.key === selectedKey)
    : undefined;
  const selectedFish = selectedSlot ? FISH_BY_ID[selectedSlot.id] : undefined;
  const selectedIndex = selectedKey ? Number(selectedKey.split("-").pop()) : -1;

  return (
    <div className="mx-auto w-full " style={{ maxWidth: 1100 }}>
      {/* 비율 박스: 가로에 맞춰 자동 높이 */}
      <div
        className="relative w-full rounded-xl overflow-hidden bg-sky-300/70 will-change-transform transform-gpu"
        style={{ aspectRatio: "800 / 420" }}
      >
        {/* 배경 */}
        <div className="absolute inset-0 opacity-60 bg-[url('/aquarium/water.jpg')] bg-cover" />

        {/* 물고기/이펙트 레이어 */}
        <div className="absolute inset-0">
          {slots.map((slot) => {
            const fish = FISH_BY_ID[slot.id];
            if (!fish) return null;
            const isAppearing = appearingKeys.includes(slot.key);
            const isHovered = hoverKey === slot.key;

            return (
              <div
                key={slot.key}
                onClick={() => setSelectedKey(slot.key)}
                onMouseEnter={() => setHoverKey(slot.key)}
                onMouseLeave={() => setHoverKey(null)}
              >
                {isAppearing && (
                  <SpawnBurst leftPct={slot.leftPct} topPct={slot.topPct} />
                )}
                <FishSprite
                  fish={fish}
                  overridePos={{ leftPct: slot.leftPct, topPct: slot.topPct }}
                  popIn={isAppearing}
                  isHovered={isHovered}
                />
              </div>
            );
          })}
        </div>

        {/* 수면 하이라이트 */}
        <div className="absolute inset-x-0 top-0 h-[10%] bg-white/20 pointer-events-none" />
      </div>

      {/* 모달 */}
      {selectedSlot && selectedFish && (
        <FishActionModal
          open={true}
          onClose={() => setSelectedKey(null)}
          coupleId={coupleId}
          fishId={selectedSlot.id}
          index={Number.isFinite(selectedIndex) ? selectedIndex : -1}
          fishCountOfThis={countsById.get(selectedSlot.id) ?? 0}
          {...(onSell && {
            onSell: async (payload) => {
              await onSell(payload);
              await refreshFromDB();
              setSelectedKey(null);
            },
            onAfterSell: refreshFromDB,
          })}
        />
      )}
    </div>
  );
}
