// src/features/fishing/ingredient-section/ui/BulkResultsModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RARITY_ORDER, classesByRarity } from "./utils";
import type { BulkCatch, Placements, Rarity, TankRow } from "./types";
import { useMemo } from "react";

type Props = {
  open: boolean;
  setOpen: (b: boolean) => void;
  results: BulkCatch[] | null;
  placements: Placements;
  setPlacements: (updater: (prev: Placements) => Placements) => void;
  tanks: TankRow[];
  defaultTank: number;
  totalCaught: number;
  failCount: number;
  busy: boolean;
  onSave: (auto?: boolean) => Promise<boolean>;
};

export default function BulkResultsModal({
  open,
  setOpen,
  results,
  placements,
  setPlacements,
  tanks,
  defaultTank,
  totalCaught,
  failCount,
  busy,
  onSave,
}: Props) {
  const tankOptions = tanks.length ? tanks : [{ tank_no: 1, title: "1 번" }];

  const grouped = useMemo(() => {
    const g: Record<Rarity, BulkCatch[]> = {
      전설: [],
      에픽: [],
      희귀: [],
      일반: [],
    };
    for (const r of results ?? []) g[r.rarity].push(r);
    return g;
  }, [results]);

  async function handleOpenChange(next: boolean) {
    // ✅ 닫힐 때 자동 저장
    if (!next && results?.length) {
      await onSave(true);
      // onSave(true)가 성공하면 내부에서 setOpen(false) 처리했다고 가정
      // 실패 시에는 모달을 다시 열어둬서 사용자가 수정 가능
      return;
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[980px] p-0 overflow-hidden rounded-2xl">
        <div className="flex flex-col max-h-[80vh] bg-white">
          <DialogHeader className="p-6 pb-4 sticky top-0 bg-white/90 backdrop-blur z-20 border-b">
            <DialogTitle>일괄 낚시 결과</DialogTitle>
            <div className="text-sm text-muted-foreground">
              성공 {totalCaught} / 실패 {failCount} · 종류{" "}
              {results?.length ?? 0}
            </div>
          </DialogHeader>

          <div className="px-6 py-4 overflow-auto grow">
            {results && results.length > 0 ? (
              RARITY_ORDER.map((ra) =>
                grouped[ra].length ? (
                  <section key={ra} className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">
                        {ra}{" "}
                        <span className="text-xs text-muted-foreground">
                          {grouped[ra].length}종
                        </span>
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {grouped[ra].map((f) => {
                        const theme = classesByRarity(f.rarity);
                        const sel = placements[f.id] ?? defaultTank ?? 1;
                        return (
                          <div
                            key={f.id}
                            className={cn(
                              "rounded-xl border p-2 shadow-sm transition-colors",
                              theme.card
                            )}
                          >
                            <div
                              className={cn(
                                "relative w-full aspect-square rounded-lg border grid place-items-center overflow-hidden bg-white",
                                theme.imgBorder
                              )}
                            >
                              {f.isNew && (
                                <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-red-500 text-white px-1.5 py-0.5 text-[10px] font-bold leading-none shadow">
                                  new
                                </span>
                              )}
                              <img
                                src={f.image}
                                alt={f.label}
                                className="w-full h-full object-contain"
                                draggable={false}
                                loading="lazy"
                                onError={(ev) => {
                                  (
                                    ev.currentTarget as HTMLImageElement
                                  ).onerror = null;
                                  (ev.currentTarget as HTMLImageElement).src =
                                    "/aquarium/fish_placeholder.png";
                                }}
                              />
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold truncate">
                                {f.label}
                              </div>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                                  theme.pill
                                )}
                              >
                                {f.rarity}
                              </span>
                            </div>

                            <div
                              className={cn("text-[11px] my-1", theme.metaText)}
                            >
                              수량 x{f.count}
                            </div>

                            <Select
                              value={String(sel)}
                              onValueChange={(v) =>
                                setPlacements((prev) => ({
                                  ...prev,
                                  [f.id]: Number(v),
                                }))
                              }
                              disabled={busy}
                            >
                              <SelectTrigger className="h-8 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {tankOptions.map((t) => (
                                  <SelectItem
                                    key={`${f.id}-${t.tank_no}`}
                                    value={String(t.tank_no)}
                                  >
                                    {t.title && t.title.trim().length > 0
                                      ? t.title
                                      : `${t.tank_no} 번`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null
              )
            ) : (
              <div className="text-sm text-muted-foreground">
                잡힌 물고기가 없어요.
              </div>
            )}
          </div>

          <div className="sticky bottom-0 z-20 bg-white/95 border-t">
            <div className="px-6 py-3 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {results?.length
                  ? `저장 대기: 총 ${totalCaught}마리`
                  : `저장할 항목이 없습니다.`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onSave(false)}
                  disabled={!results?.length || busy}
                >
                  선택대로 저장
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                  disabled={busy}
                >
                  닫기
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
