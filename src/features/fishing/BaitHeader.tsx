// src/features/fishing/ingredient-section/ui/BaitHeader.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PackageOpen, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  loading: boolean;
  baitCount: number;
  unitPrice: number;
  coupleId: string | null;
  onBuy: (count: number) => Promise<{
    ok: boolean;
    error?: string | null;
    bait_count: number | null;
  } | null>;
};

export default function BaitHeader({
  loading,
  baitCount,
  unitPrice,
  coupleId,
  onBuy,
}: Props) {
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyNum, setBuyNum] = useState(1);
  const [buying, setBuying] = useState(false);

  async function handleBuy() {
    if (!coupleId) return toast.error("커플 정보를 찾을 수 없어요.");
    if (buyNum <= 0) return toast.error("1개 이상 입력해 주세요.");
    try {
      setBuying(true);
      const row = await onBuy(buyNum);
      if (!row?.ok) {
        if (row?.error === "not_enough_gold")
          toast.warning("골드가 부족합니다!");
        else toast.error(`구매 실패: ${row?.error ?? "unknown"}`);
        return;
      }
      window.dispatchEvent(
        new CustomEvent("bait-consumed", {
          detail: { left: row.bait_count ?? 0 },
        })
      );
      toast.success(`미끼 ${buyNum}개를 구매했어요!`);
      setBuyOpen(false);
    } finally {
      setBuying(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center">
          <PackageOpen className="h-5 w-5 text-amber-700" />
        </span>
        <h3 className="text-base font-semibold text-zinc-800">미끼통</h3>

        <span
          className={cn(
            "ml-auto text-xs rounded-full border px-2.5 py-1 shadow-sm bg-white tabular-nums"
          )}
          aria-label="보유 미끼 수"
        >
          {loading ? "불러오는 중…" : <>🐟 x {baitCount}</>}
        </span>

        <Button
          size="sm"
          variant="secondary"
          className="ml-2 h-7 px-2 rounded-full"
          onClick={() => setBuyOpen(true)}
          title="미끼 상점 열기"
        >
          <ShoppingBag className="h-4 w-4" />
          <span className="sr-only">상점</span>
        </Button>
      </div>

      <Dialog open={buyOpen} onOpenChange={(v) => !buying && setBuyOpen(v)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>재료 상점</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm">
              현재 보유 : <b className="tabular-nums">🐟 x {baitCount}</b>
            </div>

            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">갯수</label>
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={buyNum}
                  onChange={(e) =>
                    setBuyNum(Math.max(1, Number(e.target.value || 1)))
                  }
                  disabled={buying}
                />
              </div>
              <div className="col-span-1">
                <label className="text-xs text-muted-foreground">총 가격</label>
                <div className="mt-1 h-9 grid place-items-center rounded-md border bg-gray-50 text-sm tabular-nums">
                  🪙{(unitPrice * Math.max(1, buyNum)).toLocaleString("ko-KR")}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={handleBuy} disabled={buying}>
              {buying ? "구매 중…" : "구매"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
