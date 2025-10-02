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

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGift,
  faSpinner,
  faRightLeft,
  faShuffle,
  faBoxOpen,
  faFilter,
  faArrowDownShortWide,
  faMinus,
  faPlus,
  faFireFlameCurved,
} from "@fortawesome/free-solid-svg-icons";

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
   레버 버튼 (가챠 머신 인터랙션 핵심)
   - UX: 터치 타깃 확대, 눌림 피드백 강화
--------------------------------- */
function LeverButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative inline-flex items-center gap-3 rounded-full",
        /* 터치 타깃 넓힘 */
        "px-6 py-3.5 sm:px-7 sm:py-4 min-h-[44px]",
        "bg-gradient-to-b from-amber-400 to-amber-500 text-white shadow-lg",
        "transition active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed",
        "border border-amber-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200/60"
      )}
      title={label ?? "레버 당기기"}
      aria-label={label ?? "레버 당기기"}
    >
      {/* 레버 핸들 */}
      <span
        className={cn(
          "inline-block origin-right transition will-change-transform",
          "group-active:-rotate-12 text-xl"
        )}
        aria-hidden
      >
        🎰
      </span>
      <span className="font-semibold text-sm sm:text-base">
        {label ?? "레버 당기기"}
      </span>
      {/* 하이라이트 스파크 */}
      <span
        className={cn(
          "pointer-events-none absolute -right-1 -top-1 text-xs opacity-0",
          "group-active:opacity-100 transition"
        )}
        aria-hidden
      >
        ✨
      </span>
      {/* 클릭영역 확장(시각적 영향 없음) */}
      <span className="absolute inset-0 -m-1 rounded-full" aria-hidden />
    </button>
  );
}

/* --------------------------------
   보상 캡슐 (트레이 위에 담기는 알약형)
   - 시각: 여백 확대, 배지 대비 향상
--------------------------------- */
function RewardCapsule({
  emoji,
  title,
  qty,
}: {
  emoji: string;
  title: string;
  qty: number;
}) {
  return (
    <div
      className={cn(
        "group relative inline-flex items-center gap-2 rounded-full border",
        "bg-white/90 px-3.5 py-2 shadow-sm hover:shadow transition",
        "backdrop-blur supports-[backdrop-filter]:bg-white/80"
      )}
      title={`${title} ×${qty}`}
    >
      <span className="text-2xl leading-none select-none" aria-hidden>
        {emoji}
      </span>
      <span className="text-sm">{title}</span>
      <span className="text-[11px] text-zinc-600 tabular-nums">×{qty}</span>
      <span
        className={cn(
          "absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition"
        )}
        aria-hidden
      >
        ✨
      </span>
    </div>
  );
}

/* --------------------------------
   보상 패널 (트레이 + 그룹 요약)
   - 시각: 트레이 입체감, 빈 상태 가독성
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
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold inline-flex items-center gap-2">
          <FontAwesomeIcon
            icon={faBoxOpen}
            className="h-4 w-4 text-amber-600"
          />
          획득 결과
        </h3>
        <div
          className="text-[11px] text-zinc-500"
          aria-live="polite"
          role="status"
        >
          {status}
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-600 text-sm">
              <FontAwesomeIcon
                icon={faSpinner}
                className="h-4 w-4 animate-spin"
              />
              열어보는 중…
            </div>
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            아직 결과가 없어요. 왼쪽에서 교환을 진행해 보세요.
          </div>
        ) : (
          <>
            {/* 트레이 상단 */}
            <div
              className={cn(
                "rounded-2xl border bg-gradient-to-b from-zinc-50 to-white p-3.5",
                "shadow-[inset_0_-8px_16px_rgba(0,0,0,0.04)]"
              )}
            >
              <div className="flex flex-wrap gap-2.5">
                {grouped.map((r) => (
                  <RewardCapsule
                    key={r.title}
                    emoji={r.emoji}
                    title={r.title}
                    qty={r.qty}
                  />
                ))}
              </div>
            </div>
            {/* 트레이 그림자 */}
            <div className="mx-8 mt-2 h-[8px] rounded-full bg-zinc-200/70 blur-[2px]" />
          </>
        )}
      </div>
    </Card>
  );
}

/* --------------------------------
   메인 페이지 (UX/시각 개선 버전)
   - 변경 요약:
     1) 터치 타깃 확대 (버튼/레버/카드)
     2) 카드 크기 키움, 여백 정리
     3) '3의 배수 자동맞춤'·스탬프 제거
     4) 패널·헤더 가독성/대비 강화
--------------------------------- */
export default function ExchangePage() {
  const { couple, spendPotatoes, addPotatoes } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [tab, setTab] = useState<"to-ingredients" | "to-potato">(
    "to-ingredients"
  );

  // 재고 & 감자
  const [invMap, setInvMap] = useState<Record<string, number>>({});
  const [loadingInv, setLoadingInv] = useState(true);
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
     탭 1: 감자 N → 랜덤 재료 2N (레버)
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
    const digits = v.replace(/[^\d]/g, "");
    setSpendText(digits);
    const parsed = parseInt(digits, 10);
    if (isNaN(parsed)) setPotatoSpend(0);
    else setPotatoSpend(clampSpend(parsed));
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
        const drawnAll: { title: IngredientTitle; emoji: string }[] = [];
        for (let i = 0; i < potatoSpend; i++) {
          const pair = sampleUnique(POOL, 2);
          drawnAll.push(...pair);
        }
        setRewards(drawnAll);

        await addIngredients(
          coupleId,
          drawnAll.map((d) => d.title)
        );

        setInvMap((m) => {
          const copy = { ...m };
          for (const d of drawnAll) copy[d.title] = (copy[d.title] ?? 0) + 1;
          return copy;
        });

        setPotatoCount((p) => Math.max(0, p - potatoSpend));

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
     - UX: 자동맞춤/스탬프 제거, 기본만 단순 명확
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

  /* =========================
     UI 전용: 필터/정렬 (로직 비영향)
     - UX: 버튼 크기 확대, 대비/간격 개선
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

  /* =========================
     재료 카드 버튼
     - UX: 카드 크게(터치 타깃 확대), 상태 대비 ↑
  ========================= */
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
            "relative h-28 sm:h-32 rounded-2xl border bg-white shadow-sm overflow-hidden",
            "flex flex-col items-center justify-center gap-2 px-3",
            "transition will-change-transform hover:shadow-md hover:-translate-y-0.5",
            /* 터치 타깃 넓힘 */
            "min-h-[56px] sm:min-h-[64px]",
            /* 활성 상태 강조 */
            isActive && "ring-2 ring-amber-400/70 bg-amber-50/70",
            /* 포커스 가시성 */
            "focus-visible:ring-4 focus-visible:ring-amber-200/60 focus-visible:outline-none"
          )}
          title={have <= 0 ? "재고 없음" : "선택/해제 (다중 선택 가능)"}
        >
          <span className="text-4xl sm:text-5xl leading-none select-none">
            {it.emoji}
          </span>
          <span className="text-[11px] text-zinc-600">{it.title}</span>

          <Badge
            variant="secondary"
            className="absolute right-1.5 bottom-1.5 px-1.5 py-0.5 text-[10px] leading-none rounded border border-amber-200 bg-amber-50 text-amber-800 tabular-nums"
          >
            ×{left}
          </Badge>

          {isActive && (
            <span className="absolute left-1.5 top-1.5 text-[11px] font-semibold text-amber-700">
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
      {/* ---- 헤더 (가챠 머신 상단 패널) ---- */}
      <div
        className={cn(
          "sticky top-[56px] z-30",
          "rounded-2xl border bg-white/75 backdrop-blur supports-[backdrop-filter]:bg-white/65",
          "px-3 sm:px-5 py-3.5 shadow-sm"
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* 좌측: 제목 + 설명 */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-xl border",
                  "bg-gradient-to-b from-amber-50 to-white"
                )}
                aria-hidden
              >
                <span className="text-xl">🛍️</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold truncate">
                  캡슐머신 교환소
                </h2>
                <p className="text-[12px] text-muted-foreground truncate">
                  {tab === "to-ingredients"
                    ? "감자 1개당 재료 2개 랜덤! 레버를 당겨보세요."
                    : "재료 3개마다 감자 1개 교환."}
                </p>
              </div>
            </div>
          </div>

          {/* 우측: 보유/탭/레버 */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 현재 감자 보유 */}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border bg-white px-3 py-2",
                "text-sm"
              )}
              title="현재 보유 감자"
            >
              <span className="text-base" aria-hidden>
                🥔
              </span>
              <span className="tabular-nums">×{potatoCount}</span>
            </div>

            {/* 탭 선택 */}
            <div className="hidden sm:block">
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="to-ingredients" className="gap-2">
                    <FontAwesomeIcon icon={faRightLeft} className="h-4 w-4" />
                    재료 얻기
                  </TabsTrigger>
                  <TabsTrigger value="to-potato" className="gap-2">
                    <FontAwesomeIcon icon={faRightLeft} className="h-4 w-4" />
                    감자 얻기
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* 레버: 감자→재료 탭에서만 활성화 */}
            {tab === "to-ingredients" ? (
              <LeverButton
                onClick={handlePotatoToIngredients}
                disabled={!canSpendNow}
                label={`레버 당기기 (${potatoSpend * 2}개 뽑기)`}
              />
            ) : (
              <div
                className="hidden sm:flex items-center gap-2 text-xs text-zinc-500"
                title="재료를 고르고 아래에서 교환하세요."
              >
                <FontAwesomeIcon
                  icon={faFireFlameCurved}
                  className="h-3.5 w-3.5"
                />
                재료 선택 후 하단 버튼으로 교환
              </div>
            )}
          </div>
        </div>

        {/* 모바일 탭 스위처 */}
        <div className="mt-3 sm:hidden">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="to-ingredients" className="gap-2">
                <FontAwesomeIcon icon={faRightLeft} className="h-4 w-4" />
                재료 얻기
              </TabsTrigger>
              <TabsTrigger value="to-potato" className="gap-2">
                <FontAwesomeIcon icon={faRightLeft} className="h-4 w-4" />
                감자 얻기
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ---- 본문 ---- */}
      <div className="mt-3 grid gap-3 grid-cols-1 md:grid-cols-12 items-start">
        {/* 왼쪽: 조작/목록 */}
        <section className="md:col-span-7">
          <Card className="p-4 sm:p-5">
            {tab === "to-ingredients" ? (
              <>
                {/* 수량 스텝퍼 */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold inline-flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={faShuffle}
                      className="h-4 w-4 text-emerald-600"
                    />
                    감자 . 재료 교환
                  </h3>
                  <span className="text-[12px] text-zinc-600">
                    보유: 🥔 ×{potatoCount}
                  </span>
                </div>
                <Separator className="my-3" />

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-600">사용 수량</span>
                  <div className="inline-flex items-center rounded-full border bg-white overflow-hidden">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={decSpend}
                      disabled={isWorking || potatoSpend <= 1}
                      title="감소"
                    >
                      <FontAwesomeIcon icon={faMinus} className="h-4 w-4" />
                    </Button>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-20 text-center outline-none bg-transparent text-base py-2"
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
                      className="h-10 w-10"
                      onClick={incSpend}
                      disabled={isWorking || potatoSpend >= maxSpend}
                      title="증가"
                    >
                      <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={setMaxSpend}
                    disabled={isWorking || maxSpend <= 1}
                    className="ml-1 rounded-full"
                  >
                    최대
                  </Button>
                </div>

                {/* 가챠 머신 안내 박스 */}
                <div className="mt-3 rounded-2xl border bg-amber-50/50 p-4 grid gap-2">
                  <div className="text-[44px] leading-none select-none text-center">
                    🧰
                  </div>
                  <div className="text-sm text-zinc-700 text-center">
                    감자 {potatoSpend}개 사용 시 재료 {potatoSpend * 2}개!
                    상단의 <b>레버</b>를 당겨보세요.
                  </div>
                </div>

                <p className="mt-2 text-[12px] text-muted-foreground">
                  레버를 당기면 감자 {potatoSpend}개가 차감되고, 랜덤 재료{" "}
                  {potatoSpend * 2}
                  개를 획득합니다.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold inline-flex items-center gap-2">
                    재료.감자 교환
                  </h3>
                  <span className="text-[12px] text-zinc-600">
                    현재 선택: {pickedCount}개
                  </span>
                </div>
                <Separator className="my-3" />

                {/* 필터/정렬 바 (간결/선명) */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-[12px] text-zinc-600 inline-flex items-center gap-1">
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="h-3.5 w-3.5"
                      />
                      필터
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={excludeZero ? "default" : "outline"}
                      onClick={() => setExcludeZero((v) => !v)}
                      className={cn(
                        "h-8 px-3 text-xs rounded-full",
                        excludeZero
                          ? "bg-amber-500 hover:bg-amber-600"
                          : "bg-white"
                      )}
                    >
                      보유 0 제외
                    </Button>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className="text-[12px] text-zinc-600 inline-flex items-center gap-1">
                      <FontAwesomeIcon
                        icon={faArrowDownShortWide}
                        className="h-3.5 w-3.5"
                      />
                      정렬
                    </span>
                    <div className="inline-flex rounded-full border bg-white p-0.5">
                      <Button
                        size="sm"
                        variant={sortKey === "qty" ? "default" : "ghost"}
                        onClick={() => setSortKey("qty")}
                        className={cn(
                          "h-8 px-3 text-xs rounded-full",
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
                          "h-8 px-3 text-xs rounded-full",
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
                      <Skeleton className="h-28" />
                      <Skeleton className="h-28" />
                      <Skeleton className="h-28" />
                    </div>
                  ) : gridItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      표시할 재료가 없어요. (필터/정렬을 확인해 주세요)
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                        {gridItems.map((it) => (
                          <div key={it.title} className="relative">
                            {IngredientButton(it)}
                            <div className="absolute left-3 right-3 bottom-[-7px] h-[7px] rounded-full bg-zinc-200/70 blur-[2px]" />
                          </div>
                        ))}
                      </div>
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
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900">
                  선택한 재료 &nbsp;
                  <span className="text-amber-700 tabular-nums">
                    {pickedCount}
                  </span>
                  <span className="text-zinc-500 text-xs"> 개</span>
                </h3>
                <div className="text-[12px] text-zinc-600">
                  예상 보상: 🥔 ×{potatoGain}
                </div>
              </div>

              <div className="mt-3 min-h-[136px]">
                {Object.entries(pick).length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    왼쪽에서 재료 카드를 클릭해 선택하세요. (3의 배수)
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {Object.entries(pick).map(([t, n]) => {
                      const meta = INGREDIENTS.find((i) => i.title === t)!;
                      return (
                        <Badge
                          key={t}
                          className="bg-white text-amber-900 border-amber-200 gap-1 py-1.5 px-2.5 rounded-full"
                        >
                          <button
                            type="button"
                            onClick={() => removeOnePick(t as IngredientTitle)}
                            className="mr-1 rounded-sm border px-1 text-[11px] hover:bg-amber-50"
                            title="한 개 제거"
                          >
                            −
                          </button>
                          <span className="text-base">{meta.emoji}</span>
                          <span className="text-sm">&nbsp;×{n}</span>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              <Separator className="my-3" />
              <Button
                size="lg"
                className={cn(
                  "w-full gap-2 rounded-xl",
                  "h-12 sm:h-14 text-base sm:text-lg",
                  "transition will-change-transform hover:-translate-y-0.5"
                )}
                onClick={async () => {
                  if (!coupleId) return toast.error("커플 연동이 필요해요.");
                  if (!canSubmitP2P)
                    return toast.error(
                      "재료는 3개 단위(3의 배수)로 선택해 주세요."
                    );

                  setIsWorking(true);
                  setRewards([]);
                  setStatus("재료를 제출하는 중…");

                  try {
                    const need: Record<IngredientTitle, number> = {
                      ...(pick as any),
                    };
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
                }}
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
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="h-5 w-5 animate-spin"
                  />
                ) : (
                  <FontAwesomeIcon icon={faRightLeft} className="h-5 w-5" />
                )}
                감자 {potatoGain}개 받기
              </Button>

              {status && (
                <div className="mt-2 text-[12px] text-zinc-600">{status}</div>
              )}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
