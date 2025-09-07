// src/features/potato_exchange/PotatoExchange.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import PotatoDisplay from "./PotatoDisplay";
import {
  INGREDIENTS,
  INGREDIENT_TITLES,
  type IngredientTitle,
} from "@/features/kitchen/type";

/* ✅ 컨텍스트로 낙관적 업데이트 */
import { useCoupleContext } from "@/contexts/CoupleContext";
import { addIngredients } from "@/features/kitchen/kitchenApi";
import { Gift, Loader2, Sparkles } from "lucide-react";

/* =========================
   교환소 설정
========================= */
const BUNDLES = [
  {
    key: "bag",
    label: "재료 보따리",
    cost: 3,
    count: 1,
    img: "/exchange/bundle-bag.png",
  },
  {
    key: "pack",
    label: "재료 꾸러미",
    cost: 6,
    count: 2,
    img: "/exchange/bundle-pack.png",
  },
  {
    key: "pile",
    label: "재료 더미",
    cost: 9,
    count: 3,
    img: "/exchange/bundle-pile.png",
  },
] as const;

type BundleKey = (typeof BUNDLES)[number]["key"];

/* =========================
   유틸: 고유 샘플링
========================= */
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

/* =========================
   작은 뱃지 컴포넌트
========================= */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border",
        "px-2 py-1 text-xs font-medium",
        "bg-white text-zinc-800 shadow-sm"
      )}
    >
      {children}
    </span>
  );
}

/* =========================
   획득 결과 패널
========================= */
function RewardsPanel({
  loading,
  status,
  lastRewards,
  onClose,
}: {
  loading: boolean;
  status: string;
  lastRewards: { title: IngredientTitle; emoji: string }[];
  onClose: () => void;
}) {
  const hasRewards = lastRewards.length > 0;

  return (
    <section
      className={cn(
        "relative rounded-xl border bg-gradient-to-b from-amber-50/70 to-white",
        "p-3 sm:p-4 flex flex-col min-h-[220px]"
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm sm:text-base font-semibold text-amber-900 inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4" aria-hidden /> 획득한 재료
        </h3>
        <div className="text-xs text-zinc-500">{status}</div>
      </header>

      {/* 내용 */}
      <div className="mt-3 sm:mt-4 flex-1">
        {!hasRewards ? (
          <div className="grid place-items-center h-full min-h-[140px]">
            {loading ? (
              <div className="flex items-center gap-2 text-zinc-600">
                <Loader2 className="h-4 w-4 animate-spin" /> 열어보는 중…
              </div>
            ) : (
              <div className="text-center text-zinc-500 text-sm">
                아직 획득한 재료가 없어요.
                <div className="mt-1 text-xs">
                  왼쪽에서 보따리를 열어보세요!
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-2",
              "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            )}
          >
            {lastRewards.map((r, i) => (
              <div
                key={`${r.title}-${i}`}
                className={cn(
                  "group rounded-lg border bg-white/90 p-2",
                  "hover:shadow-sm transition"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="text-2xl leading-none select-none"
                    aria-hidden
                  >
                    {r.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-800 truncate">
                      {r.title}
                    </div>
                    <div className="text-[10px] text-zinc-500">1개 획득</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="mt-3 flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="rounded-lg"
        >
          닫기
        </Button>
      </footer>

      {/* 장식 라인 */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
    </section>
  );
}

/* =========================
   컴포넌트
========================= */
export default function PotatoExchange({
  className,
  caption = "감자 교환소",
}: {
  className?: string;
  caption?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [status, setStatus] = useState("원하시는 선택지를 골라주세요.");
  const [lastRewards, setLastRewards] = useState<
    { title: IngredientTitle; emoji: string }[]
  >([]);
  const [imgLoaded, setImgLoaded] = useState(false);

  const { couple, spendPotatoes } = useCoupleContext();
  const coupleId = couple?.id ?? "";

  // 재료 풀 (이모지 포함)
  const POOL = useMemo(
    () =>
      INGREDIENT_TITLES.map((t) => {
        const found = INGREDIENTS.find((i) => i.title === t);
        return { title: t as IngredientTitle, emoji: found?.emoji ?? "📦" };
      }),
    []
  );

  const onClickBundle = (bundleKey: BundleKey) => {
    if (isOpening) return;

    const bundle = BUNDLES.find((b) => b.key === bundleKey)!;
    setIsOpening(true);
    setLastRewards([]);
    setStatus(`${bundle.label} 열어보는 중 … ⏳`);

    (async () => {
      try {
        // 1) 낙관적 감자 차감
        if (coupleId) {
          const { error } = await spendPotatoes(bundle.cost);
          if (error) {
            setStatus(error.message || "감자 차감에 실패했어요.");
            setIsOpening(false);
            return;
          }
        }

        // 2) 연출 후 결과 지급
        window.setTimeout(async () => {
          try {
            const rewards = sampleUnique(POOL, bundle.count);
            setLastRewards(rewards);

            if (coupleId) {
              const titles = rewards.map((r) => r.title);
              await addIngredients(coupleId, titles);
            }

            const em = rewards.map((r) => r.emoji).join(" ");
            setStatus(`획득! ${em}`);
          } catch (err) {
            console.error(err);
            setStatus("지급 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
          } finally {
            setIsOpening(false);
          }
        }, 1000);
      } catch (err) {
        console.error(err);
        setStatus("오류가 발생했어요. 잠시 후 다시 시도해주세요.");
        setIsOpening(false);
      }
    })();
  };

  return (
    <>
      {/* 오프너 버튼 */}
      <Button
        variant="ghost"
        onClick={() => {
          setOpen(true);
          setStatus("원하시는 선택지를 골라주세요.");
          setLastRewards([]);
        }}
        aria-label={`${caption} 열기`}
        className={cn(
          "p-0 h-auto inline-flex flex-col items-center gap-1",
          "group rounded-md transition-all duration-200 ease-out",
          "hover:-translate-y-0.5 hover:bg-neutral-50/60",
          "active:translate-y-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300/60 focus-visible:ring-offset-2",
          className
        )}
      >
        <div className="relative">
          <img
            src="/exchange/exchange.png"
            alt="감자 교환소"
            className="h-8 w-8 object-contain select-none transition-transform duration-200 group-hover:scale-110 group-active:scale-95"
            draggable={false}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
          />
          {!imgLoaded && (
            <Skeleton className="absolute inset-0 h-8 w-8 rounded-md" />
          )}
        </div>
        <span className="text-[11px] sm:text-xs font-medium text-neutral-700 transition-colors group-hover:text-neutral-800">
          {caption}
        </span>
      </Button>

      {/* 모달 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "w-[min(92vw,1000px)] max-w-none rounded-2xl p-0",
            "overflow-hidden"
          )}
        >
          {/* 헤더: sticky + 반응형 정렬 */}
          <DialogHeader
            className={cn(
              "sticky top-0 z-10 p-4 border-b",
              "bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base sm:text-lg">
                  감자교환소
                </DialogTitle>
                <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                  감자와 재료를 교환할 수 있어요
                </p>
              </div>
              <div className="sm:ml-auto">
                <PotatoDisplay />
              </div>
            </div>
          </DialogHeader>

          {/* 바디: 좌측(작게) 번들 목록 + 우측(넓게) 결과 패널 */}
          <div className="px-3 sm:px-5 py-3 max-h-[65vh] overflow-y-auto">
            <div
              className={cn(
                "grid gap-3",
                // 모바일: 1열(번들 → 결과), 태블릿 이상: 12 그리드로 비율 조정
                "grid-cols-1 md:grid-cols-12"
              )}
            >
              {/* 번들 목록 - 작게, 조밀하게 */}
              <section
                className={cn(
                  "md:col-span-5 lg:col-span-4",
                  "rounded-xl border bg-white p-2 sm:p-3"
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-800 inline-flex items-center gap-2">
                    <Gift className="h-4 w-4" aria-hidden /> 선택지
                  </h3>
                  <div className="text-[11px] text-zinc-500">감자 사용</div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  {BUNDLES.map((b) => (
                    <button
                      key={b.key}
                      onClick={() => onClickBundle(b.key)}
                      disabled={isOpening}
                      className={cn(
                        "group relative rounded-lg border bg-white p-2",
                        "transition hover:shadow-sm hover:-translate-y-0.5",
                        isOpening && "opacity-70 cursor-wait"
                      )}
                    >
                      <figure className="flex flex-col items-center">
                        {/* 이미지 컨테이너: 더 작게 (긴문구 대비 정사각 + 최소 패딩) */}
                        <div className="w-full aspect-square rounded-md border bg-white grid place-items-center p-1">
                          <img
                            src={b.img}
                            alt={b.label}
                            className="max-h-16 sm:max-h-20 object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                            draggable={false}
                            loading="lazy"
                          />
                        </div>
                        <figcaption className="mt-1 text-[10px] sm:text-xs font-medium text-zinc-800 text-center leading-tight">
                          {b.label}
                        </figcaption>
                      </figure>

                      {/* 라벨(아주 작게) */}
                      <div
                        className={cn(
                          "pointer-events-none absolute inset-x-1 bottom-1",
                          "rounded-md border bg-amber-50/90 text-amber-900 text-[10px] font-semibold",
                          "px-1.5 py-0.5 shadow-sm opacity-0 translate-y-1",
                          "group-hover:opacity-100 group-hover:translate-y-0 transition"
                        )}
                      >
                        감자 {b.cost} → 재료 {b.count}
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* 결과 패널 - 더 넓게 */}
              <div className="md:col-span-7 lg:col-span-8">
                <RewardsPanel
                  loading={isOpening}
                  status={status}
                  lastRewards={lastRewards}
                  onClose={() => setOpen(false)}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
