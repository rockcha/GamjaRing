// src/features/aquarium/MarineDexModal.tsx
"use client";

import { useMemo, useState } from "react";
import {
  FISHES,
  type FishInfo,
  type FishRarity,
  RARITY_CAPTURE,
} from "./fishes";
import { Coins, Anchor, X, Info } from "lucide-react";
import {
  INGREDIENT_EMOJI,
  type IngredientTitle,
} from "@/features/kitchen/type";

type RarityFilter = "전체" | FishRarity;

export default function MarineDexModal({
  gold,
  onBuy,
}: {
  gold?: number; // 도감이라 필수 아님
  onBuy?: (fishId: string, cost: number) => void; // 주면 비야생 카드에만 "입양" 버튼 노출
}) {
  const [open, setOpen] = useState(false);
  const [rarity, setRarity] = useState<RarityFilter>("전체");

  const rarityOrder: Record<FishRarity, number> = {
    일반: 0,
    희귀: 1,
    에픽: 2,
    전설: 3,
  };

  const list = useMemo(() => {
    const filtered =
      rarity === "전체" ? FISHES : FISHES.filter((f) => f.rarity === rarity);
    // 보기 좋게: 희귀도 → 가격 오름차순
    return [...filtered].sort((a, b) => {
      const ra = rarityOrder[a.rarity];
      const rb = rarityOrder[b.rarity];
      if (ra !== rb) return ra - rb;
      return a.cost - b.cost;
    });
  }, [rarity]);

  const fmt = (n: number) => n.toLocaleString("ko-KR");

  const rarityBadge = (r: FishRarity) => {
    const cls =
      r === "일반"
        ? "bg-neutral-100 text-neutral-800 border-neutral-200"
        : r === "희귀"
        ? "bg-sky-100 text-sky-900 border-sky-200"
        : r === "에픽"
        ? "bg-violet-100 text-violet-900 border-violet-200"
        : "bg-amber-100 text-amber-900 border-amber-200";
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
      >
        {r}
      </span>
    );
  };

  const filters: RarityFilter[] = ["전체", "일반", "희귀", "에픽", "전설"];

  const captureHeader = (
    <div className="mb-3 flex items-center gap-2 text-[12px]">
      <Info className="w-4 h-4 text-sky-600" />
      {rarity === "전체" ? (
        <span className="text-gray-600">
          희귀도별 포획 확률 —{" "}
          <b>일반 {Math.round(RARITY_CAPTURE["일반"] * 100)}%</b> ·{" "}
          <b>희귀 {Math.round(RARITY_CAPTURE["희귀"] * 100)}%</b> ·{" "}
          <b>에픽 {Math.round(RARITY_CAPTURE["에픽"] * 100)}%</b> ·{" "}
          <b>전설 {Math.round(RARITY_CAPTURE["전설"] * 100)}%</b>
        </span>
      ) : (
        <span className="text-gray-600">
          {rarity} ={" "}
          <b>{Math.round(RARITY_CAPTURE[rarity as FishRarity] * 100)}%</b>
        </span>
      )}
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
      >
        해양생물 도감 보기
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="relative bg-white rounded-2xl shadow-2xl w-[1100px] max-w-[96vw] p-6">
            {/* 헤더 */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold">해양생물 도감</h2>
                <p className="text-sm text-gray-500 mt-1">
                  모든 어종을 한눈에 보고, 등급별로 탐색해 보세요.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 포획 확률 인포 바 (필터에 따라 변경) */}
            {captureHeader}

            {/* 필터 탭 */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setRarity(f)}
                  className={`px-3 py-1 rounded-full border text-sm ${
                    rarity === f
                      ? "bg-sky-600 text-white border-sky-700"
                      : "bg-white text-sky-700 border-sky-200 hover:bg-sky-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* 목록 */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[65vh] overflow-y-auto pr-1">
              {list.map((f) => {
                const ingEmoji =
                  INGREDIENT_EMOJI[f.ingredient as IngredientTitle] ?? "❓";

                const priceDisabled = f.isWild; // 도감: 야생이면 가격 비활성화
                const canBuy =
                  !!onBuy &&
                  !f.isWild &&
                  (typeof gold !== "number" || gold >= f.cost);

                return (
                  <div
                    key={f.id}
                    className="rounded-xl border p-3 text-left hover:shadow-sm hover:bg-gray-50 transition"
                  >
                    <div className="relative rounded-lg overflow-hidden">
                      <img
                        src={f.image}
                        alt={f.labelKo}
                        className="w-full aspect-square object-contain bg-white"
                        draggable={false}
                        loading="lazy"
                      />

                      {/* 좌상단: 희귀도 배지 */}
                      <div className="absolute left-2 top-2">
                        {rarityBadge(f.rarity)}
                      </div>

                      {/* 우상단: 필요 재료 이모지 */}
                      <div
                        className="absolute right-2 top-2 text-2xl"
                        title={`필요 재료: ${f.ingredient}`}
                        aria-label={`필요 재료: ${f.ingredient}`}
                      >
                        {ingEmoji}
                      </div>

                      {/* 우하단: 가격 배지 (야생이면 비활성화) */}
                      <div className="absolute right-2 bottom-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm tabular-nums ${
                            priceDisabled
                              ? "bg-gray-100 text-gray-400 border-gray-200"
                              : "bg-amber-50 text-amber-900 border-amber-200"
                          }`}
                          title={
                            priceDisabled ? "야생 종은 입양할 수 없어요." : ""
                          }
                          aria-disabled={priceDisabled || undefined}
                        >
                          <Coins
                            className={`w-4 h-4 ${
                              priceDisabled ? "text-gray-300" : "text-amber-600"
                            }`}
                          />
                          {fmt(f.cost)}
                        </span>
                      </div>
                    </div>

                    {/* 이름 + 설명 */}
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-sky-100 text-sky-900 border border-sky-200 px-2.5 py-1 text-xs font-bold">
                          {f.labelKo}
                        </span>
                        {/* 선택적으로 입양 버튼: 도감 기본은 숨기되, onBuy 전달 시 노출 */}
                        {onBuy && !f.isWild && (
                          <button
                            onClick={() => onBuy(f.id, f.cost)}
                            className={`ml-auto px-2.5 py-1 rounded-md text-xs border ${
                              canBuy
                                ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700"
                                : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            }`}
                            disabled={!canBuy}
                          >
                            입양
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                        {f.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 푸터 메모 */}
            <div className="mt-4 text-[12px] text-gray-500 flex items-center gap-1">
              <Anchor className="w-3.5 h-3.5" />
              야생(포획 대상) 어종은 가격이 비활성화되며, 바다 탐험에서 만날 수
              있어요.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
