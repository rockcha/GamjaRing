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
import { Button } from "@/components/ui/button"; // ✅ 추가
import { Input } from "@/components/ui/input"; // ✅ 추가
import { toast } from "sonner"; // ✅ 추가

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

  const staged = stagedMap ?? {};
  const rows: Row[] = useMemo(() => {
    return INGREDIENTS.map((it) => {
      const title = it.title as IngredientTitle;
      const have = Math.max(0, Number(invMap[title] ?? 0));
      const s = Math.max(0, Number(staged[title] ?? 0));
      const left = Math.max(0, have - s);
      return { title, emoji: it.emoji, have, staged: s, left };
    });
  }, [invMap, stagedMap]);

  // ✅ 현재 스테이징 총합
  const stagedTotal = useMemo(
    () => rows.reduce((acc, r) => acc + r.staged, 0),
    [rows]
  );

  // ✅ “랜덤 재료 넣기”용 목표 총합 입력 (10~15)
  const [targetTotal, setTargetTotal] = useState<number>(10);

  const handleClick = (row: Row) => {
    if (row.left <= 0) {
      onClickWhenEmpty?.(row.title);
      return;
    }
    if (maxReached) {
      // 최대치 도달 시 부모에서 토스트를 띄우므로 여기서는 무음 처리
      return;
    }
    onPick?.(row.title);
    emitPotCenterFx({ title: row.title, emoji: row.emoji });
  };

  // ✅ 랜덤으로 (targetTotal - stagedTotal) 만큼 채우기
  const handleBulkRandomFill = () => {
    // 1) 입력값 검증
    if (Number.isNaN(targetTotal)) {
      toast.error("숫자를 입력해주세요.");
      return;
    }
    if (targetTotal < 10 || targetTotal > 15) {
      toast.warning("목표 개수는 10개 이상 15개 이하로 설정해주세요.");
      return;
    }
    if (stagedTotal > targetTotal) {
      toast.warning(
        `이미 ${stagedTotal}개가 담겨 있어요. 목표(${targetTotal})보다 많습니다.`
      );
      return;
    }
    if (maxReached) {
      toast.warning("최대 15개에 도달했어요.");
      return;
    }

    // 2) 필요 개수 산출 (남은 슬롯, 재고 한도 고려)
    const needRaw = targetTotal - stagedTotal;
    if (needRaw <= 0) {
      toast.info("이미 목표 개수만큼 담겨 있어요.");
      return;
    }

    const slotsLeft = Math.max(0, 15 - stagedTotal);
    if (slotsLeft <= 0) {
      toast.warning("최대 15개까지 넣을 수 있어요.");
      return;
    }

    // 재고 풀(남은 수량만큼 복제한 풀) 구성
    const pool: IngredientTitle[] = [];
    rows.forEach((r) => {
      if (r.left > 0) {
        for (let i = 0; i < r.left; i++) pool.push(r.title);
      }
    });

    if (pool.length === 0) {
      toast.error("사용 가능한 재료가 없어요.");
      return;
    }

    const need = Math.min(needRaw, slotsLeft, pool.length);
    if (need <= 0) {
      toast.warning("추가로 넣을 수 있는 재료가 없어요.");
      return;
    }

    // 3) 랜덤 샘플링 (재고 한도 내에서 중복 가능)
    //    풀에서 하나 뽑을 때마다 제거 → 재고 소진 반영
    for (let i = 0; i < need; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const title = pool[idx];
      onPick?.(title);
      // 과한 이펙트 스팸 방지: 첫 1~2개만 이펙트 (선택)
      if (i < 2) {
        const emoji = INGREDIENTS.find((x) => x.title === title)?.emoji ?? "🥕";
        emitPotCenterFx({ title, emoji });
      }
      // 해당 인덱스 제거
      pool.splice(idx, 1);
      if (pool.length === 0 && i < need - 1) break;
    }
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

      {/* ✅ 랜덤 재료 넣기 (갯수 입력) */}
      <div className="mt-3 flex items-center gap-2">
        <label className="text-xs text-neutral-700">목표 개수</label>
        <Input
          type="number"
          inputMode="numeric"
          min={10}
          max={15}
          value={targetTotal}
          onChange={(e) => setTargetTotal(Number(e.currentTarget.value))}
          className="h-8 w-20"
        />
        <Button
          size="sm"
          onClick={handleBulkRandomFill}
          disabled={!!maxReached}
          className={cn(
            "rounded-lg",
            maxReached && "opacity-70 cursor-not-allowed"
          )}
          title="현재 담긴 개수에서 목표 개수까지 랜덤으로 채우기"
        >
          랜덤 재료 넣기
        </Button>

        {/* 작은 힌트 */}
        <span className="ml-auto text-[11px] text-neutral-500">
          현재 {stagedTotal}개 / 목표 {Math.min(15, targetTotal)}개
        </span>
      </div>
    </Card>
  );
}
