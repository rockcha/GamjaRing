// src/features/fishing/ingredient-section/IngredientFishingSection.tsx
"use client";

import { cn } from "@/lib/utils";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import BaitHeader from "./BaitHeader";
import BaitDragTile from "./BaitDragTile";
import BulkFishingPanel from "./BulkFishingPanel";
import BulkResultsModal from "./BulkResultsModal";
import { useBaitAndTanks } from "./useBaitAndTanks";
import { useBulkFishing } from "./useBulkFishing";
import { useEffect, useMemo, useRef } from "react"; // ← useRef 추가

type Props = {
  className?: string;
  dragDisabled?: boolean;
};

export default function IngredientFishingSection({
  className,
  dragDisabled = false,
}: Props) {
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

  /** ✅ 탱크 번호들 */
  const firstTankNo = useMemo(
    () => (tanks.length ? tanks[0].tank_no : 1),
    [tanks]
  );
  const lastTankNo = useMemo(
    () => (tanks.length ? tanks[tanks.length - 1].tank_no : 1),
    [tanks]
  );

  /**
   * ✅ 초기 일괄 채움 보정: “results가 생겼고, 모든 배치가 첫 어항으로만 채워져 온 경우”
   * → 단 1회, 전부 마지막 어항으로 치환
   */
  const didInitForBatchRef = useRef(false);

  // 결과 세트가 바뀌면 초기화 플래그 리셋
  useEffect(() => {
    didInitForBatchRef.current = false;
  }, [bulk.results]); // results가 새로 생기면 다시 한 번만 검사

  useEffect(() => {
    const results = bulk.results ?? [];
    if (!bulk.open || results.length === 0) return;
    if (didInitForBatchRef.current) return;

    const ids = results.map((r) => r.id);
    // “모든 배치가 1번(첫 어항)”으로 세팅되어 온 상태인지 체크
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
      didInitForBatchRef.current = true; // 이후에는 사용자 선택을 덮지 않음
    }
  }, [
    bulk.open,
    bulk.results,
    bulk.placements,
    bulk.setPlacements,
    firstTankNo,
    lastTankNo,
  ]);

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

      <BaitDragTile baitCount={baitCount} dragDisabled={dragDisabled} />

      <BulkFishingPanel
        baitCount={baitCount}
        bulkCount={bulk.bulkCount}
        setBulkCount={bulk.setBulkCount}
        busy={bulk.busy}
        onRun={bulk.run}
        tanksErr={tanksErr}
      />

      <BulkResultsModal
        open={bulk.open}
        setOpen={bulk.setOpen}
        results={bulk.results}
        placements={bulk.placements}
        setPlacements={(u) =>
          bulk.setPlacements(typeof u === "function" ? u : () => u)
        }
        tanks={tanks}
        /** 모달이 defaultTank를 참조하는 경로에 대비해 마지막 어항 전달 */
        defaultTank={lastTankNo}
        totalCaught={bulk.totalCaught}
        failCount={bulk.failCount}
        busy={bulk.busy}
        onSave={bulk.savePlacements}
      />
    </section>
  );
}
