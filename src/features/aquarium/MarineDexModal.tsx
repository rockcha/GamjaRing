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
  isOcean = false, // ✅ 기본값 false
}: {
  gold?: number;
  onBuy?: (fishId: string, cost: number) => void;
  isOcean?: boolean;
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
    return [...filtered].sort((a, b) => {
      const ra = rarityOrder[a.rarity];
      const rb = rarityOrder[b.rarity];
      if (ra !== rb) return ra - rb;
      return a.cost - b.cost;
    });
  }, [rarity]);

  const fmt = (n: number) => n.toLocaleString("ko-KR");

  const rarityChipCls = (r: FishRarity) =>
    r === "일반"
      ? "bg-neutral-100 text-neutral-900 border-neutral-200"
      : r === "희귀"
      ? "bg-sky-100 text-sky-900 border-sky-200"
      : r === "에픽"
      ? "bg-violet-100 text-violet-900 border-violet-200"
      : "bg-amber-100 text-amber-900 border-amber-200";

  const rarityCardBg = (r: FishRarity) =>
    r === "일반"
      ? "bg-neutral-50 border-neutral-200"
      : r === "희귀"
      ? "bg-sky-50 border-sky-200"
      : r === "에픽"
      ? "bg-violet-50 border-violet-200"
      : "bg-amber-50 border-amber-200";

  const filterBtnCls = (f: RarityFilter, active: boolean) => {
    if (f === "전체")
      return active
        ? "bg-slate-700 text-white border-slate-800"
        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50";

    const map: Record<FishRarity, { on: string; off: string }> = {
      일반: {
        on: "bg-neutral-700 text-white border-neutral-800",
        off: "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50",
      },
      희귀: {
        on: "bg-sky-600 text-white border-sky-700",
        off: "bg-white text-sky-700 border-sky-300 hover:bg-sky-50",
      },
      에픽: {
        on: "bg-violet-600 text-white border-violet-700",
        off: "bg-white text-violet-700 border-violet-300 hover:bg-violet-50",
      },
      전설: {
        on: "bg-amber-600 text-white border-amber-700",
        off: "bg-white text-amber-700 border-amber-300 hover:bg-amber-50",
      },
    };
    return active ? map[f].on : map[f].off;
  };

  const captureHeader =
    rarity === "전체" ? null : (
      <div className="mb-3 flex items-center gap-2 text-[12px]">
        <Info className="w-4 h-4 text-sky-600" />
        <span className="text-gray-700">
          포획 확률 :{" "}
          <b>{Math.round(RARITY_CAPTURE[rarity as FishRarity] * 100)}% 미만</b>
        </span>
      </div>
    );

  const filters: RarityFilter[] = ["전체", "일반", "희귀", "에픽", "전설"];

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

            {captureHeader}

            {/* 필터 탭 */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {filters.map((f) => {
                const active = rarity === f;
                return (
                  <button
                    key={f}
                    onClick={() => setRarity(f)}
                    className={`px-3 py-1 rounded-full border text-sm transition ${filterBtnCls(
                      f,
                      active
                    )}`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            {/* 목록 */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[65vh] overflow-y-auto pr-1">
              {list.map((f) => {
                const ingEmoji =
                  INGREDIENT_EMOJI[f.ingredient as IngredientTitle] ?? "❓";
                const priceDisabled = f.isWild;
                const canBuy =
                  !!onBuy &&
                  !f.isWild &&
                  (typeof gold !== "number" || gold >= f.cost);

                return (
                  <div
                    key={f.id}
                    className={`rounded-xl border p-3 text-left ${rarityCardBg(
                      f.rarity
                    )}`}
                  >
                    <div className="relative rounded-lg overflow-hidden border">
                      <img
                        src={f.image}
                        alt={f.labelKo}
                        className="w-full aspect-square object-contain bg-white"
                        draggable={false}
                        loading="lazy"
                      />

                      <div
                        className="absolute right-2 top-2 w-10 h-10 rounded-full bg-white/95 border border-gray-200 shadow-sm flex items-center justify-center text-xl"
                        title={`필요 재료: ${f.ingredient}`}
                        aria-label={`필요 재료: ${f.ingredient}`}
                      >
                        <span className="translate-y-[1px]">{ingEmoji}</span>
                      </div>

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
                        <span
                          className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-bold ${rarityChipCls(
                            f.rarity
                          )}`}
                        >
                          {f.labelKo}
                        </span>

                        {/* ✅ isOcean === false 일 때만 입양 버튼 노출 */}
                        {!isOcean && onBuy && !f.isWild && (
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

                      <p className="mt-2 text-xs text-gray-700 line-clamp-2">
                        {f.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

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
