// src/features/producer/ProducerSection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  fetchFieldProducers,
  startProduction,
  collectAndReset,
  getProgress,
  type FieldProducer,
} from "./index";
import supabase from "@/lib/supabase";
import ProducerGroupCard from "./ProducerGroupCard";
import { Loader2 } from "lucide-react";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function msUntilDone(fp: FieldProducer) {
  const meta = PRODUCERS.find((p) => p.name === fp.title);
  if (!meta || !fp.started_at) return Infinity;
  // timeSec은 "시간" 단위로 사용됩니다.
  const start = new Date(fp.started_at).getTime();
  const durMs = Math.max(1, Math.round(meta.timeSec * 3600 * 1000));
  return start + durMs - Date.now();
}

function isVirtuallyReady(fp: FieldProducer) {
  // DB state가 producing이어도 시간이 지났으면 UI상 'ready'로 취급
  if (fp.state === "idle") return false;
  const remain = msUntilDone(fp);
  return remain <= 0;
}

function formatRemaining(ms: number) {
  if (ms <= 0) return ""; // 완료 시 툴팁 숨김
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0 && m > 0) return `남은 시간: ${h}시간 ${m}분`;
  if (h > 0) return `남은 시간: ${h}시간`;
  if (m > 0) return `남은 시간: ${m}분`;
  return `남은 시간: ${s}초`;
}

type ProducerGroup = {
  title: string;
  indices: number[];
  idleIdx: number[];
  prodIdx: number[];
  readyIdx: number[];
  meta: (typeof PRODUCERS)[number] | null;
  minProgress?: number; // 운영중 최소 진행률(0~1)
  minRemainText?: string; // 완료면 undefined
};

function getMetaByTitle(title: string) {
  return PRODUCERS.find((p) => p.name === title) ?? null;
}

function groupProducers(items: FieldProducer[]): ProducerGroup[] {
  const map = new Map<string, ProducerGroup>();

  items.forEach((it, idx) => {
    const g =
      map.get(it.title) ??
      ({
        title: it.title,
        indices: [],
        idleIdx: [],
        prodIdx: [],
        readyIdx: [],
        meta: getMetaByTitle(it.title),
      } as ProducerGroup);

    g.indices.push(idx);

    // ✅ 가상 상태 판정(시간이 지나면 ready 취급)
    if (it.state === "idle") {
      g.idleIdx.push(idx);
    } else if (isVirtuallyReady(it)) {
      g.readyIdx.push(idx);
    } else {
      g.prodIdx.push(idx);
    }

    map.set(it.title, g);
  });

  // 진행률/남은시간(운영중 그룹만)
  for (const g of map.values()) {
    const meta = g.meta;
    if (!meta) continue;
    if (g.prodIdx.length > 0) {
      // 진행률을 안전 계산
      const progresses = g.prodIdx.map((idx) => {
        const fp = items[idx];
        const p = clamp01(getProgress(fp)); // 방어
        return p;
      });
      const minProg = Math.max(0.06, Math.min(...progresses));
      g.minProgress = minProg;

      // 가장 빨리 끝나는 아이 기준 남은시간
      const soonIdx = g.prodIdx.slice().sort((a, b) => {
        const pa = clamp01(getProgress(items[a]));
        const pb = clamp01(getProgress(items[b]));
        return pb - pa; // 진행률 큰 것 우선
      })[0];

      const remain = msUntilDone(items[soonIdx]);
      // 완료면 툴팁을 아예 숨김
      g.minRemainText = remain <= 0 ? undefined : formatRemaining(remain);
    }
  }

  return Array.from(map.values());
}

/** 20% 확률로 1개 썩음(유닛당 최대 1개) */
function decideRottenIndex(total: number) {
  const willRot = Math.random() < 0.2;
  if (!willRot || total <= 0) return null;
  return Math.floor(Math.random() * total);
}

export default function ProducerSection() {
  const { user } = useUser();
  const coupleId = user?.couple_id ?? null;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FieldProducer[]>([]);

  const [collectBusy, setCollectBusy] = useState(false);
  const [startBusy, setStartBusy] = useState(false);
  const anyBusy = collectBusy || startBusy;

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalTitle, setGroupModalTitle] = useState("");
  const [keptMap, setKeptMap] = useState<Record<IngredientTitle, number>>({});
  const [rottenMap, setRottenMap] = useState<Record<IngredientTitle, number>>(
    {}
  );

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
    () =>
      items.filter((i) => i.state !== "idle" && !isVirtuallyReady(i)).length,
    [items]
  );
  const ready = useMemo(
    () => items.filter((i) => i.state !== "idle" && isVirtuallyReady(i)).length,
    [items]
  );
  const idle = useMemo(
    () => items.filter((i) => i.state === "idle").length,
    [items]
  );

  const groups = useMemo(() => groupProducers(items), [items]);

  if (!coupleId) {
    return (
      <div className="text-xs md:text-sm text-neutral-600">
        커플 연결 후 이용할 수 있어요.
      </div>
    );
  }

  // ───────────────────────── 일괄(전체) 액션 ─────────────────────────
  const handleStartAllIdle = async () => {
    const allIdle = groups.flatMap((g) => g.idleIdx);
    if (allIdle.length === 0) {
      toast.message("대기 중인 시설이 없어요.");
      return;
    }
    setStartBusy(true);
    try {
      for (const idx of allIdle) {
        await startProduction(coupleId, idx);
      }
      toast.success(`총 ${allIdle.length}개 생산 시작!`);
    } catch (e) {
      console.error(e);
      toast.error("일괄 생산에 실패했어요.");
    } finally {
      setStartBusy(false);
      await load();
    }
  };

  const handleCollectAllReady = async () => {
    const allReady = groups.flatMap((g) => g.readyIdx);
    if (allReady.length === 0) {
      toast.message("수거할 준비완료 시설이 없어요.");
      return;
    }

    setCollectBusy(true);
    const kept: IngredientTitle[] = [];
    const rotten: IngredientTitle[] = [];

    try {
      for (const idx of allReady) {
        const fp = items[idx];
        const meta = getMetaByTitle(fp.title);
        const titles = (meta?.produces ?? []) as IngredientTitle[];

        const rotIdx = decideRottenIndex(titles.length);
        const keptOnce = titles.filter(
          (_, i) => i !== rotIdx
        ) as IngredientTitle[];

        kept.push(...keptOnce);
        if (rotIdx !== null && titles[rotIdx]) {
          rotten.push(titles[rotIdx] as IngredientTitle);
        }

        await collectAndReset(coupleId, idx);
      }

      if (kept.length > 0) {
        const { addIngredients } = await import(
          "@/features/kitchen/kitchenApi"
        );
        await addIngredients(coupleId, kept);
      }

      const keptMapLocal: Record<IngredientTitle, number> = {};
      const rottenMapLocal: Record<IngredientTitle, number> = {};
      kept.forEach((t) => (keptMapLocal[t] = (keptMapLocal[t] ?? 0) + 1));
      rotten.forEach((t) => (rottenMapLocal[t] = (rottenMapLocal[t] ?? 0) + 1));
      setGroupModalTitle("일괄 수거 결과");
      setKeptMap(keptMapLocal);
      setRottenMap(rottenMapLocal);
      setGroupModalOpen(true);

      const gainedEmoji = kept
        .map((t) => INGREDIENT_EMOJI[t] ?? "❓")
        .join(" ");
      toast.success(
        kept.length > 0
          ? `일괄 수거 완료! ${kept.length}개 획득 ${gainedEmoji}`
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

  // ───────────────────────── UI ─────────────────────────
  return (
    <section className="relative">
      {/* 상단 요약 + 전체 액션 */}
      <div className="mb-2 md:mb-3 flex flex-wrap items-center gap-2 text-xs md:text-sm">
        {loading ? (
          <>
            <Skeleton className="h-5 md:h-6 w-24 md:w-36 rounded-lg" />
            <Skeleton className="h-5 md:h-6 w-20 md:w-28 rounded-lg" />
            <Skeleton className="h-5 md:h-6 w-20 md:w-28 rounded-lg" />
          </>
        ) : (
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg md:rounded-xl border-2 border-slate-300 bg-white/90 px-2.5 md:px-3 py-0.5 md:py-1 shadow-sm">
              <span className="text-[11px] md:text-[13px] text-slate-700">
                보유
              </span>
              <span className="text-base md:text-lg font-extrabold tabular-nums text-slate-900 tracking-tight">
                {total}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 md:px-3 py-0.5 md:py-1 shadow-sm text-amber-700">
              <span className="text-[11px] md:text-[13px]">운영중</span>
              <b className="tabular-nums">{producing}</b>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 md:px-3 py-0.5 md:py-1 shadow-sm text-emerald-700">
              <span className="text-[11px] md:text-[13px]">완료</span>
              <b className="tabular-nums">{ready}</b>
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5 md:gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-8 md:h-9 px-2.5 md:px-3 transition-all hover:-translate-y-0.5 hover:shadow active:translate-y-0 active:scale-[0.99]"
            disabled={loading || anyBusy || idle === 0}
            onClick={handleStartAllIdle}
            aria-busy={startBusy}
            title="대기 중 전부 생산 시작"
          >
            {startBusy ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                가동 중…
              </span>
            ) : (
              <>일괄 생산({idle})</>
            )}
          </Button>

          <Button
            size="sm"
            className="h-8 md:h-9 px-2.5 md:px-3 bg-emerald-600 text-white disabled:opacity-60 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(16,185,129,0.55)] active:translate-y-0 active:scale-[0.99]"
            disabled={loading || anyBusy || ready === 0}
            onClick={handleCollectAllReady}
            aria-busy={collectBusy}
            title="준비 완료 모두 수거"
          >
            {collectBusy ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                수거 중…
              </span>
            ) : (
              <>일괄 수거({ready})</>
            )}
          </Button>

          <BrowseProducersButton
            className="h-8 md:h-9 px-2.5 md:px-3"
            onPurchased={load}
          />
        </div>
      </div>

      {/* 그룹 카드 그리드 */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-36 md:h-48 rounded-xl md:rounded-2xl"
            />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex items-center gap-2 md:gap-3 rounded-xl md:rounded-2xl border bg-white/80 px-3 md:px-4 py-4 md:py-6 text-xs md:text-sm text-neutral-600">
          <span className="text-xl md:text-2xl">🥔</span>
          <div>
            아직 보유한 생산 수단이 없어요.{" "}
            <span className="underline underline-offset-2">상점</span>에서
            장비를 추가해보세요!
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
          {groups.map((g) => (
            <ProducerGroupCard key={g.title} group={g} />
          ))}
        </div>
      )}

      {/* 집계형 결과 모달 */}
      <Dialog open={groupModalOpen} onOpenChange={setGroupModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {groupModalTitle}
              <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                총{" "}
                {Object.values(keptMap).reduce((a, b) => a + b, 0) +
                  Object.values(rottenMap).reduce((a, b) => a + b, 0)}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-5">
            {/* 획득 */}
            <div>
              <div className="text-sm font-medium text-neutral-800">
                획득{" "}
                <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 border border-emerald-200">
                  {Object.values(keptMap).reduce((a, b) => a + b, 0)}
                </span>
              </div>
              {Object.keys(keptMap).length === 0 ? (
                <div className="text-sm text-neutral-500 mt-2">
                  이번엔 모두 상했어요… 😢
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {Object.entries(keptMap).map(([title, cnt]) => (
                    <div
                      key={`kept-${title}`}
                      className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-2 py-1"
                    >
                      <span className="text-xl">
                        {INGREDIENT_EMOJI[title as IngredientTitle] ?? "❓"}
                      </span>
                      <span className="text-sm text-neutral-800">{title}</span>
                      <span className="ml-auto text-xs font-mono text-emerald-800">
                        ×{cnt}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 상함 */}
            {Object.keys(rottenMap).length > 0 && (
              <div>
                <div className="text-sm font-medium text-neutral-800">
                  상함{" "}
                  <span className="ml-1 rounded-full bg-neutral-50 px-2 py-0.5 text-xs text-neutral-600 border border-neutral-200">
                    {Object.values(rottenMap).reduce((a, b) => a + b, 0)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 opacity-75">
                  {Object.entries(rottenMap).map(([title, cnt]) => (
                    <div
                      key={`rot-${title}`}
                      className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1"
                    >
                      <span className="text-xl">
                        {INGREDIENT_EMOJI[title as IngredientTitle] ?? "❓"}
                      </span>
                      <span className="text-sm line-through text-neutral-600">
                        {title}
                      </span>
                      <span className="ml-auto text-xs font-mono text-neutral-700">
                        ×{cnt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setGroupModalOpen(false)}
              >
                닫기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
