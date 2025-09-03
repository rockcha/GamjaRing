"use client";

import supabase from "@/lib/supabase";
import { toast } from "sonner";
import { MATURE_MS, PLOT_COUNT } from "./types";
import type { PotatoFieldRow, PlotInfo, PlotState } from "./types";

// 내부 유틸
const now = () => new Date();
const iso = (d: Date) => d.toISOString();

function padTo9(a?: (string | null)[] | null): (string | null)[] {
  const base = Array.isArray(a) ? [...a] : [];
  while (base.length < PLOT_COUNT) base.push(null);
  return base.slice(0, PLOT_COUNT);
}

export function computePlotsInfo(row: PotatoFieldRow): PlotInfo[] {
  const arr = padTo9(row.plots_planted_at);
  const t = Date.now();

  return arr.map((v, i) => {
    if (!v) return { idx: i, state: "empty", plantedAt: null } as PlotInfo;
    const plantedAt = new Date(v);
    const elapsed = t - plantedAt.getTime();
    if (elapsed >= MATURE_MS) {
      return { idx: i, state: "ready", plantedAt } as PlotInfo;
    }
    return {
      idx: i,
      state: "growing",
      plantedAt,
      remainMs: Math.max(0, MATURE_MS - elapsed),
    } as PlotInfo;
  });
}

/** ✅ 테이블 존재 가정하에, couple 행을 보장 */
export async function ensureRow(coupleId: string): Promise<PotatoFieldRow> {
  // 1) select
  const { data, error } = await supabase
    .from("couple_potato_field")
    .select(
      "couple_id, harvested_count,  plots_planted_at, created_at, updated_at"
    )
    .eq("couple_id", coupleId)
    .maybeSingle();

  if (error && (error as any).code === "42P01") {
    // relation not exist
    console.error(
      "[potato] 테이블이 없습니다. 아래 SQL을 Supabase SQL Editor에서 1회 실행하세요."
    );
    console.error(`
      create table if not exists public.couple_potato_field (
        couple_id uuid primary key references public.couples(id) on delete cascade,
        harvested_count integer not null default 0,
 
        plots_planted_at timestamptz[9] default (array[null,null,null,null,null,null,null,null,null])::timestamptz[],
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        check (array_length(plots_planted_at, 1) = 9)
      );
    `);
    throw error;
  }

  if (data) {
    // 길이 보정
    const fixed: PotatoFieldRow = {
      ...data,
      plots_planted_at: padTo9(data.plots_planted_at),
    };
    return fixed;
  }

  // 2) 없으면 insert (9칸 null)
  const empty = Array(PLOT_COUNT).fill(null);
  const { data: ins, error: insErr } = await supabase
    .from("couple_potato_field")
    .insert({
      couple_id: coupleId,
      harvested_count: 0,

      plots_planted_at: empty,
    })
    .select()
    .single();

  if (insErr) throw insErr;
  return ins as PotatoFieldRow;
}

/** ✅ 내 감자 개수 가져오기 */
export async function getPotatoCount(coupleId: string): Promise<number> {
  const { data, error } = await supabase
    .from("couple_potato_field")
    .select("harvested_count")
    .eq("couple_id", coupleId)
    .maybeSingle();
  if (error) throw error;
  return (data?.harvested_count ?? 0) as number;
}

/** ✅ 감자 개수 증가(수확 시 사용) */
export async function addPotatoes(
  coupleId: string,
  delta: number
): Promise<number> {
  if (!Number.isFinite(delta) || delta <= 0) return getPotatoCount(coupleId);
  const { data, error } = await supabase
    .from("couple_potato_field")
    .select("harvested_count")
    .eq("couple_id", coupleId)
    .maybeSingle();

  if (error) throw error;

  const next = Math.max(0, (data?.harvested_count ?? 0) + delta);
  const { error: upErr } = await supabase
    .from("couple_potato_field")
    .update({ harvested_count: next })
    .eq("couple_id", coupleId);
  if (upErr) throw upErr;
  return next;
}

/** ✅ 감자 사용(차감) */
export async function usePotatoes(
  coupleId: string,
  delta: number
): Promise<number> {
  if (!Number.isFinite(delta) || delta <= 0) return getPotatoCount(coupleId);
  const { data, error } = await supabase
    .from("couple_potato_field")
    .select("harvested_count")
    .eq("couple_id", coupleId)
    .maybeSingle();
  if (error) throw error;

  const current = data?.harvested_count ?? 0;
  if (current < delta) {
    toast.error("감자가 부족합니다 🥔");
    return current;
  }
  const next = Math.max(0, current - delta);
  const { error: upErr } = await supabase
    .from("couple_potato_field")
    .update({ harvested_count: next })
    .eq("couple_id", coupleId);
  if (upErr) throw upErr;
  return next;
}

/** ✅ plots_planted_at 가져오기(길이 9 보정) */
export async function getPlotsPlantedAt(
  coupleId: string
): Promise<(string | null)[]> {
  const row = await ensureRow(coupleId);
  return padTo9(row.plots_planted_at);
}

/** ✅ 씨앗 심기: 해당 인덱스에 현재 시각 쓰기 (empty일 때만) */
export async function plantSeed(
  coupleId: string,
  index: number
): Promise<PotatoFieldRow> {
  if (index < 0 || index >= PLOT_COUNT) throw new Error("invalid index");
  const row = await ensureRow(coupleId);
  const arr = padTo9(row.plots_planted_at);

  if (arr[index] != null) {
    // 이미 심어져 있으면 그대로 반환
    return row;
  }
  arr[index] = iso(now());

  const { data, error } = await supabase
    .from("couple_potato_field")
    .update({ plots_planted_at: arr })
    .eq("couple_id", coupleId)
    .select()
    .single();

  if (error) throw error;
  return data as PotatoFieldRow;
}

/** ✅ 수확: 해당 인덱스가 ready면 harvested_count+1, 칸 비우기 */
export async function harvestPlot(
  coupleId: string,
  index: number
): Promise<PotatoFieldRow> {
  if (index < 0 || index >= PLOT_COUNT) throw new Error("invalid index");
  const row = await ensureRow(coupleId);
  const arr = padTo9(row.plots_planted_at);
  const v = arr[index];

  if (!v) return row; // 빈 칸
  const plantedAt = new Date(v).getTime();
  if (Date.now() - plantedAt < MATURE_MS) {
    // 아직 미성숙
    return row;
  }

  arr[index] = null;
  const nextCount = (row.harvested_count ?? 0) + 1;

  const { data, error } = await supabase
    .from("couple_potato_field")
    .update({ plots_planted_at: arr, harvested_count: nextCount })
    .eq("couple_id", coupleId)
    .select()
    .single();

  if (error) throw error;
  return data as PotatoFieldRow;
}
