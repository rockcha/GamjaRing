// src/features/cooking/CookingBoard.tsx
"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCoupleContext } from "@/contexts/CoupleContext";
import supabase from "@/lib/supabase";
import IngredientGrid from "@/features/cooking/IngredientGrid";
import PotArea from "@/features/cooking/PotArea";
import { INGREDIENTS, type IngredientTitle } from "@/features/cooking/type";
import {
  chooseResult, // async: 실패 시 DB에서 랜덤 지급(+인벤토리 반영)
  getDishIdByName, // 요리만 ID 조회해서 cook_and_store 호출
} from "@/features/cooking/cookingRules";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// 디자인 효과(아이콘/이모지 파티클 X, 과한 연출 배제)
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

const FAIL_PROB = 0.15;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type CookResult =
  | {
      kind: "dish";
      name: string;
      emoji: string;
      price: number;
      id?: number;
    }
  | {
      kind: "fail";
      name: string;
      emoji: string;
      price: number;
    };

/* -------------------------------------------------------------------------- */
/* ResultTicketSheet: 미니멀 "티켓 시트"                                       */
/*  - 효과용 이모지/파티클 없이, 절제된 하이라이트만                          */
/*  - 희귀: 한 번만 짧게 glow                                                  */
/*  - dish: spring pop + 슬쩍 지나가는 하이라이트 스윕                         */
/* -------------------------------------------------------------------------- */

function ResultTicketSheet({
  open,
  onOpenChange,
  result,
  onClose,
  resultKey,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  result: CookResult | null;
  onClose: () => void;
  resultKey: number; // ✅ 결과마다 재생 보장
}) {
  const prefersReduced = useReducedMotion();

  const isFail = result?.kind === "fail";
  const isDish = result?.kind === "dish";
  const isRare = isFail && (result?.price ?? 0) > 10;

  const tone: "fail" | "dish" | "rare" = isFail
    ? isRare
      ? "rare"
      : "fail"
    : "dish";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-md w-[92vw] sm:w-[520px] p-0 overflow-hidden rounded-2xl border bg-white",
          "shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)]",
          tone === "fail" && "border-rose-200",
          tone === "dish" && "border-emerald-200",
          tone === "rare" && "border-amber-200"
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={resultKey} // ✅ 같은 tone 연속이라도 재생됨
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: prefersReduced ? 0 : 0.22 }}
            className="p-4"
          >
            {/* 헤더 */}
            <DialogHeader className="p-0 mb-3">
              <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em]">
                {tone === "fail"
                  ? "요리 실패"
                  : tone === "dish"
                  ? "요리 완성"
                  : "희귀 아이템"}
              </DialogTitle>
            </DialogHeader>

            {/* 본문 티켓 */}
            <motion.div
              className={cn(
                "relative rounded-xl border bg-white px-3 py-3",
                tone === "fail" && "border-rose-200",
                tone === "dish" && "border-emerald-200",
                tone === "rare" && "border-amber-200"
              )}
              initial={
                prefersReduced
                  ? undefined
                  : tone === "dish"
                  ? { scale: 0.96, opacity: 0.88 }
                  : undefined
              }
              animate={
                prefersReduced
                  ? undefined
                  : tone === "fail"
                  ? { x: [0, -1, 1, -0.5, 0.5, 0] }
                  : tone === "dish"
                  ? { scale: 1, opacity: 1 }
                  : undefined
              }
              transition={
                prefersReduced
                  ? { duration: 0 }
                  : tone === "dish"
                  ? { type: "spring", stiffness: 360, damping: 24 }
                  : { duration: 0.22, ease: "easeOut" }
              }
            >
              {/* 레어: 짧은 glow 한 번 */}
              {!prefersReduced && tone === "rare" && (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  initial={{ boxShadow: "0 0 0 0 rgba(245,158,11,0.0)" }}
                  animate={{ boxShadow: "0 0 36px 0 rgba(245,158,11,0.22)" }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                />
              )}

              {/* Dish: 하이라이트 스윕 */}
              {!prefersReduced && tone === "dish" && (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  initial={{
                    opacity: 0,
                    background:
                      "linear-gradient(100deg, rgba(16,185,129,0) 30%, rgba(16,185,129,0.08) 45%, rgba(16,185,129,0) 60%)",
                  }}
                  animate={{ opacity: [0, 1, 0], x: ["-20%", "120%", "140%"] }}
                  transition={{ duration: 0.65, ease: "easeOut" }}
                  style={{ mixBlendMode: "multiply" }}
                />
              )}

              <div className="flex items-center gap-3">
                {/* 아이템 자체 이모지는 노출 (효과용 이모지는 사용 안함) */}
                <div className="text-4xl leading-none select-none">
                  {result?.emoji}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight truncate">
                    {result?.name}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    가격: {result?.price}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 안내문 */}
            <p
              className={cn(
                "mt-3 text-xs text-muted-foreground",
                tone === "fail" && "text-rose-700",
                tone === "dish" && "text-emerald-700",
                tone === "rare" && "text-amber-700"
              )}
            >
              {tone === "fail"
                ? "다음엔 재료의 구성과 수량을 조절해보세요."
                : tone === "dish"
                ? "완성된 요리는 인벤토리에 저장되었습니다."
                : "희귀 아이템이 인벤토리에 추가되었습니다!"}
            </p>
          </motion.div>
        </AnimatePresence>

        <DialogFooter className="px-4 pb-4">
          <Button
            onClick={onClose}
            className={cn(
              "w-full",
              tone === "fail" && "bg-rose-600 hover:bg-rose-700 text-white",
              tone === "dish" &&
                "bg-emerald-600 hover:bg-emerald-700 text-white",
              tone === "rare" &&
                "bg-gradient-to-r from-amber-500 via-fuchsia-500 to-purple-600 hover:brightness-110 text-white"
            )}
          >
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* CookingBoard: 메인                                                          */
/* -------------------------------------------------------------------------- */

export default function CookingBoard() {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [order, setOrder] = useState<IngredientTitle[]>([]);
  const [counts, setCounts] = useState<Record<IngredientTitle, number>>(
    {} as any
  );
  const [refreshAt, setRefreshAt] = useState<number>(Date.now());

  const total = useMemo(() => order.length, [order]);
  const canCook = total >= 10 && total <= 15;

  function addIngredient(title: IngredientTitle) {
    if (total >= 15) {
      toast.warning("최대 15개까지 넣을 수 있어요.");
      return;
    }
    setOrder((prev) => [...prev, title]);
    setCounts((prev) => ({ ...prev, [title]: (prev[title] ?? 0) + 1 }));
  }

  function removeOne(title: IngredientTitle) {
    setOrder((prev) => {
      const idx = prev.lastIndexOf(title);
      if (idx === -1) return prev;
      const cloned = [...prev];
      cloned.splice(idx, 1);
      return cloned;
    });
    setCounts((prev) => {
      const cur = (prev[title] ?? 0) - 1;
      const next = { ...prev } as Record<IngredientTitle, number>;
      if (cur <= 0) delete next[title];
      else next[title] = cur;
      return next;
    });
  }

  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<null | CookResult>(null);
  const [resultKey, setResultKey] = useState(0); // ✅ 애니메이션 재트리거용

  async function handleCook() {
    if (!canCook) {
      toast.error("재료는 10개 이상 15개 이하로 넣어주세요.");
      return;
    }
    if (!coupleId) {
      toast.error("커플 ID가 필요합니다.");
      return;
    }

    try {
      const outcome = await chooseResult({
        order,
        counts,
        failProb: FAIL_PROB,
        coupleId,
      });

      if (outcome.kind === "dish") {
        const dishId = await getDishIdByName(outcome.name);
        if (!dishId) {
          toast.error("요리 ID를 찾지 못했어요.");
          return;
        }

        const countsArray = Object.entries(counts).map(([title, num]) => ({
          title,
          num,
        }));

        const { error } = await supabase.rpc("cook_and_store", {
          p_couple_id: coupleId,
          p_counts: countsArray,
          p_outcome: "dish",
          p_dish_id: dishId,
          p_fail_id: null,
          p_qty: 1,
        });

        if (error) {
          console.error("cook_and_store:", error);
          toast.error(`인벤토리 업데이트 실패: ${error.message ?? "오류"}`);
          return;
        }
      }
      // 실패는 chooseResult 내부 RPC에서 이미 인벤토리 +1 처리됨.

      setResult(outcome as CookResult);
      setResultKey((k) => k + 1); // ✅ 결과마다 증가 → 애니메이션 재실행
      setOpen(true);
      resetAll();
      setRefreshAt(Date.now());
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "요리 처리 중 오류가 발생했어요.");
    }
  }

  function resetAll() {
    setOrder([]);
    setCounts({} as any);
  }

  if (!coupleId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        커플 ID가 필요합니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 좌측: 인벤토리 */}
      <div className="lg:col-span-1">
        <IngredientGrid
          coupleId={coupleId}
          stagedMap={counts}
          refreshAt={refreshAt}
          onPick={(title) => addIngredient(title)}
          onClickWhenEmpty={(title) => {
            /* 상점 이동/가이드 등 연결 가능 */
          }}
          maxReached={total >= 15}
        />
      </div>

      {/* 우측: 냄비 */}
      <div className="lg:col-span-1">
        <PotArea
          total={total}
          canCook={canCook}
          counts={counts}
          onRemoveOne={(t) => removeOne(t)}
          onCook={handleCook}
          onReset={resetAll}
        />
      </div>

      {/* 결과 다이얼로그 */}
      <ResultTicketSheet
        open={open}
        onOpenChange={setOpen}
        result={result}
        onClose={() => setOpen(false)}
        resultKey={resultKey} // ✅
      />
    </div>
  );
}
