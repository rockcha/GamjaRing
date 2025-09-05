// src/features/aquarium/FishActionModal.tsx
"use client";

import { useState } from "react";
import { FISH_BY_ID, RARITY_CAPTURE, type FishRarity } from "./fishes";
import { useUser } from "@/contexts/UserContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import {
  Info,
  BadgeDollarSign,
  Fish as FishIcon, // 🐟 보유 라벨용
  Utensils, // 🍽 재료 라벨용
  BookOpenText,
} from "lucide-react";

// 재료 이모지
import {
  INGREDIENT_EMOJI,
  type IngredientTitle,
} from "@/features/kitchen/type";

type SellPayload = {
  index: number;
  fishId: string;
  sellPrice: number;
};

export default function FishActionModal({
  open,
  onClose,
  coupleId, // 호환 유지용(미사용)
  fishId,
  index,
  fishCountOfThis,
  onSell,
  onAfterSell,
}: {
  open: boolean;
  onClose: () => void;
  coupleId: string | null;
  fishId: string;
  index: number;
  fishCountOfThis: number;
  onSell?: (payload: SellPayload) => Promise<void> | void;
  onAfterSell?: () => Promise<void> | void;
}) {
  if (!open) return null;

  const { user } = useUser();
  const fish = FISH_BY_ID[fishId]!;
  const cost = fish.cost ?? 0;
  const sellPrice = Math.floor(cost / 2);
  const captureBasePct = Math.round(
    RARITY_CAPTURE[fish.rarity as FishRarity] * 100
  );

  const [expanded, setExpanded] = useState(false);

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

  const handleSell = async () => {
    if (!onSell) return;

    await onSell({ index, fishId, sellPrice });

    try {
      if (user?.id && user?.partner_id) {
        await sendUserNotification({
          senderId: user.id,
          receiverId: user.partner_id,
          type: "물품판매",
          itemName: fish.labelKo,
        });
      }
    } catch (e) {
      console.warn("판매 알림 전송 실패(무시 가능):", e);
    }

    await onAfterSell?.();
    onClose();
  };

  // 재료 이모지 안전 조회
  const ingredientEmoji = (fish as any).ingredient
    ? INGREDIENT_EMOJI[(fish as any).ingredient as IngredientTitle]
    : undefined;

  const descText =
    (fish as any).description ||
    "설명이 아직 없어요. 나중에 도감에서 내용을 추가해보세요!";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-[560px] max-w-[92vw] rounded-2xl bg-white p-4 shadow-xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 (닫기 버튼은 푸터로 이동) */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold tracking-tight">
                {fish.labelKo}
              </h3>
              {rarityBadge(fish.rarity as FishRarity)}
              {(fish as any).isWild && (
                <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[11px] font-semibold">
                  야생
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-gray-600">
              <Info className="w-4 h-4 text-sky-600" />
              <span>
                포획 확률: <b className="text-gray-800">{captureBasePct}%</b>
              </span>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex gap-4">
          {/* 썸네일 */}
          <div className="relative shrink-0">
            <img
              src={fish.image}
              alt={fish.labelKo}
              className="w-28 h-28 object-contain rounded-md bg-white ring-1 ring-gray-200"
              style={{ animation: "pulseOnce 500ms ease-out" }}
              draggable={false}
            />
          </div>

          {/* 정보 */}
          <div className="flex-1 text-sm">
            {/* 모든 줄을 동일한 라벨/값 패턴으로 통일 */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-y-1.5">
              {/* 보유 (아이콘 추가) */}
              <div className="text-gray-500 flex items-center gap-1.5">
                <FishIcon className="w-4 h-4" />
                보유
              </div>
              <div className="text-gray-900 font-semibold">
                {fishCountOfThis}마리
              </div>

              {/* 판매가 */}
              <div className="text-gray-500 flex items-center gap-1.5">
                <BadgeDollarSign className="w-4 h-4" />
                판매가
              </div>
              <div className="text-gray-900 font-semibold">
                {cost.toLocaleString("ko-KR")} →{" "}
                <span className="text-amber-700">
                  {sellPrice.toLocaleString("ko-KR")}
                </span>{" "}
                골드
              </div>

              {/* 재료 (아이콘 변경 + 값 앞 글머리 기호) */}
              <div className="text-gray-500 flex items-center gap-1.5">
                <Utensils className="w-4 h-4" />
                재료
              </div>
              <div className="text-gray-900 font-medium flex items-center gap-1.5">
                {/* 글머리기호 느낌의 작은 점 */}
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300"
                  aria-hidden
                />
                {ingredientEmoji ? (
                  <span className="leading-none text-base">
                    {ingredientEmoji}
                  </span>
                ) : (
                  "-"
                )}
              </div>
            </div>

            {/* 설명 카드 */}
            <div className="mt-3 rounded-xl border border-neutral-200 bg-gradient-to-br from-sky-50/70 to-amber-50/60 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-gray-700">
                <BookOpenText className="w-4 h-4 text-amber-600" />
                설명
              </div>
              <p
                className={`text-[13px] leading-relaxed text-gray-700 ${
                  expanded ? "" : "line-clamp-3"
                }`}
              >
                {descText}
              </p>
              {descText && descText.length > 40 && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-2 text-[12px] font-medium text-sky-700 hover:underline"
                >
                  {expanded ? "접기" : "더보기"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 푸터: 판매 오른쪽에 닫기 버튼 */}
        <div className="mt-4 flex justify-end gap-2">
          {onSell && (
            <button
              onClick={handleSell}
              className="px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700"
            >
              판매
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
