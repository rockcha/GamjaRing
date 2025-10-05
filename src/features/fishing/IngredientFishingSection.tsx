// src/features/fishing/ingredient-section/IngredientFishingSection.tsx
"use client";

import { cn } from "@/lib/utils";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import BulkResultsModal from "./BulkResultsModal";
import { useBaitAndTanks } from "./useBaitAndTanks";
import { useBulkFishing } from "./useBulkFishing";
import { useEffect, useMemo, useRef, useState } from "react";
import WaitFishingDialog from "./WaitFishingDialog";
import { Button } from "@/components/ui/button";
import { Fish } from "lucide-react";

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

    // 5초 대기 (애니/문구)
    await new Promise((r) => setTimeout(r, 5000));

    setWaitPhase("finishing");
    try {
      await bulk.run({ count: countSnapshot }); // ✅ 스냅샷 그대로 사용
    } finally {
      setWaitOpen(false);
      lockRef.current = false;
    }
  }

  // 미니 위젯 모드: 퀵-낚시만
  const canFish = !!baitCount && baitCount > 0 && !bulk.busy && !waitOpen;
  const quickCount = Math.min(bulk.bulkCount || 10, baitCount || 0);

  return (
    <section
      className={cn(
        "w-[220px] rounded-2xl border bg-white/90 backdrop-blur-md p-3",
        "grid grid-cols-[64px_1fr] gap-3 items-center",
        className
      )}
      title="미끼통"
    >
      {/* 아이콘 + 잔량 */}
      <div className="relative w-16 h-16 rounded-xl border bg-white grid place-items-center text-[40px] leading-none select-none">
        🐟
      </div>

      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">보유 미끼</div>
        <div className="mt-0.5 text-base font-semibold tabular-nums truncate">
          × {Math.max(0, baitCount).toLocaleString()}
        </div>

        <div className="mt-2 flex items-center gap-2">
          {/* 퀵-낚시 */}
          <Button
            size="sm"
            className="h-8 px-3 bg-emerald-600 text-white disabled:opacity-60"
            disabled={!canFish || quickCount <= 0}
            onClick={() => handleRunWithDelay(quickCount)}
            title={
              quickCount > 0
                ? `일괄 낚시 시작 (×${quickCount})`
                : "미끼가 필요해요"
            }
          >
            <Fish className="h-4 w-4 mr-1" />
            낚시
          </Button>
        </div>
      </div>

      {/* 결과 모달 (기존 유지) */}
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
