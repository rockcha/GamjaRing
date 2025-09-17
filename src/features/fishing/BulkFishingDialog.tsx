"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import {
  rollFishByIngredient,
  type RollResult,
} from "@/features/fishing/rollfish";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/* ───────── Types & utils ───────── */
type Rarity = "일반" | "희귀" | "에픽" | "전설";

type BulkCatch = {
  id: string;
  label: string;
  rarity: Rarity;
  image: string;
  count: number;
  isNew?: boolean; // ✅ 이번에 처음 수집된 개체인지 표시
};

const rarityMap: Record<string, Rarity> = {
  일반: "일반",
  희귀: "희귀",
  에픽: "에픽",
  전설: "전설",
  레어: "희귀",
};

function rarityWeight(r: Rarity) {
  return r === "전설" ? 4 : r === "에픽" ? 3 : r === "희귀" ? 2 : 1;
}
function rarityDir(r: Rarity) {
  return r === "일반"
    ? "common"
    : r === "희귀"
    ? "rare"
    : r === "에픽"
    ? "epic"
    : "legend";
}
function rarityEn(r: Rarity) {
  // DB enum: 'common' | 'rare' | 'epic' | 'legendary'
  return r === "일반"
    ? "common"
    : r === "희귀"
    ? "rare"
    : r === "에픽"
    ? "epic"
    : "legendary";
}
function buildImageSrc(id: string, rarity: Rarity) {
  return `/aquarium/${rarityDir(rarity)}/${id}.png`;
}
function unwrapRpcRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

/* ✨ 희귀도별 은은한 테마 클래스 */
function classesByRarity(r: Rarity) {
  switch (r) {
    case "일반":
      return {
        card: "bg-neutral-50 border-neutral-200",
        imgBorder: "border-neutral-200",
        metaText: "text-neutral-700/80",
      };
    case "희귀":
      return {
        card: "bg-blue-50 border-blue-200",
        imgBorder: "border-blue-200",
        metaText: "text-blue-700/80",
      };
    case "에픽":
      return {
        card: "bg-purple-50 border-purple-200",
        imgBorder: "border-purple-200",
        metaText: "text-purple-700/80",
      };
    case "전설":
    default:
      return {
        card: "bg-amber-50 border-amber-200",
        imgBorder: "border-amber-200",
        metaText: "text-amber-700/80",
      };
  }
}

/* ───────── Props ───────── */
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId: string | null;
  tanksCount: number;
  baitCount: number;
  setBaitCount: React.Dispatch<React.SetStateAction<number>>;
  fetchCoupleData?: () => Promise<any> | void;
  userId?: string | null;
  partnerId?: string | null;
};

export default function BulkFishingDialog({
  open,
  onOpenChange,
  coupleId,
  tanksCount,
  baitCount,
  setBaitCount,
  fetchCoupleData,
  userId,
  partnerId,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number>(1);
  const [targetTankNo, setTargetTankNo] = useState<number>(1);
  const [results, setResults] = useState<BulkCatch[] | null>(null);
  const [failCount, setFailCount] = useState<number>(0);

  const totalCaught = useMemo(
    () => (results ?? []).reduce((a, b) => a + b.count, 0),
    [results]
  );

  async function runBulkFishing() {
    if (!coupleId) return toast.error("커플 정보를 찾을 수 없어요.");
    if (count < 1) return toast.error("1개 이상 입력해 주세요.");
    if (count > baitCount)
      return toast.warning(
        `보유 미끼가 부족합니다. 최대 ${baitCount}개까지 가능합니다.`
      );

    const safeTank = Math.max(1, Math.min(targetTankNo, tanksCount));

    try {
      setBusy(true);
      setResults(null);
      setFailCount(0);

      // 1) 미끼 차감
      const { data: cdata, error: cerr } = await supabase.rpc("consume_bait", {
        p_couple_id: coupleId,
        p_count: count,
      });
      if (cerr) throw cerr;

      const crow = unwrapRpcRow<{
        ok: boolean;
        error?: string | null;
        bait_count: number | null;
      }>(cdata);
      if (!crow?.ok) {
        if (crow?.error === "not_enough_bait")
          toast.warning("미끼가 부족합니다!");
        else toast.error(`미끼 차감 실패: ${crow?.error ?? "unknown"}`);
        return;
      }
      const newCnt = crow.bait_count ?? Math.max(0, baitCount - count);
      setBaitCount(newCnt);
      window.dispatchEvent(
        new CustomEvent("bait-consumed", { detail: { left: newCnt } })
      );

      // 2) 롤 수행
      const rolls = await Promise.all(
        Array.from({ length: count }).map(() =>
          rollFishByIngredient("bait" as any)
        )
      );

      const successIds = rolls
        .filter((r) => r.ok)
        .map((r) => (r as any).fishId as string);
      const fails = rolls.length - successIds.length;
      setFailCount(fails);

      let catches: BulkCatch[] = [];
      if (successIds.length > 0) {
        const uniq = Array.from(new Set(successIds));

        // ✅ 3) 인벤토리 넣기 전에 "기존 수집 여부" 확인
        // couple_aquarium_collection에 없는 entity_id면 이번이 최초 수집 → NEW
        const { data: existedRows, error: existedErr } = await supabase
          .from("couple_aquarium_collection")
          .select("entity_id")
          .eq("couple_id", coupleId)
          .in("entity_id", uniq);
        if (existedErr) throw existedErr;

        const existed = new Set<string>(
          (existedRows ?? []).map((r) => r.entity_id)
        );
        const newSet = new Set<string>(uniq.filter((id) => !existed.has(id)));

        // 4) 메타 조회
        const { data: rows, error } = await supabase
          .from("aquarium_entities")
          .select("id,name_ko,rarity")
          .in("id", uniq);
        if (error) throw error;

        const infoMap = new Map<string, { label: string; rarity: Rarity }>();
        rows?.forEach((r) => {
          const rar =
            (["일반", "희귀", "에픽", "전설"] as Rarity[])[
              Math.max(
                0,
                ["일반", "희귀", "에픽", "전설"].indexOf(r.rarity as Rarity)
              )
            ] ?? "일반";
          infoMap.set(r.id, { label: r.name_ko ?? r.id, rarity: rar });
        });

        const countMap = new Map<string, number>();
        successIds.forEach((id) =>
          countMap.set(id, (countMap.get(id) || 0) + 1)
        );

        // ✅ 4.5) StickerBoard 인벤토리(sticker_inventory) 반영 (여러 마리 집계)
        try {
          const calls = Array.from(countMap.entries()).map(
            async ([id, qty]) => {
              const meta = infoMap.get(id);
              const rKo: Rarity = meta?.rarity ?? "일반";
              const rEn = rarityEn(rKo); // 'common' | 'rare' | 'epic' | 'legendary'
              // grant_fish_sticker(p_couple uuid, p_fish_id text, p_rarity rarity_kind, p_qty int)
              const { error: gErr } = await supabase.rpc("grant_fish_sticker", {
                p_couple: coupleId,
                p_fish_id: id,
                p_rarity: rEn,
                p_qty: qty,
              });
              if (gErr) throw gErr;
            }
          );

          const settled = await Promise.allSettled(calls);
          const failed = settled.filter((s) => s.status === "rejected");
          if (failed.length > 0) {
            console.warn(
              "[fishing] grant_fish_sticker partial failures:",
              failed
            );
            toast.warning(
              `스티커 인벤토리 반영 중 일부 실패(${failed.length})`
            );
          }
        } catch (e) {
          console.error("[fishing] grant_fish_sticker error:", e);
          toast.warning("스티커 인벤토리 반영에 실패했어요.");
        }

        // 5) 결과 카드 구성
        catches = Array.from(countMap.entries())
          .map(([id, n]) => {
            const info = infoMap.get(id)!;
            return {
              id,
              label: info.label,
              rarity: info.rarity,
              image: buildImageSrc(id, info.rarity),
              count: n,
              isNew: newSet.has(id), // ✅ 표시
            };
          })
          .sort((a, b) =>
            a.rarity === b.rarity
              ? b.count - a.count
              : rarityWeight(b.rarity) - rarityWeight(a.rarity)
          );

        // 6) 아쿠아리움 인벤토리 반영 (트리거로 collection upsert)
        const rowsToInsert = successIds.map((id) => ({
          couple_id: coupleId!,
          entity_id: id,
          tank_no: safeTank,
        }));
        const { error: insErr } = await supabase
          .from("couple_aquarium_inventory")
          .insert(rowsToInsert);
        if (insErr) {
          toast.warning(`인벤토리 일부 반영 실패: ${insErr.message}`);
        } else {
          await fetchCoupleData?.();
        }

        // 7) 알림 (희귀 이상 신규 어종 위주)
        try {
          if (userId && partnerId) {
            const rareUnique = catches
              .filter((c) => c.rarity === "에픽" || c.rarity === "전설")
              .reduce((acc, cur) => {
                if (!acc.some((x) => x.id === cur.id)) acc.push(cur);
                return acc;
              }, [] as typeof catches);

            if (rareUnique.length > 0) {
              await Promise.allSettled(
                rareUnique.map((c) =>
                  sendUserNotification({
                    senderId: userId!,
                    receiverId: partnerId!,
                    type: "낚시성공",
                    itemName: c.label,
                  } as any)
                )
              );
            }
          }
        } catch (e) {
          console.warn("알림 전송 실패(무시 가능):", e);
        }
      }

      setResults(catches);
      toast.success(
        `일괄 낚시 완료! (${safeTank}번 어항) 성공 ${successIds.length} / 실패 ${fails}`
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "일괄 낚시 중 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      {/* ✅ 모달 가로 확장 + 내부 스크롤 구조 */}
      <DialogContent className="w-full max-w-[940px] p-0 overflow-hidden rounded-2xl">
        <div className="flex flex-col max-h-[78vh] bg-white">
          {/* 🔝 헤더 고정 */}
          <DialogHeader className="p-6 pb-3 sticky top-0 bg-white/90 backdrop-blur z-10 border-b">
            <DialogTitle>일괄 낚시</DialogTitle>
            <DialogDescription>
              미끼 개수를 입력해 한 번에 낚시하고, 결과를 모아서 보여드립니다.
            </DialogDescription>
          </DialogHeader>

          {/* 🧱 바디: 스크롤 영역 */}
          <div className="px-6 py-4 overflow-auto">
            <Card className="p-4">
              {/* 한 줄 배치 + 모바일 줄바꿈 */}
              <div className="flex flex-wrap items-end gap-3">
                {/* 보유 미끼 */}
                <div className="w-[140px] sm:w-[160px]">
                  <label className="text-xs text-muted-foreground">
                    보유 미끼
                  </label>
                  <div className="mt-1 h-9 grid place-items-center rounded-md border bg-gray-50 text-sm tabular-nums">
                    🪝x{baitCount}
                  </div>
                </div>

                {/* 사용할 개수 */}
                <div className="w-[140px] sm:w-[160px]">
                  <label className="text-xs text-muted-foreground">
                    사용 개수
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, baitCount)}
                    className="mt-1 w-full h-9 rounded-md border px-3 text-sm"
                    value={count}
                    onChange={(e) =>
                      setCount(Math.max(1, Number(e.target.value || 1)))
                    }
                    disabled={busy || baitCount <= 0}
                  />
                </div>

                {/* 담을 어항 */}
                <div className="w-[160px] sm:w-[180px]">
                  <label className="text-xs text-muted-foreground">
                    아쿠아리움 선택
                  </label>
                  <select
                    className="mt-1 w-full h-9 rounded-md border px-3 text-sm bg-white"
                    value={targetTankNo}
                    onChange={(e) =>
                      setTargetTankNo(
                        Math.max(
                          1,
                          Math.min(Number(e.target.value || 1), tanksCount)
                        )
                      )
                    }
                    disabled={busy}
                  >
                    {Array.from({ length: tanksCount }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} 번
                      </option>
                    ))}
                  </select>
                </div>

                {/* 오른쪽 정렬 버튼 (남는 공간 밀어내기) */}
                <div className="ms-auto">
                  <Button
                    onClick={runBulkFishing}
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
            </Card>

            {/* 결과 영역 */}
            {results && (
              <div className="space-y-3 mt-4">
                <div className="text-sm">
                  <b>요약:</b> {totalCaught}마리 잡음 / 실패 {failCount}회{" "}
                  {" · "}
                  종류 {results.length}종
                </div>

                {results.length > 0 ? (
                  // ✅ 열 수 늘려서 세로 길이 줄임
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {results.map((f) => {
                      const theme = classesByRarity(f.rarity);
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
                            {/* ✅ NEW 뱃지 (우상단, 빨간색, 소문자 new) */}
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
                                (ev.currentTarget as HTMLImageElement).onerror =
                                  null;
                                (ev.currentTarget as HTMLImageElement).src =
                                  "/aquarium/fish_placeholder.png";
                              }}
                            />
                          </div>
                          <div className="mt-2 text-sm font-semibold truncate">
                            {f.label}
                          </div>
                          <div className={cn("text-[11px]", theme.metaText)}>
                            {f.rarity} · {f.count}마리
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    잡힌 물고기가 없어요.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 🔚 푸터 고정: 닫기 버튼 항상 접근 가능 */}
          <div className="px-6 py-3 border-t bg-white sticky bottom-0 z-10">
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setResults(null);
                  onOpenChange(false);
                }}
                disabled={busy}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
