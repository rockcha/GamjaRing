// src/features/fishing/ingredient-section/hooks/useBulkFishing.ts
"use client";

import { useMemo, useState, useEffect } from "react";
import supabase from "@/lib/supabase";
import { toast } from "sonner";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { rarityDir, rarityEn, rarityWeight, unwrapRpcRow } from "./utils";
import type { BulkCatch, Placements, Rarity, TankRow } from "./types";
import {
  rollFishByIngredient,
  type RollResult,
} from "@/features/fishing/rollfish";

type Params = {
  coupleId: string | null;
  userId?: string | null;
  partnerId?: string | null;
  baitCount: number;
  setBaitCount: (n: number) => void;
  tanks: TankRow[];
  fetchCoupleData?: () => any;
};

type RunOptions = { count?: number };

export function useBulkFishing({
  coupleId,
  userId,
  partnerId,
  baitCount,
  setBaitCount,
  tanks,
  fetchCoupleData,
}: Params) {
  const [busy, setBusy] = useState(false);
  const [bulkCount, setBulkCount] = useState<number>(1);
  const [results, setResults] = useState<BulkCatch[] | null>(null);
  const [failCount, setFailCount] = useState<number>(0);
  const [placements, setPlacements] = useState<Placements>({});
  const [open, setOpen] = useState(false);

  // ✅ 기본 배치 어항: 마지막 어항
  const defaultTank = useMemo(
    () => (tanks.length ? tanks[tanks.length - 1].tank_no : 1),
    [tanks]
  );

  useEffect(() => {
    if (!results) {
      setPlacements({});
      return;
    }
    const next: Placements = {};
    for (const r of results) next[r.id] = defaultTank || 1;
    setPlacements(next);
  }, [results, defaultTank]);

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

  const totalCaught = useMemo(
    () => (results ?? []).reduce((a, b) => a + b.count, 0),
    [results]
  );

  // ✅ 제출 스냅샷 수량을 직접 받도록 수정
  async function run(opts?: RunOptions) {
    if (!coupleId) return toast.error("커플 정보를 찾을 수 없어요.");

    const want = Number.isFinite(opts?.count as number)
      ? Number(opts!.count)
      : bulkCount;

    if (want < 1) return toast.error("1개 이상 입력해 주세요.");
    if (want > baitCount)
      return toast.warning(
        `보유 미끼가 부족합니다. 최대 ${baitCount}개까지 가능합니다.`
      );

    try {
      setBusy(true);
      setResults(null);
      setFailCount(0);

      // 1) 미끼 차감 (UI에서 지연 후 호출)
      const { data: cdata, error: cerr } = await supabase.rpc("consume_bait", {
        p_couple_id: coupleId,
        p_count: want,
      });
      if (cerr) throw cerr;

      const crow = unwrapRpcRow<{
        ok: boolean;
        error?: string | null;
        bait_count: number | null;
      }>(cdata);

      if (!crow?.ok) {
        toast[crow?.error === "not_enough_bait" ? "warning" : "error"](
          crow?.error === "not_enough_bait"
            ? "미끼가 부족합니다!"
            : `미끼 차감 실패: ${crow?.error ?? "unknown"}`
        );
        return;
      }

      const newCnt = crow.bait_count ?? Math.max(0, baitCount - want);
      setBaitCount(newCnt);
      window.dispatchEvent(
        new CustomEvent("bait-consumed", { detail: { left: newCnt } })
      );

      // 2) 롤
      const rolls: RollResult[] = await Promise.all(
        Array.from({ length: want }).map(() =>
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

        const { data: rows, error } = await supabase
          .from("aquarium_entities")
          .select("id,name_ko,rarity")
          .in("id", uniq);
        if (error) throw error;

        const infoMap = new Map<string, { label: string; rarity: Rarity }>();
        (rows ?? []).forEach((r: any) => {
          const rar: Rarity =
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

        // 스티커 반영 (실패는 경고만)
        try {
          const calls = Array.from(countMap.entries()).map(
            async ([id, qty]) => {
              const meta = infoMap.get(id);
              const rKo: Rarity = meta?.rarity ?? "일반";
              const rEn = rarityEn(rKo);
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

        catches = Array.from(countMap.entries())
          .map(([id, n]) => {
            const info = infoMap.get(id)!;
            return {
              id,
              label: info.label,
              rarity: info.rarity,
              image: `/aquarium/${rarityDir(info.rarity)}/${id}.png`,
              count: n,
              isNew: newSet.has(id),
            };
          })
          .sort((a, b) =>
            a.rarity === b.rarity
              ? b.count - a.count
              : rarityWeight(b.rarity) - rarityWeight(a.rarity)
          );

        // 희귀 이상 알림
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
                    // @ts-ignore
                    senderId: userId,
                    receiverId: partnerId,
                    type: "낚시성공",
                    itemName: c.label,
                  })
                )
              );
            }
          }
        } catch (e) {
          console.warn("알림 전송 실패(무시 가능):", e);
        }
      }

      setResults(catches);
      setOpen(true);
      toast.success(
        `일괄 낚시 완료! 성공 ${successIds.length} / 실패 ${fails}`
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "일괄 낚시 중 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function savePlacements(auto = false) {
    if (!coupleId) {
      toast.error("커플 정보를 찾을 수 없어요.");
      return false;
    }
    if (!results || results.length === 0) return true;

    const items = results.map((r) => ({
      entity_id: r.id,
      tank_no: placements[r.id] || defaultTank || 1,
      qty: r.count,
    }));

    try {
      const { data, error } = await supabase.rpc("bulk_add_inventory", {
        p_couple: coupleId,
        p_items: items,
      });
      if (error) throw error;

      const ins = (data as any)?.inserted_count ?? items.length;
      const sk = (data as any)?.skipped_count ?? 0;
      toast.success(
        `${auto ? "자동 " : ""}저장 완료 (+${ins}${sk ? `, 스킵 ${sk}` : ""})`
      );

      await fetchCoupleData?.();
      setResults(null);
      setOpen(false);
      return true;
    } catch (e: any) {
      console.error("[bulk] savePlacements error:", e);
      toast.error(e?.message ?? "저장에 실패했어요.");
      return false;
    }
  }

  return {
    open,
    setOpen,
    busy,
    bulkCount,
    setBulkCount,
    results,
    placements,
    setPlacements,
    failCount,
    grouped,
    totalCaught,
    defaultTank,
    run, // ✅ 이제 run({ count }) 지원
    savePlacements,
  };
}
