// src/features/potato_exchange/PotatoExchange.tsx
"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

/* 컨텍스트 & API */
import { useCoupleContext } from "@/contexts/CoupleContext";
import { addIngredients } from "@/features/kitchen/kitchenApi";

/* 아이콘 */
import { Gift, Loader2, Sparkles, Lock } from "lucide-react";
import { motion } from "framer-motion";

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
    gradient:
      "bg-[linear-gradient(135deg,#fffaf0_0%,#ffe6bf_55%,#ffd08b_100%)]", // amber light
  },
  {
    key: "pack",
    label: "재료 꾸러미",
    cost: 6,
    count: 2,
    img: "/exchange/bundle-pack.png",
    gradient:
      "bg-[linear-gradient(135deg,#fff7ed_0%,#ffd5ae_55%,#ffb781_100%)]", // orange
  },
  {
    key: "pile",
    label: "재료 더미",
    cost: 9,
    count: 3,
    img: "/exchange/bundle-pile.png",
    gradient:
      "bg-[linear-gradient(135deg,#fff1f2_0%,#ffc6cc_55%,#ff9aa4_100%)]", // rose
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
   작은 Pill(칩) 컴포넌트
========================= */
function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-white",
        "px-2 py-1 text-xs font-medium text-zinc-800 shadow-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

/* =========================
   번들 카드 (크게, 가독성↑)
========================= */
function BundleCard({
  disabled,
  img,
  label,
  subLabel,
  onClick,
  gradient,
  cost,
  count,
}: {
  disabled?: boolean;
  img: string;
  label: string;
  subLabel: string;
  onClick: () => void;
  gradient: string;
  cost: number;
  count: number;
}) {
  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
    [disabled, onClick]
  );

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={onKey}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "group relative rounded-2xl border bg-white p-3 text-left",

        "hover:pl-4 transition-all duration-500",
        disabled && "opacity-60 cursor-not-allowed "
      )}
      title={disabled ? "커플 연결 후 이용 가능" : undefined}
    >
      {/* 썸네일 크게 */}
      <figure className="flex items-center gap-3">
        <div
          className={cn(
            "shrink-0 w-20 h-20 rounded-xl border grid place-items-center p-1",
            gradient
          )}
        >
          <img
            src={img}
            alt={label}
            className="max-h-16 object-contain transition-transform duration-300 group-hover:scale-[1.04]"
            draggable={false}
            loading="lazy"
          />
        </div>
        <figcaption className="min-w-0">
          <div className="text-sm sm:text-base font-semibold text-zinc-900 truncate">
            {label}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Pill className="border-amber-300/70">
              <span aria-hidden>🥔</span> × {cost}
            </Pill>
            <Pill className="border-emerald-300/70">
              <span aria-hidden>📦</span> × {count}
            </Pill>
          </div>
        </figcaption>
      </figure>

      {/* 하단 서브 라벨 */}
      <div
        className={cn(
          "mt-3 rounded-lg",
          "border bg-amber-50/95 text-amber-900 text-[11px] font-semibold",
          "px-2 py-1 shadow-sm",
          disabled ? "opacity-80" : "group-hover:bg-amber-50"
        )}
      >
        {subLabel}
      </div>

      {disabled && (
        <div className="pointer-events-none absolute right-2 top-2 text-amber-700/80">
          <Lock className="w-4 h-4" />
        </div>
      )}
    </button>
  );
}

/* =========================
   보상 패널 (심플 리스트)
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
        "relative rounded-xl border",
        "bg-white/90",
        "p-3 sm:p-4 flex flex-col min-h-[220px]"
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm sm:text-base font-semibold text-zinc-900 inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600" aria-hidden /> 획득 결과
        </h3>
        <div className="text-xs text-zinc-500">{status}</div>
      </header>

      <div className="mt-3 sm:mt-4 flex-1">
        {!hasRewards ? (
          <div className="grid place-items-center h-full min-h-[140px]">
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-zinc-600">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> 열어보는 중…
                </div>
                <div className="w-full max-w-[440px] space-y-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
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
          <ul className="divide-y divide-zinc-200 rounded-lg border bg-white">
            {lastRewards.map((r, i) => (
              <li
                key={`${r.title}-${i}`}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <div
                  aria-hidden
                  className="grid place-items-center h-9 w-9 rounded-full border bg-zinc-50 text-xl"
                >
                  {r.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-zinc-900 truncate">
                    {r.title}
                  </div>
                  <div className="text-[11px] text-zinc-500">수량 1</div>
                </div>
              </li>
            ))}
          </ul>
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
    </section>
  );
}

/* =========================
   메인 컴포넌트
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
  const isCoupled = !!coupleId;

  const POOL = useMemo(
    () =>
      INGREDIENT_TITLES.map((t) => {
        const found = INGREDIENTS.find((i) => i.title === t);
        return { title: t as IngredientTitle, emoji: found?.emoji ?? "📦" };
      }),
    []
  );

  const openDialog = () => {
    setOpen(true);
    setStatus("원하시는 선택지를 골라주세요.");
    setLastRewards([]);
  };

  const onClickBundle = (bundleKey: BundleKey) => {
    if (isOpening || !isCoupled) return;
    const bundle = BUNDLES.find((b) => b.key === bundleKey)!;

    setIsOpening(true);
    setLastRewards([]);
    setStatus(`${bundle.label} 열어보는 중 … ⏳`);

    (async () => {
      try {
        // 1) 감자 차감
        const { error } = await spendPotatoes(bundle.cost);
        if (error) {
          setStatus(error.message || "감자 차감에 실패했어요.");
          setIsOpening(false);
          return;
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
        }, 900);
      } catch (err) {
        console.error(err);
        setStatus("오류가 발생했어요. 잠시 후 다시 시도해주세요.");
        setIsOpening(false);
      }
    })();
  };

  /* ===== PotatoPokeButton 스타일: 리플 구현 ===== */
  const [ripple, setRipple] = useState(false);
  const rippleTimer = useRef<number | null>(null);
  const startRipple = () => {
    setRipple(false);
    requestAnimationFrame(() => {
      setRipple(true);
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
      rippleTimer.current = window.setTimeout(() => setRipple(false), 1400);
    });
  };
  useEffect(() => {
    return () => {
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
    };
  }, []);

  return (
    <>
      {/* ✅ 오프너: 원형 이모지 버튼(텍스트 제거) */}
      <motion.button
        type="button"
        onClick={() => {
          startRipple();
          openDialog();
        }}
        aria-label={`${caption} 열기`}
        className={cn(
          "relative grid place-items-center",
          "h-14 w-14 rounded-full border",
          "bg-white/90",
          "hover:pl-4 transition-all duration-500",
          className
        )}
      >
        {/* 클릭 리플 */}
        {ripple && (
          <span
            className="
              pointer-events-none absolute inset-0 rounded-full
              ring-4 ring-rose-300/50
              animate-[pokePing_1.4s_ease-out_forwards]
            "
            aria-hidden
          />
        )}
        {/* PNG 아이콘만 표시 (텍스트 제거) */}
        <span className="text-2xl leading-none select-none" aria-hidden>
          🛍️
        </span>
        {/* 파동 키프레임 */}
        <style>{`
          @keyframes pokePing {
            0%   { transform: scale(1);   opacity: .75; }
            70%  { transform: scale(1.9); opacity: 0;   }
            100% { transform: scale(1.9); opacity: 0;   }
          }
        `}</style>
      </motion.button>

      {/* 모달 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "w-[min(92vw,1024px)] max-w-none rounded-2xl p-0 overflow-hidden"
          )}
        >
          {/* 헤더: 리본 + PotatoDisplay */}
          <DialogHeader
            className={cn(
              "sticky top-0 z-10 p-4 border-b",
              "bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base sm:text-lg tracking-tight">
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
            <div className="mt-3 h-px w-full bg-gradient-to-r from-amber-200/80 via-transparent to-transparent" />
          </DialogHeader>

          {/* 바디: 좌(7) 선택지 ↑ / 우(5) 결과 깔끔 */}
          <div className="px-3 sm:px-5 py-3 max-h-[65vh] overflow-y-auto">
            <div className="grid gap-3 grid-cols-1 md:grid-cols-12">
              {/* 선택지: 더 크게(7/12) */}
              <section className="md:col-span-7 rounded-xl border bg-white p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900 inline-flex items-center gap-2">
                    <Gift className="h-4 w-4" aria-hidden /> 선택지
                  </h3>
                  <div className="text-[11px] text-zinc-500">감자 사용</div>
                </div>

                {/* 1열(모바일) → 2열(>=md) 큰 카드 */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BUNDLES.map((b) => (
                    <BundleCard
                      key={b.key}
                      disabled={!isCoupled || isOpening}
                      img={b.img}
                      label={b.label}
                      subLabel={`감자 ${b.cost} → 재료 ${b.count}`}
                      onClick={() => onClickBundle(b.key)}
                      gradient={b.gradient}
                      cost={b.cost}
                      count={b.count}
                    />
                  ))}
                </div>

                {/* 하단 도움말 */}
                {!isCoupled && (
                  <div className="mt-2 text-[11px] text-amber-700/80">
                    커플 연결 후 이용할 수 있어요.
                  </div>
                )}
              </section>

              {/* 결과: 간결(5/12) */}
              <div className="md:col-span-5">
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
