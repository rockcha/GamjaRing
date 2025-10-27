// src/components/SlotSpinButton.tsx
"use client";

import * as React from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { X } from "lucide-react";

import { useCoupleContext } from "@/contexts/CoupleContext";
import {
  INGREDIENT_TITLES,
  type IngredientTitle,
} from "@/features/kitchen/type";
import { addIngredients } from "@/features/kitchen/kitchenApi";

/* shadcn/ui Tooltip */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ─ settings ─ */
const POTATO = "🥔";
const SYMBOL_POOL = ["🍒", "🍋", "🔔", "⭐️", "🍇", "🍀", "💎", "🍉"] as const;

/** 감자를 앞쪽(인덱스 0)으로 배치 */
const BASE = [POTATO, ...SYMBOL_POOL] as const; // 한 사이클
const STRIP = [...BASE, ...BASE, ...BASE] as const; // 부드러운 감속용 3배 스트립
const CELL = 64; // px (h-16)
type Tier = "평범" | "대박" | "초대박";

/* 등급별 테마(배지/배경/이펙트) */
const TIER_THEME: Record<
  Tier,
  { badge: string; bg: string; fx: "glow" | "spark" | "confetti" }
> = {
  평범: {
    badge: "bg-amber-100 text-amber-800 border border-amber-200",
    bg: "from-amber-50/70 to-transparent",
    fx: "glow",
  },
  대박: {
    badge: "bg-yellow-500 text-white",
    bg: "from-yellow-100/70 to-transparent",
    fx: "spark",
  },
  초대박: {
    badge: "bg-fuchsia-600 text-white",
    bg: "from-fuchsia-100/70 to-transparent",
    fx: "confetti",
  },
};

function sampleUnique<T>(arr: readonly T[], n: number) {
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = (Math.random() * pool.length) | 0;
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}
function pickIngredients(n: number): IngredientTitle[] {
  const out: IngredientTitle[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      INGREDIENT_TITLES[
        (Math.random() * INGREDIENT_TITLES.length) | 0
      ] as IngredientTitle
    );
  }
  return out;
}

/** 확률(70/25/5) + “감자가 앞쪽” 규칙으로 (심볼3, 등급) 결정 */
function roll(): { symbols: [string, string, string]; tier: Tier } {
  const r = Math.random() * 100;
  if (r < 70) {
    // 평범: [🥔, 일반, 일반(서로 다름)]
    const others = sampleUnique(SYMBOL_POOL, 2);
    return { symbols: [POTATO, others[0], others[1]], tier: "평범" };
  } else if (r < 95) {
    // 대박: [🥔, 🥔, 일반]
    const non = SYMBOL_POOL[(Math.random() * SYMBOL_POOL.length) | 0];
    return { symbols: [POTATO, POTATO, non], tier: "대박" };
  } else {
    // 초대박: [🥔, 🥔, 🥔]
    return { symbols: [POTATO, POTATO, POTATO], tier: "초대박" };
  }
}

/* ─ 등급 이펙트 ─ */
function TierFX({ tier }: { tier: Tier | null }) {
  if (!tier) return null;
  const kind = TIER_THEME[tier].fx;

  if (kind === "glow") {
    return (
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0.25 }}
        animate={{ opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 1.8, repeat: 1 }}
        style={{
          background:
            "radial-gradient(60% 60% at 50% 50%, rgba(251,191,36,0.25) 0%, rgba(0,0,0,0) 70%)",
        }}
      />
    );
  }

  if (kind === "spark") {
    const items = Array.from({ length: 10 });
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {items.map((_, i) => (
          <motion.span
            key={i}
            className="absolute"
            initial={{ opacity: 0, scale: 0.3, rotate: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.3, 1.1, 0.8],
              rotate: [0, 90 + i * 10, 180 + i * 10],
              x: [0, (i % 2 ? 1 : -1) * (30 + i * 4)],
              y: [0, -40 - i * 6],
            }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ left: "50%", top: "48%" }}
          >
            ✨
          </motion.span>
        ))}
      </div>
    );
  }

  // confetti
  const parts = React.useMemo(
    () =>
      Array.from({ length: 16 }).map((_, i) => ({
        x: (i - 8) * 8,
        color: i % 2 ? "#ec4899" : "#8b5cf6",
      })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {parts.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded"
          style={{ left: "50%", top: "30%", backgroundColor: p.color }}
          initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: [0, p.x, p.x * 1.2],
            y: [0, 80 + i * 6, 120 + i * 8],
            rotate: [0, 180 + i * 10, 360 + i * 20],
          }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export default function SlotSpinButton({
  className,
  ariaLabel = "감자 슬롯",
  spinCost = 30,
}: {
  className?: string;
  ariaLabel?: string;
  spinCost?: number;
}) {
  const { couple, spendGold, addGold, addPotatoes } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  // Dialog/상태
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [tier, setTier] = React.useState<Tier | null>(null);
  const [symbols, setSymbols] = React.useState<[string, string, string] | null>(
    null
  );
  const [rewardText, setRewardText] = React.useState("");
  const [rewardDetail, setRewardDetail] = React.useState<string | null>(null);

  // 릴 컨트롤
  const reels = [
    useAnimationControls(),
    useAnimationControls(),
    useAnimationControls(),
  ];

  const onOpen = () => {
    // 초기화
    setTier(null);
    setSymbols(null);
    setRewardText("");
    setRewardDetail(null);
    setOpen(true);
  };

  // 보상 지급(실행) + 영수증 텍스트 구성
  const grant = async (decided: Tier) => {
    const pick = (Math.random() * 3) | 0;
    if (decided === "평범") {
      if (pick === 0) {
        await addPotatoes?.(1);
        setRewardDetail("🥔 ×1 지급 완료");
        return "🥔 1개";
      } else if (pick === 1) {
        if (!coupleId) throw new Error("커플 연동 필요");
        const titles = pickIngredients(2);
        await addIngredients(coupleId, titles);
        setRewardDetail(`재료 2개 지급: ${titles.join(", ")}`);
        return "랜덤 재료 2개";
      } else {
        await addGold?.(25);
        setRewardDetail("🪙 25 지급 완료");
        return "🪙 25";
      }
    }
    if (decided === "대박") {
      if (pick === 0) {
        await addPotatoes?.(3);
        setRewardDetail("🥔 ×3 지급 완료");
        return "🥔 3개";
      } else if (pick === 1) {
        if (!coupleId) throw new Error("커플 연동 필요");
        const titles = pickIngredients(6);
        await addIngredients(coupleId, titles);
        setRewardDetail(`재료 6개 지급: ${titles.join(", ")}`);
        return "랜덤 재료 6개";
      } else {
        await addGold?.(75);
        setRewardDetail("🪙 75 지급 완료");
        return "🪙 75";
      }
    }
    // 초대박
    if (pick === 0) {
      await addPotatoes?.(6);
      setRewardDetail("🥔 ×6 지급 완료");
      return "🥔 6개";
    } else if (pick === 1) {
      if (!coupleId) throw new Error("커플 연동 필요");
      const titles = pickIngredients(12);
      await addIngredients(coupleId, titles);
      setRewardDetail(`재료 12개 지급: ${titles.join(", ")}`);
      return "랜덤 재료 12개";
    } else {
      await addGold?.(150);
      setRewardDetail("🪙 150 지급 완료");
      return "🪙 150";
    }
  };

  // 릴 시작(무한 루프 기동만 함 — await 금지)
  const startReel = (
    ctrl: ReturnType<typeof useAnimationControls>,
    speed: number
  ) => {
    ctrl.set({ y: 0 });
    void ctrl.start({
      y: -CELL * (STRIP.length - 1),
      transition: { duration: speed, ease: "linear", repeat: Infinity },
    });
  };

  // 목표 심볼에 감속 정지
  const stopTo = async (
    ctrl: ReturnType<typeof useAnimationControls>,
    sym: string,
    duration = 0.6
  ) => {
    const idx = BASE.indexOf(sym as any); // 0~BASE-1 (감자가 맨 앞)
    const targetIdx = BASE.length * 2 + idx; // 뒤쪽 사이클로 정렬 → 감속 느낌
    const y = -CELL * targetIdx;
    ctrl.stop();
    await ctrl.start({ y, transition: { duration, ease: "easeOut" } });
  };

  // 3초 감속 로직: 0~1.2s 고속, 그 뒤 0.6s 간격으로 3릴 순차 감속
  const spin = async () => {
    if (busy) return;
    if (!coupleId) {
      toast.error("커플 연동이 필요해요.");
      return;
    }
    setBusy(true);
    setTier(null);
    setSymbols(null);
    setRewardText("");
    setRewardDetail(null);

    try {
      // 1) 🪙 차감
      if (!spendGold) throw new Error("spendGold 미구현");
      const { error } = await spendGold(spinCost);
      if (error) {
        toast.error(error.message || "골드 차감 실패");
        setBusy(false);
        return;
      }

      // 2) 결과 미리 결정 (감자 앞쪽 고정)
      const { symbols: final, tier: decidedTier } = roll();

      // 3) 고속 롤링 시작
      startReel(reels[0], 0.5);
      startReel(reels[1], 0.55);
      startReel(reels[2], 0.6);

      // 4) 순차 감속
      await new Promise((r) => setTimeout(r, 1200)); // t = 1.2s
      await stopTo(reels[0], final[0], 0.6); // t = 1.8s
      await new Promise((r) => setTimeout(r, 600));
      await stopTo(reels[1], final[1], 0.6); // t = 2.4s
      await new Promise((r) => setTimeout(r, 600));
      await stopTo(reels[2], final[2], 0.6); // t = 3.0s

      // 5) 결과/등급 표시
      setSymbols(final);
      setTier(decidedTier);

      // 6) 실제 보상 지급 + 영수증 텍스트
      const txt = await grant(decidedTier);
      setRewardText(txt);
      toast.success(`보상 지급: ${txt}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "슬롯 오류");
    } finally {
      reels.forEach((c) => c.stop());
      setBusy(false);
    }
  };

  const tierTheme = tier ? TIER_THEME[tier] : null;

  return (
    <>
      {/* ───── Trigger: ghost + 라디얼 호버 + Tooltip ───── */}
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-flex", className)}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "relative h-10 w-10 transition-all",
                  "before:pointer-events-none before:absolute before:inset-0",
                  "before:opacity-0 hover:before:opacity-100 before:transition-opacity",
                  "before:bg-[radial-gradient(120px_80px_at_50%_-20%,rgba(255,182,193,0.35),transparent_60%)]"
                )}
                aria-label={ariaLabel}
                onClick={onOpen}
              >
                <span className="leading-none text-[22px]" aria-hidden>
                  🎰
                </span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            감자 룰렛
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* ───── Dialog: 우상단 X, 스티키 헤더/푸터, 바깥클릭/ESC 방지 ───── */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v && busy) return; // 스핀 중 닫기 방지
          setOpen(v);
        }}
      >
        <DialogContent
          className={cn(
            "w-[calc(100vw-2rem)] sm:max-w-[520px] rounded-2xl",
            "p-4 sm:p-6",
            "max-h-[85vh] overflow-hidden"
          )}
          onInteractOutside={(e) => busy && e.preventDefault()}
          onEscapeKeyDown={(e) => busy && e.preventDefault()}
        >
          {/* 닫기(X): busy일 땐 비활성 */}
          {busy ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-9 w-9 rounded-full opacity-60"
              aria-label="닫기"
              disabled
            >
              <X className="h-5 w-5" />
            </Button>
          ) : (
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-9 w-9 rounded-full"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          )}

          {/* 등급 이펙트 (배경 위) */}
          <TierFX tier={tier ?? null} />

          {/* 스티키 헤더 */}
          <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 px-4 pt-4 pb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-t-2xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
                감자 룰렛
                {tier && (
                  <Badge className={cn("ml-1", tierTheme?.badge)}>{tier}</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* 릴 + 등급별 배경 그라데이션 */}
          <div
            className={cn(
              "rounded-xl p-3 bg-gradient-to-b",
              tierTheme?.bg || "from-transparent to-transparent"
            )}
          >
            <div className="flex items-center justify-center gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="relative h-16 w-16 overflow-hidden rounded-xl border bg-white shadow-sm"
                >
                  <motion.div animate={reels[i]} className="flex flex-col">
                    {STRIP.map((s, idx) => (
                      <div
                        key={`${s}-${idx}`}
                        className={cn(
                          "h-16 w-16 grid place-items-center text-4xl select-none",
                          // 감자 하이라이트 링
                          symbols?.[i] === POTATO &&
                            s === POTATO &&
                            "ring-2 ring-amber-400/70 rounded-xl"
                        )}
                      >
                        {s}
                      </div>
                    ))}
                  </motion.div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* 안내/보상/영수증 */}
            <div className="text-center space-y-1">
              {!symbols ? (
                <>
                  <div className="text-lg font-semibold">감자 룰렛 돌리기</div>
                  <div className="text-[11px] text-zinc-500">
                    감자 갯수에 따라 <b>높은 보상</b>을 받습니다.
                    <br /> (🥔 70% → <b>평범</b> / 🥔🥔 25% → <b>대박</b> /
                    🥔🥔🥔 5% → <b>초대박</b>)
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">보상</div>
                  <div className="text-lg font-semibold">{rewardText}</div>
                  {rewardDetail && (
                    <div className="text-xs text-zinc-500 mt-1">
                      {rewardDetail}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 스티키 푸터 */}
          <div className="sticky bottom-0 mt-4 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-b-2xl">
            <DialogFooter className="sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="h-10"
              >
                닫기
              </Button>
              <Button onClick={spin} disabled={busy} className="h-10">
                {busy ? "돌리는 중…" : `돌리기 ( 🪙 ${spinCost} )`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
