"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
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

// ⬇️ 디자인 효과 (아이콘/애니메이션) — 효과용 이모지는 사용 안함
import { motion, AnimatePresence } from "framer-motion";
import { XCircle, Trophy, UtensilsCrossed } from "lucide-react";

const FAIL_PROB = 0.15;

/* ────────────────────────────────────────────────────────────────────────────
   ResultTicketSheet: 결과 다이얼로그의 미니멀 "티켓 시트" 버전
   - 희귀: 은은한 외곽 글로우만 추가
   - 효과용 이모지 사용 없음(아이템 자체 이모지는 그대로 노출)
──────────────────────────────────────────────────────────────────────────── */

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

function ResultTicketSheet({
  open,
  onOpenChange,
  result,
  onClose,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  result: CookResult | null;
  onClose: () => void;
}) {
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
            key={tone}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.22 }}
            className="p-4"
          >
            {/* 헤더: 상태 아이콘 + 타이틀 */}
            <DialogHeader className="p-0 mb-3">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  {tone === "fail"
                    ? "요리 실패"
                    : tone === "dish"
                    ? "요리 완성"
                    : "희귀 아이템"}
                </DialogTitle>
              </div>
            </DialogHeader>

            {/* 티켓 본문 카드 */}
            <motion.div
              className={cn(
                "relative rounded-xl border bg-white px-3 py-3",
                tone === "fail" && "border-rose-200",
                tone === "dish" && "border-emerald-200",
                tone === "rare" && "border-amber-200"
              )}
              animate={
                tone === "fail"
                  ? { x: [0, -2, 2, -1, 1, 0] }
                  : tone === "dish"
                  ? { scale: [1, 1.02, 1] }
                  : undefined
              }
              transition={{ duration: 0.28 }}
            >
              {/* 희귀만 은은한 외곽 글로우 */}
              {tone === "rare" && (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(245,158,11,0.0)",
                      "0 0 40px 0 rgba(245,158,11,0.25)",
                      "0 0 0 0 rgba(245,158,11,0.0)",
                    ],
                  }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              )}

              <div className="flex items-center gap-3">
                {/* 아이템 자체 이모지는 유지 */}
                <div className="text-4xl leading-none select-none">
                  {result?.emoji}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{result?.name}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    가격: {result?.price}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 안내문 */}
            <p
              className={cn(
                "mt-3 text-xs",
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

/* ────────────────────────────────────────────────────────────────────────────
   CookingBoard: 메인 보드
──────────────────────────────────────────────────────────────────────────── */

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

  // 결과 파생값
  const isFail = result?.kind === "fail";
  const isTrash = isFail && (result?.price ?? 0) <= 10; // 가격 ≤ 10 → 실패(일반)
  const isDish = result?.kind === "dish";
  const isRare = isFail && (result?.price ?? 0) > 10; // 실패지만 가격 > 10 → 희귀

  async function handleCook() {
    if (!canCook)
      return toast.error("재료는 10개 이상 15개 이하로 넣어주세요.");
    if (!coupleId) return toast.error("커플 ID가 필요합니다.");

    try {
      const outcome = await chooseResult({
        order,
        counts,
        failProb: FAIL_PROB,
        coupleId,
      });

      if (outcome.kind === "dish") {
        // 요리 결과는 기존 프로시저 (호환 유지)
        const dishId = await getDishIdByName(outcome.name);
        if (!dishId) return toast.error("요리 ID를 찾지 못했어요.");

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
          return toast.error(
            `인벤토리 업데이트 실패: ${error.message ?? "오류"}`
          );
        }
      }
      // 실패(outcome.kind === "fail")는 chooseResult 내부 RPC에서 이미 인벤토리 +1 처리됨.

      setResult(outcome as CookResult);
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
            /* 상점 이동/가이드 등 */
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

      {/* 결과 다이얼로그 - 미니멀 티켓 시트 */}
      <ResultTicketSheet
        open={open}
        onOpenChange={setOpen}
        result={result}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
