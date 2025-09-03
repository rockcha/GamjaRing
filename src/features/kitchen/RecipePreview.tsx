// src/features/kitchen/RecipePreview.tsx
"use client";

import {
  type Recipe,
  INGREDIENT_EMOJI,
  getFoodDesc,
  type RecipeName,
} from "./type";
import { ChefHat, Trophy, Soup, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const GRADE_META: Record<
  Recipe["grade"],
  {
    icon: React.ElementType;
    text: string;
    pill: string;
    headerGrad: string;
  }
> = {
  초급: {
    icon: Soup,
    text: "text-green-700",
    pill: "bg-green-100 border-green-200",
    headerGrad: "from-green-200/70 to-transparent",
  },
  중급: {
    icon: ChefHat,
    text: "text-amber-700",
    pill: "bg-amber-100 border-amber-200",
    headerGrad: "from-amber-200/70 to-transparent",
  },
  고급: {
    icon: Trophy,
    text: "text-rose-700",
    pill: "bg-rose-100 border-rose-200",
    headerGrad: "from-rose-200/70 to-transparent",
  },
};

export default function RecipePreview({ recipe }: { recipe?: Recipe }) {
  const tone = recipe ? GRADE_META[recipe.grade] : null;
  const desc = recipe ? getFoodDesc(recipe.name as RecipeName) : "";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white shadow-sm",
        recipe
      )}
    >
      {/* 상단 감성 헤더 그라디언트 */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 -top-20 h-40 bg-gradient-to-b",
          recipe ? tone?.headerGrad : "from-zinc-200/60 to-transparent"
        )}
        aria-hidden
      />

      {/* 본문 */}
      <div className="relative z-10 p-4">
        {!recipe ? (
          <div className="text-sm text-muted-foreground">
            오른쪽 <b>레시피 북</b>에서 요리를 선택하면 이곳에 미리보기가
            표시됩니다.
          </div>
        ) : (
          <>
            {/* 헤더: 커버 이모지 + 이름/등급 + 판매가 */}
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 h-16 w-16 rounded-2xl bg-white border flex items-center justify-center text-4xl shadow-sm animate-[floaty_3.2s_ease-in-out_infinite]"
                aria-hidden
              >
                {recipe.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold leading-tight">
                    {recipe.name}
                  </h3>
                  <GradePill grade={recipe.grade} />
                </div>

                {/* 판매가 */}
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-amber-800">
                  <Coins className="h-3.5 w-3.5" />
                  <span className="font-medium tabular-nums">
                    판매가 {recipe.sell}
                  </span>
                </div>
              </div>
            </div>

            {/* ▼ 설명: 최대 2줄, 고정 높이로 카드 흔들림 방지 */}
            <div
              className={cn(
                "mt-2 text-sm text-muted-foreground leading-snug",
                // line-clamp 플러그인이 있으면 2줄 고정, 없더라도 min-h로 높이 유지
                "line-clamp-2",
                "min-h-[40px] overflow-hidden"
              )}
              title={desc}
            >
              {desc}
            </div>

            {/* 필요 재료 */}
            <div className="mt-4 space-y-2">
              <Separator />
              <div className="text-xs font-medium text-muted-foreground">
                필요 재료
              </div>

              {/* 감자 + 재료 일렬 배치 */}
              <div className="flex items-center gap-2 flex-nowrap overflow-x-auto py-1">
                {/* 감자 (개수 배지 포함) */}
                <div className="relative inline-flex h-14 w-14 items-center justify-center text-3xl select-none mb-2">
                  🥔
                  <span className="absolute bottom-1 right-1 text-[12px] leading-none text-amber-900 tabular-nums">
                    ×{recipe.potato}
                  </span>
                </div>

                {/* 나머지 재료 (각 1개) */}
                {recipe.ingredients.map((t) => (
                  <div
                    key={t}
                    className="inline-flex h-14 w-14 flex-col items-center justify-center select-none"
                  >
                    <span className="text-2xl leading-none">
                      {INGREDIENT_EMOJI[t]}
                    </span>
                    <span className="mt-1 text-[10px] text-zinc-500">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 둥실 애니메이션 키프레임 */}
      <style>{`
        @keyframes floaty {
          0%   { transform: translateY(0) }
          50%  { transform: translateY(-4px) }
          100% { transform: translateY(0) }
        }
      `}</style>
    </div>
  );
}

function GradePill({ grade }: { grade: Recipe["grade"] }) {
  const meta = GRADE_META[grade];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        meta.pill,
        meta.text
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {grade}
    </span>
  );
}
