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

/* ✅ 변경: 낙관적 업데이트용 컨텍스트 메서드 사용 */
import { useCoupleContext } from "@/contexts/CoupleContext";
import { addIngredients } from "@/features/kitchen/kitchenApi"; // 지급은 그대로 사용

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
  const [imgLoaded, setImgLoaded] = useState(false); // 런처 아이콘 스켈레톤

  /* ✅ 컨텍스트: 낙관적 감자 차감 메서드 사용 */
  const { couple, spendPotatoes /*, addPotatoes*/ } = useCoupleContext();
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
    if (isOpening) return; // 중복 클릭 방지

    const bundle = BUNDLES.find((b) => b.key === bundleKey)!;
    setIsOpening(true);
    setLastRewards([]);
    setStatus(`${bundle.label} 열어보는 중 .... ⏳`);

    (async () => {
      try {
        // ✅ 1) 낙관적 감자 차감: 즉시 PotatoDisplay에 반영됨
        if (coupleId) {
          const { error } = await spendPotatoes(bundle.cost);
          if (error) {
            setStatus(error.message || "감자 차감에 실패했어요.");
            setIsOpening(false);
            return; // 차감 실패 시 중단
          }
        }

        // ⏳ 2) 연출 후 결과 지급 (기존 흐름 유지)
        window.setTimeout(async () => {
          try {
            // 보상 추출
            const rewards = sampleUnique(POOL, bundle.count);
            setLastRewards(rewards);

            // 재료 지급
            if (coupleId) {
              const titles = rewards.map((r) => r.title);
              await addIngredients(coupleId, titles);
            }

            // 상태 메시지 업데이트
            const em = rewards.map((r) => r.emoji).join(" ");
            setStatus(`획득! ${em}`);
          } catch (err) {
            console.error(err);
            setStatus("지급 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.");

            // (선택) 지급 실패 시 감자 환불이 필요하면 아래 주석 해제
            // if (coupleId) {
            //   await addPotatoes?.(bundle.cost);
            // }
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
      {/* =========================
          오프너 버튼
      ========================== */}
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
        <span className="text-xs font-medium text-neutral-700 transition-colors group-hover:text-neutral-800">
          {caption}
        </span>
      </Button>

      {/* =========================
          모달
      ========================== */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[720px] rounded-2xl p-0">
          {/* 헤더: 타이틀 + PotatoDisplay 우측 정렬 */}
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <DialogTitle className="text-lg">감자교환소</DialogTitle>
                <p className="text-xs text-neutral-500 mt-0.5">
                  감자와 재료를 교환 할 수 있어요
                </p>
              </div>
              <div className="ml-auto mr-4">
                <PotatoDisplay />
              </div>
            </div>
          </DialogHeader>

          {/* 바디: 3개 카드 가로 배치 */}
          <div className="p-4 sm:p-5">
            <div className={cn("grid gap-3", "grid-cols-1 sm:grid-cols-3")}>
              {BUNDLES.map((b) => (
                <button
                  key={b.key}
                  onClick={() => onClickBundle(b.key)}
                  disabled={isOpening}
                  className={cn(
                    "group relative rounded-2xl border bg-white p-3 shadow-sm",
                    "transition hover:shadow-md hover:-translate-y-0.5",
                    isOpening && "opacity-70 cursor-wait"
                  )}
                >
                  <figure className="flex flex-col items-center">
                    <div className="w-full aspect-[4/3] rounded-lg border bg-white grid place-items-center p-2">
                      <img
                        src={b.img}
                        alt={b.label}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                        draggable={false}
                        loading="lazy"
                      />
                    </div>
                    <figcaption className="mt-2 text-sm font-medium text-zinc-800">
                      {b.label}
                    </figcaption>
                  </figure>

                  {/* 호버 오버레이 */}
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 rounded-2xl",
                      "bg-amber-900/0 group-hover:bg-amber-900/5 transition-colors"
                    )}
                    aria-hidden
                  />
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-x-2 bottom-2",
                      "rounded-lg border bg-amber-50/90 text-amber-900 text-xs font-semibold",
                      "px-2.5 py-1.5 shadow-sm opacity-0 translate-y-1",
                      "group-hover:opacity-100 group-hover:translate-y-0 transition"
                    )}
                  >
                    감자 {b.cost} → 랜덤 재료 {b.count}개
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 풋터: 상태 메시지 */}
          <DialogFooter className="p-4 border-t">
            <div className="w-full">
              <div
                className={cn(
                  "rounded-lg border bg-slate-50 text-slate-800",
                  "px-3 py-2.5 text-sm"
                )}
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
