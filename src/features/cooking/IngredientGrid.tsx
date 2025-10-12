// src/features/cooking/IngredientGrid.tsx
"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import supabase from "@/lib/supabase";
import { INGREDIENTS, type IngredientTitle } from "@/features/cooking/type";
import { emitPotCenterFx } from "@/features/cooking/potEventBus";

type KitchenIngredientRow = { num: number; title: IngredientTitle };

export default function IngredientGrid({
  coupleId,
  stagedMap,
  onClickWhenEmpty,
  refreshAt,
  onPick,
  maxReached, // ✅ 최대치(15개) 도달 여부
}: {
  coupleId: string;
  stagedMap?: Partial<Record<IngredientTitle, number>>;
  onClickWhenEmpty?: (title: IngredientTitle) => void;
  refreshAt?: number;
  onPick?: (title: IngredientTitle) => void;
  maxReached?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [invMap, setInvMap] = useState<
    Partial<Record<IngredientTitle, number>>
  >({});

  useEffect(() => {
    let ignore = false;
    async function fetchKitchenIngredients() {
      if (!coupleId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("couple_kitchen")
          .select("ingredients")
          .eq("couple_id", coupleId)
          .maybeSingle();
        if (error) throw error;

        const arr = ((data?.ingredients as any) ??
          []) as KitchenIngredientRow[];
        const map: Partial<Record<IngredientTitle, number>> = {};
        for (const it of arr) map[it.title] = Number(it.num) || 0;
        if (!ignore) setInvMap(map);
      } catch (e) {
        console.warn("[IngredientGrid] couple_kitchen fetch 실패:", e);
        if (!ignore) setInvMap({});
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchKitchenIngredients();
    return () => {
      ignore = true;
    };
  }, [coupleId, refreshAt]);

  type Row = {
    title: IngredientTitle;
    emoji: string;
    have: number;
    staged: number;
    left: number;
  };

  const rows: Row[] = useMemo(() => {
    const staged = stagedMap ?? {};
    return INGREDIENTS.map((it) => {
      const title = it.title as IngredientTitle;
      const have = Math.max(0, Number(invMap[title] ?? 0));
      const s = Math.max(0, Number(staged[title] ?? 0));
      const left = Math.max(0, have - s);
      return { title, emoji: it.emoji, have, staged: s, left };
    });
  }, [invMap, stagedMap]);

  const handleClick = (row: Row) => {
    if (row.left <= 0) {
      onClickWhenEmpty?.(row.title);
      return;
    }
    if (maxReached) {
      // 최대치 도달 시 부모에서 토스트를 띄우므로 여기서는 무음 처리
      return;
    }
    // 1) 부모에 알림(수량 증가)
    onPick?.(row.title);
    // 2) 냄비 중앙 이펙트 트리거
    emitPotCenterFx({ title: row.title, emoji: row.emoji });
  };

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{maxReached ? "최대 15개에 도달했어요." : "재료 추가하기"}</span>
        {loading && <span>인벤토리 불러오는 중…</span>}
      </div>

      {/* 3열 · 자동 줄바꿈 */}
      <div className={cn("grid gap-3", "grid-cols-3")}>
        {rows.map((it) => {
          const disabled = it.left <= 0 || !!maxReached;
          return (
            <button
              key={it.title}
              type="button"
              onClick={() => handleClick(it)}
              className={cn(
                "relative rounded-2xl border bg-white/90 px-3 py-4",
                "flex flex-col items-center justify-center gap-1",
                "transition hover:shadow-sm select-none",
                disabled
                  ? "opacity-50 grayscale cursor-not-allowed"
                  : "cursor-pointer active:scale-[0.99]"
              )}
              title={
                disabled
                  ? maxReached
                    ? "최대 15개까지 넣을 수 있어요."
                    : `${it.title} 재고 없음`
                  : `${it.title} 클릭해서 넣기`
              }
            >
              <span className="text-3xl leading-none">{it.emoji}</span>
              <span className="text-[11px] text-zinc-600">{it.title}</span>

              <Badge
                variant="secondary"
                className="absolute right-1 bottom-1 px-1.5 py-0.5 text-[10px] mr-1 bg-amber-200 text-rose-800 tabular-nums"
                title={`남음 ${it.left} (보유 ${it.have} - 스테 ${it.staged})`}
              >
                ×{it.left}
              </Badge>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
