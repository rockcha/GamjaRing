"use client";
import { useState, useMemo } from "react";
import { FISHES } from "./fishes";

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
          <div className="bg-white rounded-xl shadow-xl w-[520px] max-w-[92vw] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">물고기 상점</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-sm px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                닫기
              </button>
            </div>

            <div className="text-sm mb-3">
              보유 골드: <b>{gold}</b>
            </div>

            {/* 스크롤 영역 */}
            <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {sortedFishes.map((f) => {
                const disabled = gold < f.cost;
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
                    <img
                      src={f.image}
                      alt={f.labelKo}
                      className="w-full aspect-square object-contain"
                    />
                    <div className="mt-2 text-sm font-medium">{f.labelKo}</div>
                    <div className="text-xs text-gray-600">{f.cost} 골드</div>
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
