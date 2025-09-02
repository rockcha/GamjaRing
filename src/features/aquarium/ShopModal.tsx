// src/features/aquarium/ShopModal.tsx
"use client";
import { useState, useMemo } from "react";
import { FISHES } from "./fishes";
import { Coins } from "lucide-react";

export default function ShopModal({
  gold,
  onBuy,
}: {
  gold: number;
  onBuy: (fishId: string, cost: number) => void;
}) {
  const [open, setOpen] = useState(false);

  // ✅ 가격 낮은 순 정렬 (원본 변형 X)
  const sortedFishes = useMemo(
    () => [...FISHES].sort((a, b) => a.cost - b.cost),
    []
  );

  const fmt = (n: number) => n.toLocaleString("ko-KR");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
      >
        상점 열기
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-[540px] max-w-[92vw] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">물고기 상점</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-sm px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                닫기
              </button>
            </div>

            {/* 스크롤 영역 */}
            <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {sortedFishes.map((f) => {
                const disabled = gold < f.cost;
                const prob =
                  typeof (f as any).breedProb === "number"
                    ? (f as any).breedProb
                    : 0.1;

                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      if (disabled) return;
                      onBuy(f.id, f.cost);
                      setOpen(false);
                    }}
                    className={`border rounded-lg p-2 text-left hover:bg-gray-50 transition ${
                      disabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={f.image}
                        alt={f.labelKo}
                        className="w-full aspect-square object-contain"
                      />
                      {/* 교배 확률 배지 */}

                      <div className="absolute left-2 top-2 inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold">
                        교배 {(prob * 100).toFixed(1)}%
                      </div>
                    </div>

                    {/* 어종 이름  */}
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center rounded-md bg-sky-100 text-sky-900 border border-sky-200 px-2 py-0.5 font-bold">
                        {f.labelKo}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        <span className="tabular-nums">{fmt(f.cost)}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
