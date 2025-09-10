// src/features/aquarium/MarineDexModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  FISHES,
  type FishInfo,
  type FishRarity,
  RARITY_CAPTURE,
} from "./fishes";
import { Anchor, X, Info, Book } from "lucide-react";
import {
  INGREDIENT_EMOJI,
  type IngredientTitle,
} from "@/features/kitchen/type";
import { Button } from "@/components/ui/button";

type RarityFilter = "전체" | FishRarity;

export default function MarineDexModal() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // SSR-safe portal mount
  useEffect(() => setMounted(true), []);

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
      return a.labelKo.localeCompare(b.labelKo, "ko");
    });
  }, [rarity]);

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

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            aria-modal="true"
            role="dialog"
            onClick={() => setOpen(false)}
          >
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

            {/* content */}
            <div
              className="relative z-10 flex items-center justify-center w-full h-full p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-white rounded-2xl shadow-2xl w-[860px] max-w-[92vw] max-h-[82vh] p-5 flex flex-col">
                {/* header */}
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold">해양생물 도감</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      모든 어종을 한눈에 보고, 등급별로 탐색해 보세요.
                    </p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100"
                    aria-label="닫기"
                    title="닫기"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {captureHeader}

                {/* filters */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
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
                </div>

                {/* list */}
                <div className="flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {list.map((f) => {
                      const ingEmoji =
                        INGREDIENT_EMOJI[f.ingredient as IngredientTitle] ??
                        "❓";

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

                            {/* 좌상단: 희귀도 */}
                            <div className="absolute left-2 top-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${rarityChipCls(
                                  f.rarity
                                )}`}
                              >
                                {f.rarity}
                              </span>
                            </div>

                            {/* 우상단: 필요 재료 이모지 */}
                            <div
                              className="absolute right-2 top-2 w-9 h-9 rounded-full bg-white/95 border border-gray-200 shadow-sm flex items-center justify-center text-lg"
                              title={`필요 재료: ${f.ingredient}`}
                              aria-label={`필요 재료: ${f.ingredient}`}
                            >
                              <span className="translate-y-[1px]">
                                {ingEmoji}
                              </span>
                            </div>
                          </div>

                          {/* 이름 + 설명 */}
                          <div className="mt-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-bold bg-white text-zinc-900">
                                {f.labelKo}
                              </span>
                            </div>

                            <p className="mt-2 text-xs text-gray-700 line-clamp-2">
                              {f.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* footer note */}
                <div className="mt-3 text-[11px] text-gray-500 flex items-center gap-1">
                  <Anchor className="w-3.5 h-3.5" />
                  도감은 정보 제공용입니다. 야생(포획 대상) 어종은 바다 탐험에서
                  만날 수 있어요.
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {/* trigger */}
      <Button
        variant="outline"
        title="도감 열기"
        onClick={() => setOpen(true)}
        className="transition-transform duration-150 hover:scale-[1.02] active:scale-100 hover:shadow-sm"
      >
        <Book className="mr-2 h-4 w-4" />
        도감
      </Button>

      {modal}
    </>
  );
}
