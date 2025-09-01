"use client";
import { useEffect, useMemo, useState } from "react";
import { FISH_BY_ID } from "./fishes";
import FishSprite from "./FishSprite";

type Slot = { key: string; id: string; leftPct: number; topPct: number };

function SpawnBurst({ leftPct, topPct }: { leftPct: number; topPct: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        dx: Math.random() * 48 - 24, // 이동폭 ↑
        dy: Math.random() * -48 - 12, // 더 높게 ↑
        delay: Math.random() * 140, // 지연 ↑
        scale: 0.8 + Math.random() * 1.2, // 크기 ↑
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
        {/* 링 파동 (3겹) */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: 0, top: 0 }}
        >
          <div className="w-12 h-12 rounded-full border-2 border-white/60 animate-[ringPulse_800ms_ease-out_forwards]" />
          <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-white/40 animate-[ringPulse_1000ms_ease-out_forwards]" />
          <div className="absolute inset-0 w-28 h-28 rounded-full border-2 border-white/20 animate-[ringPulse_1200ms_ease-out_forwards]" />
        </div>

        {/* 파티클 */}
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
  index: number; // 해당 인스턴스 인덱스
  fishId: string;
  sellPrice: number; // 원가의 절반(내림)
};

export default function AquariumBox({
  fishIds,
  isLoading = false,
  loadingText,
  onSell, // ✅ 추가: 판매 콜백
}: {
  fishIds: string[];
  isLoading?: boolean;
  loadingText?: string;
  onSell?: (payload: SellPayload) => Promise<void> | void;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appearingKeys, setAppearingKeys] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null); // ✅ 모달 상태
  const [hoverKey, setHoverKey] = useState<string | null>(null); // ✅ 호버 상태

  // 슬롯 생성
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
          const leftPct = Math.random() * 90 + 2; // 2~92%
          const topPct = Math.random() * 80 + 10; // 10~90%
          next.push({ key, id, leftPct, topPct });
        }
      }
      return next;
    });
  }, [fishIds]);

  // 등장 애니메이션
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

  // 로딩일 때 → 스켈레톤 + 메시지
  if (isLoading) {
    return (
      <div className="relative w-[800px] h-[420px] rounded-xl overflow-hidden bg-sky-200/60">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-200 to-sky-300 animate-pulse" />
        <div className="absolute inset-0 opacity-30 bg-[url('/aquarium/water.jpg')] bg-cover" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="px-4 py-2 rounded-lg bg-white/70 text-slate-700 font-medium shadow">
            {loadingText ?? "🫧 어항 청소중 …"}
          </div>
        </div>
      </div>
    );
  }

  // 선택된 슬롯/물고기 정보
  const selectedSlot = selectedKey
    ? slots.find((s) => s.key === selectedKey)
    : undefined;
  const selectedFish = selectedSlot ? FISH_BY_ID[selectedSlot.id] : undefined;
  const selectedIndex = selectedKey ? Number(selectedKey.split("-").pop()) : -1;
  const sellPrice = selectedFish ? Math.floor((selectedFish.cost ?? 0) / 2) : 0;

  return (
    <div className="relative w-[800px] h-[420px] rounded-xl overflow-hidden  bg-sky-300/70 will-change-transform transform-gpu">
      {/* 물결 텍스처 */}
      <div className="absolute inset-0 opacity-60 bg-[url('/aquarium/water.jpg')] bg-cover" />

      <div className="absolute inset-0">
        {slots.map((slot) => {
          const fish = FISH_BY_ID[slot.id];
          if (!fish) return null;
          const isAppearing = appearingKeys.includes(slot.key);
          const isHovered = hoverKey === slot.key; // ✅

          return (
            <div
              key={slot.key}
              onClick={() => setSelectedKey(slot.key)} // 클릭 → 모달
              onMouseEnter={() => setHoverKey(slot.key)} // ✅ 호버 시작
              onMouseLeave={() => setHoverKey(null)} // ✅ 호버 해제
            >
              {isAppearing && (
                <SpawnBurst leftPct={slot.leftPct} topPct={slot.topPct} />
              )}

              {/* ✅ 래퍼 scale 제거, 이미지에만 scale 적용 */}
              <FishSprite
                fish={fish}
                overridePos={{ leftPct: slot.leftPct, topPct: slot.topPct }}
                popIn={isAppearing}
                isHovered={isHovered} // ✅ 전달
              />
            </div>
          );
        })}
      </div>

      {/* 수면 하이라이트 */}
      <div className="absolute inset-x-0 top-0 h-8 bg-white/20 pointer-events-none" />

      {/* ✅ 판매 모달 */}
      {selectedSlot && selectedFish && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
          onClick={() => setSelectedKey(null)}
        >
          <div
            className="w-[420px] max-w-[92vw] rounded-xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">물고기 정보</h3>
              <button
                onClick={() => setSelectedKey(null)}
                className="text-sm px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                닫기
              </button>
            </div>

            <div className="flex gap-4">
              <img
                src={selectedFish.image}
                alt={selectedFish.labelKo}
                className="w-28 h-28 object-contain"
              />
              <div className="flex-1">
                <div className="text-base font-medium">
                  {selectedFish.labelKo}
                </div>
                <div className="text-sm text-gray-600">
                  원가: {selectedFish.cost} 골드
                </div>
                <div className="text-sm text-rose-600 font-semibold">
                  판매가: {sellPrice} 골드
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setSelectedKey(null)}
                className="px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  if (
                    !confirm(
                      `정말로 "${selectedFish.labelKo}"를 원가의 절반(${sellPrice} 골드)에 판매할까요?`
                    )
                  )
                    return;

                  if (typeof onSell === "function") {
                    await onSell({
                      index: Number.isFinite(selectedIndex)
                        ? selectedIndex
                        : -1,
                      fishId: selectedSlot.id,
                      sellPrice,
                    });
                  }
                  setSelectedKey(null);
                }}
                className="px-3 py-1.5 rounded bg-rose-500 text-white hover:bg-rose-600"
              >
                판매
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
