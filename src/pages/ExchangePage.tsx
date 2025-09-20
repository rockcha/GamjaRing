// src/pages/ExchangePage.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  INGREDIENTS,
  INGREDIENT_TITLES,
  type IngredientTitle,
} from "@/features/kitchen/type";
import {
  fetchKitchen,
  consumeIngredients,
  getPotatoCount,
} from "@/features/kitchen/kitchenApi";
import { addIngredients } from "@/features/kitchen/kitchenApi";
import { useCoupleContext } from "@/contexts/CoupleContext";
import PotatoDisplay from "@/components/widgets/PotatoDisplay";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Gift,
  Loader2,
  ArrowLeftRight,
  Shuffle,
  PackageOpen,
  Filter,
  SortAsc,
  Undo2,
  Minus,
  Plus,
} from "lucide-react";

/* --------------------------------
   유틸: 고유 샘플링 (중복 없이 n개)
--------------------------------- */
function sampleUnique<T>(pool: readonly T[], n: number): T[] {
  const arr = [...pool];
  const out: T[] = [];
  const count = Math.min(n, arr.length);
  for (let i = 0; i < count; i++) {
    const idx = (Math.random() * arr.length) | 0;
    const [item] = arr.splice(idx, 1);
    out.push(item!);
  }
  return out;
}

/* --------------------------------
   보상 패널 (집계 리스트 — 영수증 제거)
--------------------------------- */
function Rewards({
  loading,
  status,
  rewards,
}: {
  loading: boolean;
  status: string;
  rewards: { title: IngredientTitle; emoji: string }[];
}) {
  const grouped = useMemo(() => {
    const m = new Map<
      string,
      { title: IngredientTitle; emoji: string; qty: number }
    >();
    for (const r of rewards) {
      const key = r.title;
      const cur = m.get(key);
      if (cur) cur.qty += 1;
      else m.set(key, { ...r, qty: 1 });
    }
    return Array.from(m.values());
  }, [rewards]);

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold inline-flex items-center gap-2">
          <PackageOpen className="h-4 w-4 text-amber-600" /> 획득 결과
        </h3>
        <div className="text-[11px] text-zinc-500" aria-live="polite">
          {status}
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-600 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> 열어보는 중…
            </div>
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            아직 결과가 없어요. 왼쪽에서 교환을 진행해 보세요.
          </div>
        ) : (
          <ul className="divide-y rounded-lg border bg-white">
            {grouped.map((r) => (
              <li
                key={`${r.title}`}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <div
                  aria-hidden
                  className="grid place-items-center h-9 w-9 rounded-full border bg-zinc-50 text-xl"
                >
                  {r.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{r.title}</div>
                  <div className="text-[11px] text-zinc-500">수량 {r.qty}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

/* --------------------------------
   메인 페이지
--------------------------------- */
export default function ExchangePage() {
  const { couple, spendPotatoes, addPotatoes } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [tab, setTab] = useState<"to-ingredients" | "to-potato">(
    "to-ingredients"
  );

  const [invMap, setInvMap] = useState<Record<string, number>>({});
  const [loadingInv, setLoadingInv] = useState(true);

  // 감자 보유량(수량 선택 검증용)
  const [potatoCount, setPotatoCount] = useState(0);

  // 보상 패널 상태
  const [isWorking, setIsWorking] = useState(false);
  const [status, setStatus] = useState("원하시는 교환 방식을 선택하세요.");
  const [rewards, setRewards] = useState<
    { title: IngredientTitle; emoji: string }[]
  >([]);

  // 재료 풀
  const POOL = useMemo(
    () =>
      INGREDIENT_TITLES.map((t) => {
        const found = INGREDIENTS.find((i) => i.title === t);
        return { title: t as IngredientTitle, emoji: found?.emoji ?? "📦" };
      }),
    []
  );

  // 재고 & 감자 로드
  useEffect(() => {
    if (!coupleId) return;
    (async () => {
      setLoadingInv(true);
      try {
        const k = await fetchKitchen(coupleId);
        const m: Record<string, number> = {};
        for (const it of k.ingredients) m[it.title] = it.num;
        setInvMap(m);
        setPotatoCount(await getPotatoCount(coupleId));
      } finally {
        setLoadingInv(false);
      }
    })();
  }, [coupleId]);

  /* =========================
     탭 1: 감자 N → 랜덤 재료 2N
  ========================= */
  const [potatoSpend, setPotatoSpend] = useState<number>(1);
  const [spendText, setSpendText] = useState<string>("1");
  const maxSpend = Math.max(0, potatoCount);
  const clampSpend = (n: number) =>
    Math.min(Math.max(n, 1), Math.max(1, maxSpend || 1));
  const canSpendNow =
    !!coupleId && !isWorking && potatoSpend > 0 && potatoSpend <= maxSpend;

  const syncFromNumber = (n: number) => {
    const clamped = clampSpend(n);
    setPotatoSpend(clamped);
    setSpendText(String(clamped));
  };

  const onSpendInputChange = (v: string) => {
    // 숫자만 허용, 빈 문자열 허용(버튼은 비활성화됨)
    const digits = v.replace(/[^\d]/g, "");
    setSpendText(digits);
    const parsed = parseInt(digits, 10);
    if (isNaN(parsed)) {
      setPotatoSpend(0);
    } else {
      setPotatoSpend(clampSpend(parsed));
    }
  };

  const onSpendBlur = () => {
    if (potatoSpend <= 0) syncFromNumber(1);
    else syncFromNumber(potatoSpend);
  };

  const decSpend = () => syncFromNumber(potatoSpend - 1);
  const incSpend = () => syncFromNumber(potatoSpend + 1);
  const setMaxSpend = () => syncFromNumber(maxSpend || 1);

  const handlePotatoToIngredients = async () => {
    if (!coupleId) return toast.error("커플 연동이 필요해요.");
    if (isWorking) return;
    if (potatoSpend <= 0 || potatoSpend > maxSpend)
      return toast.error("감자 수량을 확인해 주세요.");

    setIsWorking(true);
    setRewards([]);
    setStatus(`감자 ${potatoSpend}개를 사용합니다…`);

    try {
      const { error } = await spendPotatoes(potatoSpend);
      if (error) {
        setStatus(error.message || "감자 차감에 실패했어요.");
        setIsWorking(false);
        return;
      }

      setStatus("재료 뽑는 중… ✨");
      setTimeout(async () => {
        // 각 감자당 서로 다른 2종 뽑기(전체적으로는 중복 허용)
        const drawnAll: { title: IngredientTitle; emoji: string }[] = [];
        for (let i = 0; i < potatoSpend; i++) {
          const pair = sampleUnique(POOL, 2);
          drawnAll.push(...pair);
        }
        setRewards(drawnAll);

        // 지급
        await addIngredients(
          coupleId,
          drawnAll.map((d) => d.title)
        );

        // 로컬 인벤토리 반영
        setInvMap((m) => {
          const copy = { ...m };
          for (const d of drawnAll) copy[d.title] = (copy[d.title] ?? 0) + 1;
          return copy;
        });

        // 감자 수량 갱신
        setPotatoCount((p) => Math.max(0, p - potatoSpend));

        // 상태 텍스트는 깔끔히 비워둠
        setStatus("");
        setIsWorking(false);
      }, 700);
    } catch (e) {
      console.error(e);
      setStatus("오류가 발생했어요. 잠시 후 다시 시도해주세요.");
      setIsWorking(false);
    }
  };

  /* =========================
     탭 2: 재료 (3의 배수) → 감자 (선택/3)
  ========================= */
  const [pick, setPick] = useState<Record<IngredientTitle, number>>({});
  const pickedCount = useMemo(
    () => Object.values(pick).reduce((a, b) => a + b, 0),
    [pick]
  );
  const potatoGain = Math.floor(pickedCount / 3);
  const canSubmitP2P =
    !!coupleId && !isWorking && pickedCount >= 3 && pickedCount % 3 === 0;

  const togglePick = (title: IngredientTitle) => {
    if (isWorking) return;
    const have = invMap[title] ?? 0;
    const used = pick[title] ?? 0;
    if (used < have) {
      setPick((p) => ({ ...p, [title]: used + 1 }));
    } else {
      setPick((p) => {
        const next = { ...p };
        delete next[title];
        return next;
      });
    }
  };

  const removeOnePick = (title: IngredientTitle) => {
    setPick((p) => {
      const cur = p[title] ?? 0;
      if (cur <= 1) {
        const next = { ...p };
        delete next[title];
        return next;
      }
      return { ...p, [title]: cur - 1 };
    });
  };

  const clearPick = useCallback(() => setPick({}), []);

  const handleIngredientsToPotato = async () => {
    if (!coupleId) return toast.error("커플 연동이 필요해요.");
    if (!canSubmitP2P)
      return toast.error("재료는 3개 단위(3의 배수)로 선택해 주세요.");

    setIsWorking(true);
    setRewards([]); // 이 탭은 오른쪽 패널에서 보상 리스트를 안 씀
    setStatus("재료를 제출하는 중…");

    try {
      const need: Record<IngredientTitle, number> = { ...(pick as any) };
      await consumeIngredients(coupleId, need);
      await addPotatoes?.(potatoGain);

      setInvMap((m) => {
        const copy = { ...m };
        for (const [t, n] of Object.entries(need)) {
          copy[t] = Math.max(0, (copy[t] ?? 0) - (n as number));
        }
        return copy;
      });
      clearPick();

      setPotatoCount((p) => p + potatoGain);

      setStatus(`감자 ${potatoGain}개 획득! 🥔×${potatoGain}`);
      toast.success(`감자 ${potatoGain}개를 받았어요!`);
    } catch (e) {
      console.error(e);
      toast.error("교환에 실패했어요.");
      setStatus("교환 실패");
    } finally {
      setIsWorking(false);
    }
  };

  /* =========================
     UI 전용: 필터/정렬 (로직 비영향)
  ========================= */
  const [excludeZero, setExcludeZero] = useState(true);
  const [sortKey, setSortKey] = useState<"qty" | "name">("qty");

  const gridItems = useMemo(() => {
    let arr = [...INGREDIENTS];
    if (excludeZero) {
      arr = arr.filter((it) => (invMap[it.title] ?? 0) > 0);
    }
    if (sortKey === "qty") {
      arr.sort((a, b) => (invMap[b.title] ?? 0) - (invMap[a.title] ?? 0));
    } else {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    }
    return arr;
  }, [excludeZero, sortKey, invMap]);

  const IngredientButton = useCallback(
    (it: (typeof INGREDIENTS)[number]) => {
      const have = invMap[it.title] ?? 0;
      const used = pick[it.title as IngredientTitle] ?? 0;
      const left = Math.max(0, have - used);
      const isActive = used > 0;

      return (
        <Button
          key={it.title}
          variant="outline"
          onClick={() => togglePick(it.title as IngredientTitle)}
          disabled={have <= 0 || isWorking}
          className={cn(
            "relative h-20 rounded-2xl border bg-white shadow-sm overflow-hidden",
            "flex flex-col items-center justify-center gap-1 px-2",
            "transition will-change-transform hover:shadow-md hover:-translate-y-0.5",
            isActive && "ring-2 ring-amber-400/70 bg-amber-50/70"
          )}
          title={have <= 0 ? "재고 없음" : "선택/해제 (다중 선택 가능)"}
        >
          <span className="text-3xl leading-none select-none">{it.emoji}</span>
          <Badge
            variant="secondary"
            className="absolute right-0.5 bottom-0.5 px-1 py-0.5 text-[9px] leading-none rounded border border-amber-200 bg-amber-50 text-amber-800 tabular-nums"
          >
            ×{left}
          </Badge>
          {isActive && (
            <span className="absolute left-1 top-1 text-[10px] font-semibold text-amber-700">
              선택 {used}
            </span>
          )}
        </Button>
      );
    },
    [invMap, pick, isWorking]
  );

  return (
    <div className="mx-auto w-full max-w-6xl p-3 sm:p-5">
      {/* 헤더 */}
      <div
        className={cn(
          "sticky top-[56px] z-30",
          "rounded-xl border bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/65",
          "px-3 sm:px-4 py-3"
        )}
      >
        {/* 탭 */}
        <div className="mt-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="to-ingredients" className="gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                재료 얻기
              </TabsTrigger>
              <TabsTrigger value="to-potato" className="gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                감자 얻기
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground ml-2">
          {tab === "to-ingredients"
            ? "감자 1개 당 재료 2개를 랜덤으로 교환합니다."
            : "재료 3개 당 감자 1개를 교환합니다."}
        </div>
      </div>

      {/* 본문 */}
      <div className="mt-3 grid gap-3 grid-cols-1 md:grid-cols-12 items-start">
        {/* 왼쪽: 조작 */}
        <section className="md:col-span-7">
          <Card className="p-3 sm:p-4">
            {tab === "to-ingredients" ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold inline-flex items-center gap-2">
                    <Shuffle className="h-4 w-4 text-emerald-600" /> 감자 . 재료
                    교환
                  </h3>
                  <span className="text-[11px] text-zinc-500">
                    보유: 🥔 ×{potatoCount}
                  </span>
                </div>
                <Separator className="my-3" />

                {/* 수량 입력/스텝퍼 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">사용 수량</span>
                  <div className="inline-flex items-center rounded-lg border bg-white">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-l-lg"
                      onClick={decSpend}
                      disabled={isWorking || potatoSpend <= 1}
                      title="감소"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-16 text-center outline-none bg-transparent text-sm"
                      value={spendText}
                      onChange={(e) => onSpendInputChange(e.target.value)}
                      onBlur={onSpendBlur}
                      disabled={isWorking || maxSpend === 0}
                      aria-label="사용 수량"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-r-lg"
                      onClick={incSpend}
                      disabled={isWorking || potatoSpend >= maxSpend}
                      title="증가"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={setMaxSpend}
                    disabled={isWorking || maxSpend <= 1}
                    className="ml-1"
                  >
                    최대
                  </Button>
                </div>

                <div className="mt-3 rounded-2xl border bg-amber-50/40 p-4 grid place-items-center">
                  <div className="text-[40px] leading-none select-none">🛍️</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    감자 {potatoSpend}개 사용 시 재료 {potatoSpend * 2}개!
                  </div>
                  <Button
                    size="lg"
                    className="mt-3 w-full sm:w-[260px] gap-2 transition will-change-transform hover:-translate-y-0.5"
                    onClick={handlePotatoToIngredients}
                    disabled={!canSpendNow}
                    title={!coupleId ? "커플 연동 필요" : "교환하기"}
                  >
                    {isWorking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Gift className="h-4 w-4" />
                    )}
                    랜덤 {potatoSpend * 2}개 뽑기
                  </Button>
                </div>

                <p className="mt-2 text-[11px] text-muted-foreground">
                  버튼 클릭 시 감자 {potatoSpend}개가 차감됩니다.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold inline-flex items-center gap-2">
                    재료.감자 교환
                  </h3>
                  <span className="text-[11px] text-zinc-500">
                    현재 선택: {pickedCount}개
                  </span>
                </div>
                <Separator className="my-3" />

                {/* 필터/정렬 바 */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
                      <Filter className="h-3.5 w-3.5" />
                      필터
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={excludeZero ? "default" : "outline"}
                      onClick={() => setExcludeZero((v) => !v)}
                      className={cn(
                        "h-7 px-2 text-xs rounded-full",
                        excludeZero
                          ? "bg-amber-500 hover:bg-amber-600"
                          : "bg-white"
                      )}
                    >
                      보유 0 제외
                    </Button>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
                      <SortAsc className="h-3.5 w-3.5" />
                      정렬
                    </span>
                    <div className="inline-flex rounded-full border bg-white p-0.5">
                      <Button
                        size="sm"
                        variant={sortKey === "qty" ? "default" : "ghost"}
                        onClick={() => setSortKey("qty")}
                        className={cn(
                          "h-7 px-2 text-xs rounded-full",
                          sortKey === "qty" && "bg-amber-500 hover:bg-amber-600"
                        )}
                      >
                        보유 많은순
                      </Button>
                      <Button
                        size="sm"
                        variant={sortKey === "name" ? "default" : "ghost"}
                        onClick={() => setSortKey("name")}
                        className={cn(
                          "h-7 px-2 text-xs rounded-full",
                          sortKey === "name" &&
                            "bg-amber-500 hover:bg-amber-600"
                        )}
                      >
                        이름순
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 재료 그리드 */}
                <div className="mt-3">
                  {loadingInv ? (
                    <div className="space-y-2">
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                    </div>
                  ) : gridItems.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      표시할 재료가 없어요. (필터/정렬을 확인해 주세요)
                    </div>
                  ) : (
                    <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-5">
                      {gridItems.map((it) => IngredientButton(it))}
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </section>

        {/* 오른쪽: 패널 */}
        <aside className="md:col-span-5">
          {tab === "to-ingredients" ? (
            <Rewards loading={isWorking} status={status} rewards={rewards} />
          ) : (
            <Card className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900">
                  선택한 재료 &nbsp;
                  <span className="text-amber-700 tabular-nums">
                    {pickedCount}
                  </span>
                  <span className="text-zinc-500 text-xs"> 개</span>
                </h3>
                <div className="text-[11px] text-zinc-500">
                  예상 보상: 🥔 ×{potatoGain}
                </div>
              </div>

              <div className="mt-3 min-h-[120px]">
                {Object.entries(pick).length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    왼쪽에서 재료 카드를 클릭해 선택하세요. (3의 배수)
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(pick).map(([t, n]) => {
                      const meta = INGREDIENTS.find((i) => i.title === t)!;
                      return (
                        <Badge
                          key={t}
                          className="bg-white text-amber-900 border-amber-200 gap-1"
                        >
                          <button
                            type="button"
                            onClick={() => removeOnePick(t as IngredientTitle)}
                            className="mr-1 rounded-sm border px-1 text-[10px] hover:bg-amber-50"
                            title="한 개 제거"
                          >
                            −
                          </button>
                          {meta.emoji} ×{n}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              <Separator className="my-3" />
              <Button
                size="lg"
                className="w-full gap-2 transition will-change-transform hover:-translate-y-0.5"
                onClick={handleIngredientsToPotato}
                disabled={!canSubmitP2P}
                title={
                  !coupleId
                    ? "커플 연동 필요"
                    : pickedCount < 3
                    ? "재료를 3개 이상 선택하세요"
                    : pickedCount % 3 !== 0
                    ? "3의 배수로 맞춰주세요"
                    : "교환하기"
                }
              >
                {isWorking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowLeftRight className="h-4 w-4" />
                )}
                감자 {potatoGain}개 받기
              </Button>

              {/* 상태 메모 */}
              {status && (
                <div className="mt-2 text-[11px] text-zinc-500">{status}</div>
              )}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
