// src/features/fishing/ingredient-section/hooks/useBaitAndTanks.ts
"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { unwrapRpcRow } from "./utils";
import type { TankRow } from "./types";

type State = {
  loading: boolean;
  baitCount: number;
  unitPrice: number;
  tanks: TankRow[];
  tanksErr: string | null;
};

export function useBaitAndTanks(
  coupleId: string | null,
  fetchCoupleData?: () => any
) {
  const [state, setState] = useState<State>({
    loading: false,
    baitCount: 0,
    unitPrice: 20,
    tanks: [],
    tanksErr: null,
  });

  async function load() {
    if (!coupleId) {
      setState((s) => ({
        ...s,
        baitCount: 0,
        tanks: [{ tank_no: 1, title: "1 번" }],
      }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    try {
      const [{ data: baitRow, error: bErr }, { data: tankRows, error: tErr }] =
        await Promise.all([
          supabase
            .from("couple_bait_inventory")
            .select("bait_count, unit_price")
            .eq("couple_id", coupleId)
            .maybeSingle(),
          supabase
            .from("aquarium_tanks")
            .select("tank_no,title")
            .eq("couple_id", coupleId)
            .order("tank_no", { ascending: true }),
        ]);

      // ❗ 탱크 조회 실패가 baitCount 로딩을 막지 않도록 분리 처리
      if (bErr) throw bErr;

      const rows: TankRow[] = tErr
        ? [] // 탱크만 실패하면 숫자 목록으로 폴백
        : (tankRows ?? []).map((r: any) => ({
            tank_no: Number(r.tank_no),
            title: r.title ?? null,
          }));

      setState({
        loading: false,
        baitCount: baitRow?.bait_count ?? 0,
        unitPrice: baitRow?.unit_price ?? 20,
        tanks: rows.length ? rows : [{ tank_no: 1, title: "1 번" }],
        tanksErr: tErr
          ? "어항 정보를 불러오지 못했어요. 숫자 목록으로 대체합니다."
          : null,
      });
    } catch (e: any) {
      console.warn(e);
      setState({
        loading: false,
        baitCount: 0,
        unitPrice: 20,
        tanks: [{ tank_no: 1, title: "1 번" }],
        tanksErr: "어항 정보를 불러오지 못했어요. 숫자 목록으로 대체합니다.",
      });
    }
  }

  // ✅ 초기 마운트 & coupleId 변경 시 자동 로딩
  useEffect(() => {
    load();
  }, [coupleId]);

  // bait-consumed 이벤트 동기화
  useEffect(() => {
    function onBait(e: Event) {
      const d =
        (e as CustomEvent<{ count?: number; left?: number }>).detail || {};
      if (typeof d.left === "number") {
        setState((s) => ({ ...s, baitCount: d.left! }));
      } else {
        const dec = Math.max(1, Number(d.count ?? 1));
        setState((s) => ({ ...s, baitCount: Math.max(0, s.baitCount - dec) }));
      }
    }
    window.addEventListener("bait-consumed", onBait as any);
    return () => window.removeEventListener("bait-consumed", onBait as any);
  }, []);

  async function buyBait(coupleId: string, count: number) {
    const { data, error } = await supabase.rpc("buy_bait", {
      p_couple_id: coupleId,
      p_count: count,
    });
    if (error) throw error;
    const row = unwrapRpcRow<{
      ok: boolean;
      error?: string | null;
      bait_count: number | null;
    }>(data);
    return row;
  }

  return {
    ...state,
    reload: load,
    setBaitCount: (n: number) => setState((s) => ({ ...s, baitCount: n })),
    buyBait,
  };
}
