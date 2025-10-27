// src/features/fortune/DailyFortuneCard.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { generateFortune, type Fortune } from "./generateFortune";
import TarotDetailDialog from "./TarotDetailDialog";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* 날짜 헬퍼 (KST, yyyy-MM-dd) */
function todayKST(): string {
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = fmt
    .replace(/\s/g, "")
    .replace(/\./g, "-")
    .slice(0, 10)
    .split("-");
  return `${y}-${m}-${d}`;
}

/* 다이얼로그 로딩 중 랜덤 문구 */
const LOADING_LINES = [
  "카드를 셔플하는 중…⏳",
  "별자리 정렬 확인 중…⏳",
  "수호천사와 교신 중…⏳",
  "운명의 수 계산 중…⏳",
];

export default function DailyFortuneCard({
  className,
  label = "🔮", // 버튼은 이모지 유지
  size = "icon",
  emojiSizePx = 22,
}: {
  className?: string;
  label?: string;
  size?: "icon" | "sm" | "default" | "lg";
  emojiSizePx?: number;
}) {
  const { user } = useUser();
  const userId = user?.id ?? null;
  const { addGold } = useCoupleContext();
  const d = todayKST();

  const [initialLoading, setInitialLoading] = useState(true);
  const [fortune, setFortune] = useState<Fortune | null>(null);

  // 결과 다이얼로그
  const [modalOpen, setModalOpen] = useState(false);

  // 로딩 모달 (여기서는 PNG 사용)
  const [showLoading, setShowLoading] = useState(false);
  const [loadingLine, setLoadingLine] = useState<string>("타로카드 정리중… ⏳");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goldGivenRef = useRef(false);

  // 오늘 결과 조회
  useEffect(() => {
    if (!userId) {
      setFortune(null);
      setInitialLoading(false);
      return;
    }
    (async () => {
      setInitialLoading(true);
      const { data, error } = await supabase
        .from("daily_fortune")
        .select("fortune")
        .eq("user_id", userId)
        .eq("d", d)
        .maybeSingle();

      if (error) setFortune(null);
      else setFortune((data?.fortune as Fortune) ?? null);

      setInitialLoading(false);
    })();
  }, [userId, d]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleOpen = async () => {
    setShowLoading(true);
    let i = 0;
    setLoadingLine("타로카드 정리중… ⏳");
    intervalRef.current = setInterval(() => {
      setLoadingLine(LOADING_LINES[i % LOADING_LINES.length]);
      i++;
    }, 380);

    timeoutRef.current = setTimeout(async () => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      if (!userId) {
        setShowLoading(false);
        toast.error("로그인 후 이용해 주세요.");
        return;
      }

      if (!fortune) {
        const nowD = todayKST();
        const f = generateFortune(`${userId}:${nowD}`);
        setFortune(f);

        try {
          if (!goldGivenRef.current) {
            goldGivenRef.current = true;
            await addGold(5);
            toast.success("골드를 획득했어요 +5");
          }
        } catch (e) {
          goldGivenRef.current = false;
          console.error("골드 지급 실패:", e);
          toast.error("골드 지급에 실패했어요. 잠시 후 다시 시도해 주세요.");
        }

        const { error } = await supabase.from("daily_fortune").upsert({
          user_id: userId,
          d: nowD,
          fortune: f,
        });
        if (error)
          toast.error("서버 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }

      setShowLoading(false);
      setModalOpen(true);
    }, 2000);
  };

  /* ====== UI ====== */

  if (initialLoading) {
    return (
      <div className={cn("inline-flex items-center justify-center", className)}>
        <Skeleton className="h-14 w-14 rounded-full" />
      </div>
    );
  }

  return (
    <>
      {/* 트리거 버튼: 이모지 유지 (ghost + 라디얼 호버) */}
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-flex", className)}>
              <Button
                type="button"
                variant="ghost"
                size={size}
                className={cn(
                  "relative h-10 w-10 transition-all",
                  "before:pointer-events-none before:absolute before:inset-0",
                  "before:opacity-0 hover:before:opacity-100 before:transition-opacity",
                  "before:bg-[radial-gradient(120px_80px_at_50%_-20%,rgba(255,182,193,0.35),transparent_60%)]",
                  { "w-auto px-3": size !== "icon" }
                )}
                aria-label="오늘의 타로 보기"
                onClick={handleOpen}
              >
                <span
                  style={{ fontSize: size === "icon" ? emojiSizePx : 18 }}
                  className={
                    size !== "icon"
                      ? "font-medium leading-none"
                      : "leading-none"
                  }
                  aria-hidden
                >
                  {label}
                </span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            오늘의 타로
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* 로딩 모달: ❗여기서 PNG 사용 (/tarot/loading.png) */}
      <Dialog
        open={showLoading}
        onOpenChange={(v) => {
          setShowLoading(v);
          if (!v) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }
        }}
      >
        <DialogContent className="max-w-[92vw] sm:max-w-xl p-0 overflow-hidden">
          <div className="p-5">
            <div
              className="
                grid gap-5 items-center
                grid-cols-1 sm:grid-cols-[auto,1fr]
                min-h-[260px] sm:min-h-[280px]
              "
            >
              {/* 왼쪽: PNG 비주얼 (원래대로 복귀) */}
              <div className="flex justify-center sm:justify-start">
                <img
                  src="/tarot/loading.png"
                  alt="타로 카드 준비 중"
                  className="w-28 sm:w-36 md:w-44 h-auto object-contain select-none"
                  loading="eager"
                  draggable={false}
                />
              </div>

              {/* 오른쪽: 문구 */}
              <div className="flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
                <div className="text-base sm:text-lg font-semibold">
                  타로카드 보기
                </div>
                <div className="mt-2 text-sm text-neutral-600">
                  {loadingLine}
                </div>

                <div className="mt-4 w-full max-w-[360px] hidden sm:block">
                  <div className="h-2 w-2/3 bg-neutral-200/80 rounded mb-2 animate-pulse" />
                  <div className="h-2 w-1/2 bg-neutral-200/70 rounded mb-2 animate-pulse" />
                  <div className="h-2 w-5/6 bg-neutral-200/60 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 결과 다이얼로그 (기존) */}
      <TarotDetailDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        fortune={fortune}
      />
    </>
  );
}
