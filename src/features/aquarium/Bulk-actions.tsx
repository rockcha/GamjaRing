"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePortalTarget } from "./usePortalTarget";
import { useState } from "react";

export type BulkSelectEntry = {
  id: string;
  label: string;
  image: string;
  count: number; // 보유 개수
  price?: number; // 판매가 계산용(선택)
  qty: number; // 선택 수량
};

type CommonProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entries: BulkSelectEntry[];
  onChangeQty: (id: string, qty: number) => void;
};

export function BulkSellDialog({
  open,
  onOpenChange,
  entries,
  onChangeQty,
  onConfirm,
}: CommonProps & {
  onConfirm: (entries: BulkSelectEntry[]) => Promise<void> | void;
}) {
  const target = usePortalTarget();

  // ✅ 총액: (판매가=price/2 내림) * qty 합계
  const totalGold = entries.reduce((sum, it) => {
    const sellUnit = Math.floor((it.price ?? 0) / 2);
    return sum + sellUnit * (it.qty ?? 0);
  }, 0);

  return (
    target &&
    createPortal(
      <div
        className={cn(
          "fixed inset-0 z-[92] flex items-center justify-center bg-black/50 transition-opacity",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden={!open}
      >
        <div
          className="w-[520px] max-w-[92vw] rounded-2xl bg-white p-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-base font-bold">판매</h4>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-md border hover:bg-gray-50"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {entries.length === 0 ? (
            <div className="py-8 text-center text-slate-600">
              선택된 항목이 없어요.
            </div>
          ) : (
            <>
              <div className="max-h-[40vh] overflow-auto space-y-2">
                {entries.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 border rounded-lg p-2"
                  >
                    <img
                      src={it.image}
                      alt={it.label}
                      className="w-12 h-12 object-contain bg-white rounded-md ring-1 ring-gray-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{it.label}</div>
                      {typeof it.price === "number" && (
                        <div className="text-xs text-slate-600">
                          판매가{" "}
                          <b className="text-amber-700">
                            {Math.floor(it.price / 2).toLocaleString("ko-KR")}
                          </b>{" "}
                          골드
                        </div>
                      )}
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={it.count}
                      className="w-16 h-9 text-center border rounded-md"
                      value={it.qty}
                      onChange={(e) => {
                        const v = Math.max(
                          1,
                          Math.min(
                            it.count,
                            Math.floor(Number(e.target.value || 1))
                          )
                        );
                        onChangeQty(it.id, v);
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* ✅ 하단: 왼쪽에 총액, 오른쪽에 액션 버튼 */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="text-sm">
                  총액{" "}
                  <b className="text-amber-700">
                    {totalGold.toLocaleString("ko-KR")}
                  </b>{" "}
                  골드
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    취소
                  </Button>
                  <Button
                    onClick={() => onConfirm(entries)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    판매
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>,
      target
    )
  );
}

export function BulkMoveDialog({
  open,
  onOpenChange,
  entries,
  onChangeQty,
  tankOptions,
  currentTankNo,

  onConfirm,
}: CommonProps & {
  tankOptions: Array<{ tank_no: number; title?: string; fish_cnt?: number }>;
  currentTankNo: number;

  onConfirm: (
    entries: BulkSelectEntry[],
    toTank: number
  ) => Promise<void> | void;
}) {
  const target = usePortalTarget();
  const filtered = tankOptions
    .map((t) => t.tank_no)
    .filter((n) => n !== currentTankNo);
  const [toTank, setToTank] = useState<number | "">("");

  return (
    target &&
    createPortal(
      <div
        className={cn(
          "fixed inset-0 z-[92] flex items-center justify-center bg-black/50 transition-opacity",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden={!open}
      >
        <div
          className="w-[560px] max-w-[92vw] rounded-2xl bg-white p-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-base font-bold">이동</h4>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-md border hover:bg-gray-50"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {entries.length === 0 ? (
            <div className="py-8 text-center text-slate-600">
              선택된 항목이 없어요.
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm text-slate-700">목표 아쿠아리움</span>
                <select
                  className="text-sm border rounded-md px-2 py-1 bg-white"
                  value={toTank}
                  onChange={(e) =>
                    setToTank((v) =>
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                >
                  <option value="">선택하세요</option>
                  {filtered.map((n) => {
                    const meta = tankOptions.find((t) => t.tank_no === n);
                    return (
                      <option key={n} value={n}>
                        #{n} {meta?.title ?? ""}{" "}
                        {meta?.fish_cnt != null ? `(${meta.fish_cnt}마리)` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="max-h-[40vh] overflow-auto space-y-2">
                {entries.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 border rounded-lg p-2"
                  >
                    <img
                      src={it.image}
                      alt={it.label}
                      className="w-12 h-12 object-contain bg-white rounded-md ring-1 ring-gray-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{it.label}</div>
                      <div className="text-xs text-slate-600">
                        보유 {it.count}마리
                      </div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={it.count}
                      className="w-16 h-9 text-center border rounded-md"
                      value={it.qty}
                      onChange={(e) => {
                        const v = Math.max(
                          1,
                          Math.min(
                            it.count,
                            Math.floor(Number(e.target.value || 1))
                          )
                        );
                        onChangeQty(it.id, v);
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  취소
                </Button>
                <Button
                  onClick={() =>
                    typeof toTank === "number" && onConfirm(entries, toTank)
                  }
                  className="bg-violet-600 hover:bg-violet-700 text-white" // ✅ 비올렛톤 확정
                  disabled={typeof toTank !== "number"}
                >
                  이동
                </Button>
              </div>
            </>
          )}
        </div>
      </div>,
      target
    )
  );
}
