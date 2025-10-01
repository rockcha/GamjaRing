// src/features/fishing/ingredient-section/IngredientFishingSection.tsx
"use client";

import { cn } from "@/lib/utils";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import BaitHeader from "./BaitHeader";
import BulkFishingPanel from "./BulkFishingPanel";
import BulkResultsModal from "./BulkResultsModal";
import { useBaitAndTanks } from "./useBaitAndTanks";
import { useBulkFishing } from "./useBulkFishing";
import { useEffect, useMemo, useRef, useState } from "react";
import WaitFishingDialog from "./WaitFishingDialog";

type Props = { className?: string };

export default function IngredientFishingSection({ className }: Props) {
  const { couple, fetchCoupleData } = useCoupleContext();
  const { user } = useUser();
  const coupleId = couple?.id ?? null;

  const {
    loading,
    baitCount,
    unitPrice,
    tanks,
    tanksErr,
    reload,
    setBaitCount,
    buyBait,
  } = useBaitAndTanks(coupleId, fetchCoupleData);

  const bulk = useBulkFishing({
    coupleId,
    userId: user?.id,
    partnerId: user?.partner_id,
    baitCount,
    setBaitCount,
    tanks,
    fetchCoupleData,
  });

  // ----- defaultTank 보정 로직 유지 -----
  const firstTankNo = useMemo(
    () => (tanks.length ? tanks[0].tank_no : 1),
    [tanks]
  );
  const lastTankNo = useMemo(
    () => (tanks.length ? tanks[tanks.length - 1].tank_no : 1),
    [tanks]
  );
  const didInitForBatchRef = useRef(false);
  useEffect(() => {
    didInitForBatchRef.current = false;
  }, [bulk.results]);
  useEffect(() => {
    const results = bulk.results ?? [];
    if (!bulk.open || results.length === 0) return;
    if (didInitForBatchRef.current) return;

    const ids = results.map((r) => r.id);
    const allFirst =
      ids.length > 0 &&
      ids.every((id) => (bulk.placements[id] ?? firstTankNo) === firstTankNo);

    if (allFirst) {
      bulk.setPlacements((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          next[id] = lastTankNo;
        });
        return next;
      });
      didInitForBatchRef.current = true;
    }
  }, [
    bulk.open,
    bulk.results,
    bulk.placements,
    bulk.setPlacements,
    firstTankNo,
    lastTankNo,
  ]);

  // ====== 5초 대기 → RPC 실행 ======
  const [waitOpen, setWaitOpen] = useState(false);
  const [waitPhase, setWaitPhase] = useState<"waiting" | "finishing">(
    "waiting"
  );
  const lockRef = useRef(false);

  async function handleRunWithDelay(countSnapshot: number) {
    if (lockRef.current) return;
    if (!baitCount || baitCount <= 0) return;

    lockRef.current = true;
    setWaitPhase("waiting");
    setWaitOpen(true);

    // 5초 대기 (GIF/문구 표시)
    await new Promise((r) => setTimeout(r, 5000));

    setWaitPhase("finishing");
    try {
      await bulk.run({ count: countSnapshot }); // ✅ 스냅샷 그대로 사용
    } finally {
      setWaitOpen(false);
      lockRef.current = false;
    }
  }

  return (
    <section className={cn("flex flex-col gap-3 min-h-0", className)}>
      <BaitHeader
        loading={loading}
        baitCount={baitCount}
        unitPrice={unitPrice}
        coupleId={coupleId}
        onBuy={async (count) => {
          if (!coupleId) return null;
          const row = await buyBait(coupleId, count);
          const left = row?.bait_count ?? 0;
          setBaitCount(left);
          await reload();
          return row;
        }}
      />

      {/* 미끼 표시 (미니멀) */}
      <div
        className="rounded-2xl border bg-white p-4 grid place-items-center"
        title="보유 미끼"
      >
        <div className="relative w-[96px] h-[96px] rounded-2xl border bg-white shadow-sm grid place-items-center text-[64px] leading-none select-none border-zinc-200">
          🐟
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          보유 미끼{" "}
          <span className="ml-1 font-semibold tabular-nums">
            × {Math.max(0, baitCount).toLocaleString()}
          </span>
        </div>
      </div>

      {/* 일괄 낚시 패널 (대기 중에도 비활성화) */}
      <BulkFishingPanel
        baitCount={baitCount}
        bulkCount={bulk.bulkCount}
        setBulkCount={bulk.setBulkCount}
        busy={bulk.busy || waitOpen}
        onRun={handleRunWithDelay} // ✅ count 스냅샷을 받음
        tanksErr={tanksErr}
      />

      {/* 결과 모달 */}
      <BulkResultsModal
        open={bulk.open}
        setOpen={bulk.setOpen}
        results={bulk.results}
        placements={bulk.placements}
        setPlacements={(u) =>
          bulk.setPlacements(typeof u === "function" ? u : () => u)
        }
        tanks={tanks}
        defaultTank={lastTankNo}
        totalCaught={bulk.totalCaught}
        failCount={bulk.failCount}
        busy={bulk.busy}
        onSave={bulk.savePlacements}
      />

      {/* 대기 다이얼로그 */}
      <WaitFishingDialog open={waitOpen} phase={waitPhase} />
    </section>
  );
}
