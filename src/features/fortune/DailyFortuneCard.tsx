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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  caption = "타로카드",
}: {
  className?: string;
  caption?: string;
}) {
  const { user } = useUser();
  const userId = user?.id ?? null;
  const { addGold } = useCoupleContext();
  const d = todayKST();

  const [loading, setLoading] = useState(true); // DB 조회 로딩
  const [fortune, setFortune] = useState<Fortune | null>(null);

  // 상세(결과) 다이얼로그
  const [modalOpen, setModalOpen] = useState(false);

  // 로딩 모달
  const [showLoading, setShowLoading] = useState(false);
  const [loadingLine, setLoadingLine] = useState<string>("타로카드 정리중… ⏳");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goldGivenRef = useRef(false); // 최초 지급 가드
  const [imgLoaded, setImgLoaded] = useState(false); // 카드 PNG 로딩

  // 오늘 결과 조회
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("daily_fortune")
        .select("fortune")
        .eq("user_id", userId)
        .eq("d", d)
        .maybeSingle();

      if (error) setFortune(null);
      else setFortune((data?.fortune as Fortune) ?? null);

      setLoading(false);
    })();
  }, [userId, d]);

  // 정리용 클린업
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // 클릭 → 무조건 로딩 모달 띄우고 2초 후 상세 다이얼로그
  const handleOpen = async () => {
    // 로딩 문구 회전 시작
    setShowLoading(true);
    let i = 0;
    setLoadingLine("타로카드 정리중… ⏳");
    intervalRef.current = setInterval(() => {
      setLoadingLine(LOADING_LINES[i % LOADING_LINES.length]);
      i++;
    }, 380);

    // 2초 후 처리
    timeoutRef.current = setTimeout(async () => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      if (!userId) {
        setShowLoading(false);
        toast.error("로그인 후 이용해 주세요.");
        return;
      }

      // 오늘 첫 공개라면 생성 + 저장 + 골드 (이미 있으면 건너뜀)
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

      // 로딩 닫고 상세 열기
      setShowLoading(false);
      setModalOpen(true);
    }, 2000);
  };

  // 로딩 상태: 작은 아이콘 + 레이블 스켈레톤
  if (loading) {
    return (
      <div className={cn("inline-flex flex-col items-center", className)}>
        <Skeleton className="h-8 w-8 rounded-md mb-1" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }

  return (
    <>
      {/* 작은 아이콘 + 아래 텍스트 버튼 */}
      <Button
        variant="ghost"
        onClick={handleOpen}
        aria-label={`${caption} 열기`}
        className={cn(
          "p-0 h-auto inline-flex flex-col items-center gap-1",
          "group rounded-md transition-all duration-200 ease-out",
          "hover:-translate-y-0.5  hover:bg-neutral-50/60",
          "active:translate-y-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300/60 focus-visible:ring-offset-2",
          className
        )}
      >
        <img
          src="/tarot/DefaultCard.png"
          alt="타로 카드"
          className="
            h-8 w-8 object-contain
            transition-transform duration-200 
            group-hover:scale-110 group-active:scale-95
          "
          draggable={false}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
        />
        {!imgLoaded && <Skeleton className="h-8 w-8 rounded-md absolute" />}

        <span className="text-xs font-medium text-neutral-700 transition-colors group-hover:text-neutral-800">
          {caption}
        </span>
      </Button>

      {/* ✅ 로딩 모달: 좌 PNG / 우 문구(세로 중앙), 반응형 */}
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
              {/* 왼쪽: 로딩 이미지 */}
              <div className="flex justify-center sm:justify-start">
                <img
                  src="/tarot/loading.png" /* /public/tarot/loading.png */
                  alt="타로 카드 준비 중"
                  className="w-28 sm:w-36 md:w-44 h-auto object-contain select-none"
                  loading="eager"
                  draggable={false}
                />
              </div>

              {/* 오른쪽: 문구 (세로 중앙) */}
              <div className="flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
                <div className="text-base sm:text-lg font-semibold">
                  타로카드 보기
                </div>
                <div className="mt-2 text-sm text-neutral-600">
                  {loadingLine}
                </div>

                {/* 자리잡기용 스켈레톤 (sm 이상) */}
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

      {/* 결과 다이얼로그 (기존 그대로) */}
      <TarotDetailDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        fortune={fortune}
      />
    </>
  );
}
