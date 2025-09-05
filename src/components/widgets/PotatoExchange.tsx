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
        }, 2000);
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
            "w-[min(92vw,960px)] max-w-none rounded-2xl p-0",
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

          {/* 바디: 고정 3열 그리드 (모바일에서도 3개 가로로 보이도록) */}
          <div className="px-3 sm:px-5 py-3 max-h-[65vh] overflow-y-auto">
            <div
              className={cn(
                "grid grid-cols-3 gap-2 sm:gap-3" // 👈 항상 3열
              )}
            >
              {BUNDLES.map((b) => (
                <button
                  key={b.key}
                  onClick={() => onClickBundle(b.key)}
                  disabled={isOpening}
                  className={cn(
                    "group relative rounded-xl border bg-white p-2 sm:p-3 shadow-sm",
                    "transition hover:shadow-md hover:-translate-y-0.5",
                    isOpening && "opacity-70 cursor-wait"
                  )}
                >
                  <figure className="flex flex-col items-center">
                    {/* 이미지 컨테이너: 정사각, 내부 여백 최소화 */}
                    <div className="w-full aspect-square rounded-md border bg-white grid place-items-center p-1.5 sm:p-2">
                      <img
                        src={b.img}
                        alt={b.label}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                        draggable={false}
                        loading="lazy"
                      />
                    </div>
                    <figcaption className="mt-1.5 sm:mt-2 text-[11px] sm:text-sm font-medium text-zinc-800 text-center">
                      {b.label}
                    </figcaption>
                  </figure>

                  {/* 호버 오버레이 + 라벨(소형화) */}
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 rounded-xl",
                      "bg-amber-900/0 group-hover:bg-amber-900/5 transition-colors"
                    )}
                    aria-hidden
                  />
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-x-1.5 bottom-1.5",
                      "rounded-md border bg-amber-50/90 text-amber-900 text-[10px] sm:text-xs font-semibold",
                      "px-2 py-1 shadow-sm opacity-0 translate-y-1",
                      "group-hover:opacity-100 group-hover:translate-y-0 transition"
                    )}
                  >
                    감자 {b.cost} → 랜덤 재료 {b.count}개
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 풋터: sticky + 접근성 라이브 영역 */}
          <DialogFooter
            className={cn(
              "sticky bottom-0 z-10 p-3 sm:p-4 border-t",
              "bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70"
            )}
          >
            <div className="w-full">
              <div
                className={cn(
                  "rounded-lg border bg-slate-50 text-slate-800",
                  "px-3 py-2 text-sm sm:text-base"
                )}
                aria-live="polite"
              >
                {status}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
