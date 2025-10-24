// src/features/fishing/ingredient-section/ui/BaitHeader.tsx
"use client";

import { Button } from "@/components/ui/button";
import { PackageOpen, ShoppingBag, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
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
  /** (옵션) 과거 호환용: 더 이상 UI에서 X 버튼을 렌더링하지 않지만 타입은 유지 */
  onClose?: () => void;
};

export default function BaitHeader(props: Props) {
  const { loading, baitCount, unitPrice, coupleId, onBuy } = props;

  const [buyNum, setBuyNum] = useState(1);
  const [buying, setBuying] = useState(false);

  const totalPrice = useMemo(
    () => unitPrice * Math.max(1, buyNum || 1),
    [unitPrice, buyNum]
  );

  const inc = (n = 1) => setBuyNum((v) => Math.max(1, (v || 1) + n));
  const dec = (n = 1) => setBuyNum((v) => Math.max(1, (v || 1) - n));
  const setPreset = (n: number) => setBuyNum(Math.max(1, n));

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
    } finally {
      setBuying(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-3">
      {/* 헤더: 아이콘 · 타이틀 · (타이틀 바로 오른쪽에) 미끼 개수 */}
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center">
          <PackageOpen className="h-5 w-5 text-amber-700" />
        </span>

        <h3 className="text-base font-semibold text-zinc-800">미끼통</h3>

        {/* ⬅️ 타이틀 바로 오른쪽 배치 */}
        <span
          className={cn(
            "text-xs rounded-full border px-2.5 py-1 shadow-sm bg-white tabular-nums"
          )}
          aria-label="보유 미끼 수"
        >
          {loading ? "불러오는 중…" : <>🐟 x {baitCount}</>}
        </span>

        {/* 필요 시 우측 공간 확보 */}
        <div className="ml-auto" />
      </div>

      {/* 구분선 */}
      <div className="h-px w-full bg-border/70" />

      {/* 인라인 상점 영역 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        {/* 좌: 수량 컨트롤 */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">구매 수량</label>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => dec(1)}
              disabled={buying}
              aria-label="수량 감소"
            >
              <Minus className="h-4 w-4" />
            </Button>

            <input
              type="number"
              min={1}
              className="h-9 w-24 rounded-md border px-3 text-center text-sm tabular-nums"
              value={buyNum}
              onChange={(e) =>
                setBuyNum(Math.max(1, Number(e.target.value || 1)))
              }
              disabled={buying}
              aria-label="구매 수량"
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => inc(1)}
              disabled={buying}
              aria-label="수량 증가"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 프리셋 */}
          <div className="flex flex-wrap items-center gap-2">
            {[1, 5, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPreset(n)}
                disabled={buying}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition",
                  buyNum === n ? "bg-background shadow-sm" : "hover:bg-muted/50"
                )}
                aria-label={`${n}개 선택`}
              >
                ×{n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => inc(10)}
              disabled={buying}
              className="rounded-full border px-3 py-1 text-xs hover:bg-muted/50"
              aria-label="10개 추가"
            >
              +10
            </button>
          </div>
        </div>

        {/* 우: 가격 + 구매 */}
        <div className="space-y-2 sm:text-right">
          <label className="text-xs text-muted-foreground">총 가격</label>
          <div className="flex items-center gap-3 sm:justify-end">
            <div className="h-9 grid place-items-center rounded-md border bg-gray-50 px-3 text-sm tabular-nums">
              🪙{totalPrice.toLocaleString("ko-KR")}
            </div>
            <Button
              onClick={handleBuy}
              disabled={buying}
              className="gap-1.5"
              title="미끼 구매"
            >
              <ShoppingBag className="h-4 w-4" />
              {buying ? "구매 중…" : "구매"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
