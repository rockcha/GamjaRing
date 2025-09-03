// src/features/kitchen/RecipeShelf.tsx
"use client";

import { RECIPES_BY_GRADE, type Recipe } from "./type";
import { cn } from "@/lib/utils";
import { Utensils, ChefHat, Trophy, Soup } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

const GRADE_META: Record<
  Recipe["grade"],
  { icon: React.ElementType; color: string; ring: string; label: string }
> = {
  초급: {
    icon: Soup,
    color: "text-green-600",
    ring: "ring-green-400",
    label: "초급 ",
  },
  중급: {
    icon: ChefHat,
    color: "text-amber-600",
    ring: "ring-amber-400",
    label: "중급 ",
  },
  고급: {
    icon: Trophy,
    color: "text-rose-600",
    ring: "ring-rose-400",
    label: "고급 ",
  },
};

export default function RecipeShelf({
  selectedName,
  onSelect,
}: {
  selectedName: string | null;
  onSelect: (name: string) => void;
}) {
  const grades = ["초급", "중급", "고급"] as const;

  return (
    <div className="flex flex-col">
      <div className="rounded-xl border bg-white/90 shadow-sm">
        {/* 상단 타이틀 바 (아이콘 변경 + '레시피' 강조) */}
        <div className="px-3 py-2  flex items-center gap-2 ">
          <span className="inline-flex p-2  items-center justify-center ">
            <Utensils className="h-6 w-6 text-amber-700" />
          </span>
          <span className="text-base font-semibold text-amber-900">레시피</span>
        </div>
        <Separator />
        {/* 스크롤 제거 → 콘텐츠 높이만큼만 */}
        <TooltipProvider delayDuration={150}>
          <div className="p-3 space-y-5">
            {grades.map((grade, idx) => {
              const meta = GRADE_META[grade];
              const Icon = meta.icon;
              const list = RECIPES_BY_GRADE[grade];

              return (
                <section key={grade} className="space-y-2">
                  {/* 등급 헤더 */}
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", meta.color)} />
                    <span className={cn("text-xs font-semibold", meta.color)}>
                      {meta.label}
                    </span>
                  </div>

                  {/* 이모지 그리드 */}
                  <div className="grid grid-cols-5 gap-2 auto-rows-[64px]">
                    {list.map((r) => {
                      const selected = selectedName === r.name;
                      return (
                        <Tooltip key={r.name}>
                          <TooltipTrigger asChild>
                            <button
                              aria-label={r.name}
                              onClick={() => onSelect(r.name)} // 미리보기만 변경
                              className={cn(
                                "rounded-xl border bg-white/90 shadow-sm",
                                "flex items-center justify-center text-2xl",
                                "hover:bg-accent transition",
                                selected &&
                                  cn(
                                    "ring-2 ring-offset-2 ring-offset-white",
                                    meta.ring
                                  )
                              )}
                            >
                              {r.emoji}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="text-sm">{r.name}</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
