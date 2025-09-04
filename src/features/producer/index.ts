// src/features/producer/index.ts
"use client";

import supabase from "@/lib/supabase";
import { PRODUCERS } from "./type";

// DB에 들어가는 형태
export type ProducerState = "idle" | "producing" | "ready";
export type FieldProducer = {
  title: string; // 예: "낙농 헛간"
  state: ProducerState; // "idle" | "producing" | "ready"
  started_at: string | null; // ISO8601(UTC) | null
};

// 상수(메타)에서 찾기: title → meta
export function getProducerMetaByTitle(title: string) {
  return PRODUCERS.find((p) => p.name === title) ?? null;
}

// 진행률(0~1): producing일 때만 유효. ready면 1, idle은 0.
export function getProgress(fp: FieldProducer): number {
  if (fp.state === "idle") return 0;
  if (fp.state === "ready") return 1;

  const meta = getProducerMetaByTitle(fp.title);
  if (!meta || !fp.started_at) return 0;

  const elapsedHr =
    (Date.now() - new Date(fp.started_at).getTime()) / (1000 * 60 * 60);
  const ratio = elapsedHr / meta.timeSec;
  return Math.max(0, Math.min(1, ratio));
}

/* ---------------- DB Helpers ---------------- */

// coupleId 기준 현재 producers 가져오기
export async function fetchFieldProducers(
  coupleId: string
): Promise<FieldProducer[]> {
  const { data, error } = await supabase
    .from("couple_potato_field")
    .select("producers")
    .eq("couple_id", coupleId)
    .maybeSingle();

  if (error) throw error;
  return (data?.producers as FieldProducer[]) ?? [];
}

// 전체 producers 교체 저장
export async function saveFieldProducers(
  coupleId: string,
  producers: FieldProducer[]
) {
  const { error } = await supabase
    .from("couple_potato_field")
    .update({ producers })
    .eq("couple_id", coupleId);

  if (error) throw error;
}

/* ---------------- Mutations ---------------- */

// 특정 producer 추가 (기본 idle)
export async function addProducer(coupleId: string, title: string) {
  const arr = await fetchFieldProducers(coupleId);
  arr.push({ title, state: "idle", started_at: null });
  await saveFieldProducers(coupleId, arr);
}

// 특정 인덱스 제거
export async function removeProducer(coupleId: string, index: number) {
  const arr = await fetchFieldProducers(coupleId);
  if (index < 0 || index >= arr.length) return;
  arr.splice(index, 1);
  await saveFieldProducers(coupleId, arr);
}

// 생산 시작: state=producing, started_at=now
export async function startProduction(coupleId: string, index: number) {
  const arr = await fetchFieldProducers(coupleId);
  const item = arr[index];
  if (!item) return;

  // idle/ready 모두 from-scratch 로 시작 가능하게 할지 정책에 따라
  arr[index] = {
    ...item,
    state: "producing",
    started_at: new Date().toISOString(),
  };
  await saveFieldProducers(coupleId, arr);
}

// 시간이 다 되었는지 체크해서 ready로 바꿔주기(수동 호출용)
export async function markReadyIfDone(coupleId: string, index: number) {
  const arr = await fetchFieldProducers(coupleId);
  const item = arr[index];
  if (!item) return;

  const meta = getProducerMetaByTitle(item.title);
  if (!meta || item.state !== "producing" || !item.started_at) return;

  const elapsedHr =
    (Date.now() - new Date(item.started_at).getTime()) / (1000 * 60 * 60);
  if (elapsedHr >= meta.timeSec) {
    arr[index] = { ...item, state: "ready" };
    await saveFieldProducers(coupleId, arr);
  }
}

// 생산물 수집 후 초기화(+ TODO: kitchen API로 재료 증가)
export async function collectAndReset(coupleId: string, index: number) {
  const arr = await fetchFieldProducers(coupleId);
  const item = arr[index];
  if (!item) return;

  // ✅ TODO: kitchen API 연동하여 item.title 에 해당하는 생산소의 재료를 증가 처리
  // await kitchenApi.deposit(producedItems);

  // 수집 후 idle로 초기화
  arr[index] = { ...item, state: "idle", started_at: null };
  await saveFieldProducers(coupleId, arr);
}
