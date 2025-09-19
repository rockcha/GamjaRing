// src/features/fishing/ingredient-section/ui/BulkFishingPanel.tsx
"use client";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  baitCount: number;
  bulkCount: number;
  setBulkCount: (n: number) => void;
  busy: boolean;
  onRun: () => void;
  tanksErr?: string | null;
};

export default function BulkFishingPanel({
  baitCount,
  bulkCount,
  setBulkCount,
  busy,
  onRun,
  tanksErr,
}: Props) {
  return (
    <>
      <Separator className="my-1" />
      <Card className="p-4 bg-slate-50">
        <div className="flex items-end gap-3">
          <div className="w-[150px]">
            <label className="text-xs text-muted-foreground">사용 개수</label>
            <input
              type="number"
              min={1}
              max={Math.max(1, baitCount)}
              className="mt-1 w-full h-9 rounded-md border px-3 text-sm bg-white"
              value={bulkCount}
              onChange={(e) =>
                setBulkCount(Math.max(1, Number(e.target.value || 1)))
              }
              disabled={busy || baitCount <= 0}
            />
          </div>
          <div className="ml-auto">
            <Button
              onClick={onRun}
              disabled={busy || baitCount <= 0}
              className={cn(
                "h-9 min-w-[120px]",
                busy ? "opacity-80 cursor-not-allowed" : ""
              )}
            >
              {busy ? "진행 중…" : "일괄 낚시 시작"}
            </Button>
          </div>
        </div>
        {tanksErr && (
          <div className="text-[11px] text-amber-600 mt-2">{tanksErr}</div>
        )}
      </Card>
    </>
  );
}
