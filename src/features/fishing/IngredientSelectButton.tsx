// src/features/kitchen/IngredientSelectButton.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageOpen, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INGREDIENTS,
  INGREDIENT_TITLES,
  type IngredientTitle,
} from "@/features/kitchen/type";
import { fetchKitchen } from "@/features/kitchen/kitchenApi";
import { useCoupleContext } from "@/contexts/CoupleContext";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Selected = { title: IngredientTitle; emoji: string } | null;

export default function IngredientSelectButton({
  onStart,
  className,
  width = 180,
  placeholder = "재료함",
  startLabel = "낚시 시작",
}: {
  /** 시작 버튼 클릭 시 호출: 선택된 재료를 전달 */
  onStart: (ingredient: { title: IngredientTitle; emoji: string }) => void;
  className?: string;
  width?: number;
  placeholder?: string;
  startLabel?: string;
}) {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [invMap, setInvMap] = useState<Record<IngredientTitle, number>>(
    {} as any
  );
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Selected>(null);

  // 재료 이모지 맵 (title -> emoji)
  const EMOJI_BY_TITLE = useMemo(
    () =>
      Object.fromEntries(
        INGREDIENTS.map(
          (it) => [it.title as IngredientTitle, it.emoji] as const
        )
      ) as Record<IngredientTitle, string>,
    []
  );

  // 인벤토리 불러오기 (Inventory와 동일한 방식)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!coupleId) {
        setInvMap({} as any);
        setSelected(null);
        return;
      }
      try {
        setLoading(true);
        const k = await fetchKitchen(coupleId);
        const next: Record<IngredientTitle, number> = {} as any;
        for (const t of INGREDIENT_TITLES) next[t] = 0;
        for (const row of k.ingredients ?? []) {
          const t = row.title as IngredientTitle;
          if (t in next) next[t] = row.num ?? 0;
        }
        if (mounted) setInvMap(next);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [coupleId]);

  // 옵션 구성: 남은 수량 desc, 이름순
  const options = useMemo(() => {
    const base = INGREDIENT_TITLES.map((t) => {
      const left = invMap[t] ?? 0;
      return {
        title: t,
        emoji: EMOJI_BY_TITLE[t] ?? "📦",
        left,
        disabled: left <= 0,
      };
    });
    return base.sort((a, b) => {
      if (b.left !== a.left) return b.left - a.left;
      return a.title.localeCompare(b.title, "ko");
    });
  }, [invMap, EMOJI_BY_TITLE]);

  const handleChange = (value: string) => {
    const opt = options.find((o) => o.title === value);
    if (!opt || opt.disabled) return;
    setSelected({ title: opt.title, emoji: opt.emoji });
  };

  const canStart =
    !!selected && !!coupleId && (invMap[selected.title] ?? 0) > 0 && !loading;

  const onClickStart = () => {
    if (!canStart || !selected) return;
    onStart(selected);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* 셀렉트 */}
      <Select onValueChange={handleChange} disabled={loading || !coupleId}>
        <SelectTrigger
          className={cn("h-9 gap-2")}
          style={{ width }}
          aria-label="재료함 선택"
        >
          <PackageOpen className="h-4 w-4 text-amber-700" />
          <SelectValue
            placeholder={
              !coupleId
                ? "커플 연동 필요"
                : loading
                ? "불러오는 중…"
                : placeholder
            }
          />
          <ChevronDown className="ml-auto h-4 w-4 opacity-60" />
        </SelectTrigger>

        <SelectContent className="max-h-72">
          {options.map((opt) => (
            <SelectItem
              key={opt.title}
              value={opt.title}
              disabled={opt.disabled}
              className={cn(
                "flex items-center justify-between",
                opt.disabled && "opacity-50"
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg leading-none">{opt.emoji}</span>
                <span className="text-sm">{opt.title}</span>
              </span>
              <span className="ml-2 rounded-full bg-amber-100/80 border border-amber-200 px-1.5 py-0.5 text-[10px] text-amber-900 tabular-nums">
                ×{opt.left}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 선택 상태 미리보기 */}
      <div className="rounded-lg border bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {selected ? (
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">{selected.emoji}</span>
            <span className="font-semibold">{selected.title}</span>
            <span className="ml-auto text-xs opacity-70">
              보유: ×{invMap[selected.title] ?? 0}
            </span>
          </div>
        ) : (
          <span className="opacity-80">재료를 선택하세요.</span>
        )}
      </div>

      {/* 시작 버튼 */}
      <Button disabled={!canStart} onClick={onClickStart}>
        {startLabel}
      </Button>
    </div>
  );
}
