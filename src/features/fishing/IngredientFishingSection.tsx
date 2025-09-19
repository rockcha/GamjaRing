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
          // 최신 수량 반영
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
        defaultTank={bulk.defaultTank}
        totalCaught={bulk.totalCaught}
        failCount={bulk.failCount}
        busy={bulk.busy}
        onSave={bulk.savePlacements} // ✅ 닫기 시 자동 저장 처리 포함
      />
    </section>
  );
}
