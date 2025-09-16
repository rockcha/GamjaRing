// src/features/kitchen/IngredientFishingSection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const DND_MIME = "application/x-ingredient"; // 기존 드롭존과 호환 유지

/* ------------------------------- */
/* 🐟 이모지 전용 드래그 고스트 유틸 */
/* ------------------------------- */
let dragGhostEl: HTMLDivElement | null = null;
function setEmojiDragImage(e: React.DragEvent, emoji: string, fontPx = 48) {
  if (dragGhostEl) {
    dragGhostEl.remove();
    dragGhostEl = null;
  }
  const ghost = document.createElement("div");
  ghost.textContent = emoji;
  ghost.style.position = "fixed";
  ghost.style.top = "-1000px";
  ghost.style.left = "-1000px";
  ghost.style.fontSize = `${fontPx}px`;
  ghost.style.lineHeight = "1";
  ghost.style.pointerEvents = "none";
  ghost.style.userSelect = "none";
  ghost.style.background = "transparent";
  document.body.appendChild(ghost);
  dragGhostEl = ghost;
  e.dataTransfer!.setDragImage(ghost, fontPx / 2, fontPx / 2);
}
function cleanupDragGhost() {
  if (dragGhostEl) {
    dragGhostEl.remove();
    dragGhostEl = null;
  }
}

/* ------------------------------- */
/* 타입/상수                       */
/* ------------------------------- */
type Props = {
  className?: string;
  dragDisabled?: boolean; // 낚시 중일 때 true → 드래그 off
};
const BAIT_EMOJI = "🐟";
const MAX_RENDER = 60; // 너무 많을 때 UI 보호용

export default function IngredientFishingSection({
  className,
  dragDisabled = false,
}: Props) {
  const { couple, fetchCoupleData } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [baitCount, setBaitCount] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(20);

  // 구매 다이얼로그
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyNum, setBuyNum] = useState<number>(1);
  const [buying, setBuying] = useState(false);

  /* ------------------------------- */
  /* 미끼 수/단가 로드               */
  /* ------------------------------- */
  async function loadBait() {
    if (!coupleId) {
      setBaitCount(0);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("couple_bait_inventory")
        .select("bait_count, unit_price")
        .eq("couple_id", coupleId)
        .maybeSingle();
      if (error) throw error;
      setBaitCount(data?.bait_count ?? 0);
      setUnitPrice(data?.unit_price ?? 20);
    } catch (e: any) {
      console.warn(e);
      setBaitCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBait();
  }, [coupleId]);

  // 드롭 시 소비 성공하면 외부에서 발생시키는 이벤트에 반응해 갯수 즉시 반영
  useEffect(() => {
    function onBait(e: Event) {
      const d =
        (e as CustomEvent<{ count?: number; left?: number }>).detail || {};
      if (typeof d.left === "number") {
        // 남은 수가 넘어오면 절대값으로 반영
        setBaitCount(d.left);
      } else {
        // 아니면 count(차감 수) 만큼 감소 (기본 1)
        const dec = Math.max(1, Number(d.count ?? 1));
        setBaitCount((c) => Math.max(0, c - dec));
      }
    }
    window.addEventListener("bait-consumed", onBait as any);
    return () => window.removeEventListener("bait-consumed", onBait as any);
  }, []);

  /* ------------------------------- */
  /* 드래그 스타트                   */
  /* ------------------------------- */
  const handleDragStart = (e: React.DragEvent) => {
    if (dragDisabled || baitCount <= 0) {
      e.preventDefault();
      return;
    }
    // 기존 드롭존과 호환: MIME/페이로드 형태 유지
    // type으로 'bait'를 명시해 드롭 처리 분기 가능
    const payload = JSON.stringify({ type: "bait", emoji: BAIT_EMOJI });
    e.dataTransfer.setData(DND_MIME, payload);
    e.dataTransfer.effectAllowed = "copy";
    setEmojiDragImage(e, BAIT_EMOJI, 48);
  };

  /* ------------------------------- */
  /* 미끼 구매                       */

  // Helper: RPC가 배열로 오든 객체로 오든 1행 꺼내기
  function unwrapRpcRow<T>(data: T | T[] | null): T | null {
    return Array.isArray(data) ? data[0] ?? null : data ?? null;
  }

  async function buyBait() {
    if (!coupleId) return toast.error("커플 정보를 찾을 수 없어요.");
    if (buyNum <= 0) return toast.error("1개 이상 입력해 주세요.");

    try {
      setBuying(true);
      const { data, error } = await supabase.rpc("buy_bait", {
        p_couple_id: coupleId,
        p_count: buyNum,
      });
      if (error) throw error;

      const row = unwrapRpcRow(data); // ✅ 핵심: 1행만 안전하게 꺼내기
      if (!row?.ok) {
        if (row?.error === "not_enough_gold")
          toast.warning("골드가 부족합니다!");
        else toast.error(`구매 실패: ${row?.error ?? "unknown"}`);
        return;
      }

      // ✅ 즉시 반영 (이모지 갯수 바로 증가)
      setBaitCount(row.bait_count ?? ((c) => c + buyNum));
      window.dispatchEvent(
        new CustomEvent("bait-consumed", {
          detail: { left: row.bait_count ?? 0 },
        })
      );
      await fetchCoupleData?.();

      await fetchCoupleData?.(); // 골드/상단 UI 갱신
      toast.success(`미끼 ${buyNum}개를 구매했어요!`);
      setBuyOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "구매 중 오류가 발생했어요.");
    } finally {
      setBuying(false);
    }
  }

  /* ------------------------------- */
  /* 렌더링                          */
  /* ------------------------------- */
  // 너무 많으면 MAX_RENDER만 렌더링하고 요약칩 하나를 추가
  const tilesToRender = useMemo(() => {
    const n = Math.max(0, baitCount);
    const visible = Math.min(n, MAX_RENDER);
    return { visible, rest: Math.max(0, n - visible) };
  }, [baitCount]);

  return (
    <section className={cn("flex flex-col gap-3 min-h-0", className)}>
      {/* 헤더 */}
      <div className="flex items-center">
        <span className="inline-flex h-7 w-7 items-center justify-center mr-1">
          <PackageOpen className="h-5 w-5 text-amber-700" />
        </span>
        <h3 className="text-base font-semibold text-zinc-800">미끼통</h3>

        <button
          className={cn(
            "ml-auto text-xs rounded-full border px-2.5 py-1 shadow-sm",
            "bg-white hover:bg-gray-50"
          )}
          onClick={() => setBuyOpen(true)}
          title="클릭해서 미끼 구매"
        >
          {loading ? "불러오는 중…" : `보유 미끼: ${baitCount}개`}
        </button>
      </div>

      {/* 🐟 미끼 이모지 그리드 (드래그 가능) */}
      <div
        className={cn(
          "grid rounded-2xl",
          "gap-[6px] sm:gap-2",
          "grid-cols-[repeat(auto-fit,minmax(56px,1fr))]",
          "sm:grid-cols-[repeat(auto-fit,minmax(64px,1fr))]",
          "md:grid-cols-[repeat(auto-fit,minmax(72px,1fr))]"
        )}
      >
        {baitCount <= 0 && (
          <div className="col-span-full text-xs sm:text-sm text-muted-foreground border rounded-xl p-3 sm:p-4 text-center">
            보유한 미끼가 없어요. 상단 배지를 클릭하여 구매하세요.
          </div>
        )}

        {Array.from({ length: tilesToRender.visible }).map((_, i) => (
          <button
            key={i}
            draggable={!dragDisabled && baitCount > 0}
            onDragStart={handleDragStart}
            onDragEnd={cleanupDragGhost}
            className={cn(
              "relative w-full aspect-square rounded-lg border bg-white shadow-sm overflow-hidden",
              "grid place-items-center text-[clamp(16px,3.8vw,32px)]",
              "transition will-change-transform hover:shadow-md hover:-translate-y-0.5",
              dragDisabled
                ? "opacity-60 cursor-not-allowed"
                : "cursor-grab active:cursor-grabbing",
              "border-zinc-200"
            )}
            title="미끼 드래그해서 낚시 시작"
          >
            <span className="leading-none select-none">{BAIT_EMOJI}</span>
            {dragDisabled && (
              <span
                className="absolute inset-0 bg-white/50 backdrop-blur-[1px]"
                aria-hidden
              />
            )}
          </button>
        ))}

        {tilesToRender.rest > 0 && (
          <div
            className={cn(
              "relative w-full aspect-square rounded-lg border bg-white shadow-sm overflow-hidden",
              "grid place-items-center text-xs text-muted-foreground",
              "border-dashed border-zinc-300"
            )}
            title={`추가 ${tilesToRender.rest}개`}
          >
            +{tilesToRender.rest}
          </div>
        )}
      </div>

      {/* 🛒 재료 상점 (미끼 구매 다이얼로그) */}
      <Dialog open={buyOpen} onOpenChange={(v) => !buying && setBuyOpen(v)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>재료 상점</DialogTitle>
            <DialogDescription>
              미끼를 구매하면 보유 골드가 차감돼요. 단가:{" "}
              <b className="tabular-nums">
                🪙{unitPrice.toLocaleString("ko-KR")}
              </b>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm">
              현재 보유 미끼: <b className="tabular-nums">{baitCount}</b>개
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
            <Button onClick={buyBait} disabled={buying}>
              {buying ? "구매 중…" : "구매"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setBuyOpen(false)}
              disabled={buying}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
