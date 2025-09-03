// src/features/kitchen/PotBox.tsx
"use client";

import { useState } from "react";
import { Soup, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";

type PotIngredientItem = {
  stackIdx: number; // KitchenPage의 potStack 인덱스
  emoji: string;
  title?: string;
};

export default function PotBox({
  items,
  potatoCount, // (호환 유지 - 미사용)
  onRemoveByIndex,
  onDecreasePotato, // (호환 유지 - 미사용)
  highlightStackIdx, // 마지막 추가 인덱스만 애니메이션
  canCook = false, // 조리 가능 여부
  onCook, // 조리 시작 핸들러
  bgSrc = "/cooking/IngredientBox.png",
}: {
  items: PotIngredientItem[];
  potatoCount: number;
  onRemoveByIndex: (stackIndex: number) => void;
  onDecreasePotato: () => void;
  highlightStackIdx: number | null;
  canCook?: boolean;
  onCook?: () => void;
  bgSrc?: string;
}) {
  // 3x3 그리드에 최대 9개만 표시
  const cells: (PotIngredientItem | null)[] = Array.from(
    { length: 9 },
    (_, i) => items[i] ?? null
  );

  // 제거 이펙트를 위해 잠깐 보관 후 remove 호출
  const [removingIdx, setRemovingIdx] = useState<number | null>(null);
  const handleRemove = (idx: number) => {
    setRemovingIdx(idx);
    // itemOut 애니메이션 길이(180ms) 이후 실제 제거
    setTimeout(() => {
      onRemoveByIndex(idx);
      setRemovingIdx(null);
    }, 180);
  };

  const statusText = canCook ? "재료 준비가 완료됐어요." : "재료가 부족해요";

  return (
    <div className="relative overflow-hidden rounded-2xl p-4  bg-amber-200 shadow-sm">
      {/* 상단 부드러운 헤더 그라디언트 */}

      {/* 제목 바 + 상태 텍스트(배경/보더 제거) */}
      <div className="relative z-10  flex items-center justify-center text-base  ">
        <span className={canCook ? "text-green-700" : "text-amber-700"}>
          {statusText}
        </span>
      </div>

      {/* 내용 */}
      <div className="relative z-10">
        {/* 고정 높이 + 우하단 버튼 공간 확보 */}
        <div className="relative h-[240px] sm:h-[280px] md:h-[300px]  pb-14">
          {/* 배경 이미지 (냄비) */}
          {bgSrc ? (
            <div
              className="pointer-events-none absolute inset-0 bg-center bg-cover bg-no-repeat"
              style={{ backgroundImage: `url(${bgSrc})` }}
              aria-hidden
            />
          ) : null}

          {/* 안전 영역: 배경 안쪽에 비율로 패딩을 주어 3x3 그리드 배치 */}
          <div
            className="absolute inset-0"
            style={{ top: "10%", right: "10%", bottom: "12%", left: "10%" }}
          >
            <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-2">
              {cells.map((cell, i) =>
                cell ? (
                  <button
                    key={cell.stackIdx}
                    className={[
                      "group w-full h-full rounded-xl",
                      "flex items-center justify-center transition",
                      "hover:-translate-y-0.5",
                      // 추가/제거 이펙트
                      cell.stackIdx === highlightStackIdx
                        ? "animate-[itemIn_.22s_ease-out_1]"
                        : "",
                      removingIdx === cell.stackIdx
                        ? "animate-[itemOut_.18s_ease-in_1] pointer-events-none"
                        : "",
                    ].join(" ")}
                    onClick={() => handleRemove(cell.stackIdx)}
                    title="빼기"
                  >
                    <span
                      className={[
                        "leading-none select-none transition-transform",
                        "group-hover:scale-[1.06]",
                      ].join(" ")}
                      style={{ fontSize: "clamp(18px, 7.5vmin, 44px)" }}
                    >
                      {cell.emoji}
                    </span>
                  </button>
                ) : (
                  <div key={`empty-${i}`} />
                )
              )}
            </div>
          </div>

          {/* 오른쪽 하단 고정 버튼 */}
          <div className="pointer-events-none absolute right-0 bottom-0 ">
            <Button
              className="pointer-events-auto gap-1 px-3"
              size="sm"
              onClick={onCook}
              disabled={!canCook}
              title={canCook ? "조리 시작" : "재료/감자 수량이 맞지 않아요"}
            >
              <ChefHat className="h-4 w-4" />
              조리 시작
            </Button>
          </div>
        </div>
      </div>

      {/* 키프레임: 추가/제거 */}
      <style>{`
        @keyframes itemIn {
          0%   { transform: scale(.86); opacity: 0; filter: blur(1px); }
          100% { transform: scale(1);    opacity: 1; filter: blur(0);   }
        }
        @keyframes itemOut {
          0%   { transform: scale(1);    opacity: 1; }
          100% { transform: scale(.86);  opacity: 0; }
        }
      `}</style>
    </div>
  );
}
