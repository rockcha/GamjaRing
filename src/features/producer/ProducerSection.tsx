// src/features/producer/ProducerSection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { Skeleton } from "@/components/ui/skeleton";
import ProducerCard from "./ProducerCard";
import { fetchFieldProducers, startProduction, collectAndReset } from "./index";
import type { FieldProducer } from "./index";
import supabase from "@/lib/supabase";
import BrowseProducersButton from "./BrowseProducersButton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  INGREDIENT_EMOJI,
  type IngredientTitle,
} from "@/features/kitchen/type";
import { PRODUCERS } from "./type";
import { addIngredients } from "@/features/kitchen/kitchenApi";
import { Loader2, Play, Package } from "lucide-react"; // ⬅️ 아이콘 추가

function isClientReady(it: FieldProducer) {
  if (it.state === "ready") return true;
  if (it.state !== "producing" || !it.started_at) return false;

  const meta = PRODUCERS.find((p) => p.name === it.title);
  const hours = meta?.timeSec ?? 0;
  if (!hours) return false;

  const startMs = new Date(it.started_at).getTime();
  if (Number.isNaN(startMs)) return false;
  const durMs = Math.max(1, Math.round(hours * 3600 * 1000));
  const done = Date.now() >= startMs + durMs;
  return done;
}

export default function ProducerSection() {
  const { user } = useUser();
  const coupleId = user?.couple_id ?? null;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FieldProducer[]>([]);

  // ── 일괄 작업 상태/결과
  const [collectBusy, setCollectBusy] = useState(false); // ⬅️ 수거 로딩
  const [startBusy, setStartBusy] = useState(false); // ⬅️ 생산 로딩
  const anyBusy = collectBusy || startBusy; // ⬅️ 둘 중 하나라도 로딩이면 true

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkGained, setBulkGained] = useState<IngredientTitle[]>([]);
  const [bulkRotten, setBulkRotten] = useState<IngredientTitle[]>([]);

  const load = async () => {
    if (!coupleId) return;
    setLoading(true);
    try {
      const arr = await fetchFieldProducers(coupleId);
      setItems(arr);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (!coupleId) return;
    const ch = supabase
      .channel("realtime-producers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couple_potato_field",
          filter: `couple_id=eq.${coupleId}`,
        },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  const total = items.length;
  const producing = useMemo(
    () => items.filter((i) => i.state === "producing").length,
    [items]
  );
  const ready = useMemo(
    () => items.filter((i) => isClientReady(i)).length,
    [items]
  );
  const idle = useMemo(
    () => items.filter((i) => i.state === "idle").length,
    [items]
  );

  if (!coupleId) {
    return (
      <div className="text-sm text-neutral-600">
        커플 연결 후 이용할 수 있어요.
      </div>
    );
  }

  // ───────────────────────── helpers ─────────────────────────
  const decideRottenIndex = (total: number) => {
    const willRot = Math.random() < 0.2;
    if (!willRot || total <= 0) return null;
    return Math.floor(Math.random() * total);
  };

  // ───────────────────────── bulk: 일괄 수거 ─────────────────────────
  const handleCollectAllReady = async () => {
    const readyList = items
      .map((it, idx) => ({ it, idx }))
      .filter(({ it }) => isClientReady(it));

    if (readyList.length === 0) {
      toast.message("수거할 준비완료 시설이 없어요.");
      return;
    }

    setCollectBusy(true);
    const gainedAll: IngredientTitle[] = [];
    const rottenAll: IngredientTitle[] = [];

    try {
      for (const { it, idx } of readyList) {
        const meta = PRODUCERS.find((p) => p.name === it.title);
        const titles = (meta?.produces ?? []) as IngredientTitle[];

        const rottenIndex = decideRottenIndex(titles.length);
        const kept = titles.filter((_, i) => i !== rottenIndex);

        if (kept.length > 0) {
          await addIngredients(coupleId!, kept);
          gainedAll.push(...kept);
        }
        if (rottenIndex !== null) {
          const rottenOne = titles[rottenIndex];
          if (rottenOne) rottenAll.push(rottenOne);
        }
        await collectAndReset(coupleId!, idx);
      }

      setBulkGained(gainedAll);
      setBulkRotten(rottenAll);
      setBulkOpen(true);

      const gainedEmoji = gainedAll
        .map((t) => INGREDIENT_EMOJI[t] ?? "❓")
        .join(" ");
      toast.success(
        gainedAll.length > 0
          ? `일괄 수거 완료! ${gainedAll.length}개 획득 ${gainedEmoji}`
          : "앗, 모두 상했어요…"
      );
    } catch (e) {
      console.error(e);
      toast.error("일괄 수거에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setCollectBusy(false);
      await load();
    }
  };

  // ───────────────────────── bulk: 일괄 생산(시작) ─────────────────────────
  const handleStartAllIdle = async () => {
    const idleList = items
      .map((it, idx) => ({ it, idx }))
      .filter(({ it }) => it.state === "idle");

    if (idleList.length === 0) {
      toast.message("대기 중인 시설이 없어요.");
      return;
    }

    setStartBusy(true);
    try {
      for (const { idx } of idleList) {
        await startProduction(coupleId!, idx);
      }
      toast.success(`총 ${idleList.length}개 생산 시작!`);
    } catch (e) {
      console.error(e);
      toast.error("일괄 생산에 실패했어요.");
    } finally {
      setStartBusy(false);
      await load();
    }
  };

  return (
    <section>
      {/* 상단 카운트 + 버튼 바 */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {loading ? (
          <>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border bg-white/80 px-2 py-1 text-slate-700">
              보유 <b className="tabular-nums">{total}</b>
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border bg-amber-50 px-2 py-1 text-amber-700 border-amber-200">
              운영중 <b className="tabular-nums">{producing}</b>
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border bg-emerald-50 px-2 py-1 text-emerald-700 border-emerald-200">
              완료 <b className="tabular-nums">{ready}</b>
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* 일관된 버튼 디자인: 아이콘 + 라벨, sm 사이즈 */}
          {/* 일괄 생산 */}
          <Button
            variant="secondary"
            size="sm"
            className="h-8 px-3"
            disabled={loading || anyBusy || idle === 0}
            onClick={handleStartAllIdle}
            aria-busy={startBusy}
            title="대기 중 전부 생산 시작"
          >
            {startBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 생산 중…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> 일괄 생산({idle})
              </>
            )}
          </Button>

          {/* 일괄 수거 */}
          <Button
            size="sm"
            className="h-8 px-3 bg-emerald-600 text-white disabled:opacity-60"
            disabled={loading || anyBusy || ready === 0}
            onClick={handleCollectAllReady}
            aria-busy={collectBusy}
            title="준비 완료 모두 수거"
          >
            {collectBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 수거 중…
              </>
            ) : (
              <>
                <Package className="h-4 w-4" /> 일괄 수거({ready})
              </>
            )}
          </Button>

          <BrowseProducersButton className="h-8 px-3" onPurchased={load} />
        </div>
      </div>

      {/* 카드 그리드 */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="text-sm text-neutral-500">
          아직 보유한 생산 수단이 없어요.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {items.map((fp, idx) => (
            <ProducerCard
              key={`${fp.title}-${idx}`}
              coupleId={coupleId}
              index={idx}
              data={fp}
            />
          ))}
        </div>
      )}

      {/* 일괄 결과 모달 */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>일괄 수거 결과</DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            <div>
              <div className="text-sm font-medium text-neutral-800">
                획득한 재료 ({bulkGained.length})
              </div>
              {bulkGained.length === 0 ? (
                <div className="text-sm text-neutral-500 mt-1">
                  이번엔 모두 상했어요… 😢
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap gap-2">
                  {bulkGained.map((t, i) => (
                    <span
                      key={`${t}-${i}`}
                      className="inline-flex items-center gap-1 rounded-md border bg-white/90 px-2 py-1 text-sm"
                    >
                      <span className="text-lg leading-none">
                        {INGREDIENT_EMOJI[t] ?? "❓"}
                      </span>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {bulkRotten.length > 0 && (
              <div>
                <div className="text-sm font-medium text-neutral-800">
                  상한 재료 ({bulkRotten.length})
                </div>
                <div className="mt-1 flex flex-wrap gap-2 opacity-60">
                  {bulkRotten.map((t, i) => (
                    <span
                      key={`${t}-${i}`}
                      className="inline-flex items-center gap-1 rounded-md border bg-white/90 px-2 py-1 text-sm"
                    >
                      <span className="text-lg leading-none">
                        {INGREDIENT_EMOJI[t] ?? "❓"}
                      </span>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
