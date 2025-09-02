// src/features/fortune/DailyFortuneCard.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import ScratchToReveal from "@/components/magicui/scratch-to-reveal";

import { generateFortune, type Fortune } from "./generateFortune";
import TarotBack from "./TarotBack";
import TarotDetailDialog from "./TarotDetailDialog";
import TarotPreviewCard from "./TarotPreviewCard";

/* ✅ 추가 */
import { useCoupleContext } from "@/contexts/CoupleContext";

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

export default function DailyFortuneCard() {
  const { user } = useUser();

  const userId = user?.id ?? null;

  /* ✅ 추가: addGold */
  const { addGold } = useCoupleContext();

  // 렌더 시점의 오늘 날짜 (state 아님)
  const d = todayKST();

  const [loading, setLoading] = useState(true);
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // 부모 컨테이너 1회 측정
  const boxRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const w = Math.floor(el.clientWidth);
    const h = Math.floor((w * 3) / 2);
    setDims({ w, h });
  }, []);

  // 오늘 날짜 row 존재 여부만으로 분기
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

      if (error) {
        setFortune(null); // 서버 에러 → 스크래치 상태로
      } else {
        setFortune((data?.fortune as Fortune) ?? null);
      }
      setLoading(false);
    })();
  }, [userId, d]);

  /* ✅ 중복 지급 방지 가드 */
  const goldGivenRef = useRef(false);

  // 스크래치 완료 → 모달 즉시 오픈 / DB 저장은 백그라운드
  const handleScratchComplete = async () => {
    if (!userId) return;

    // 이미 오늘 운세가 있었으면(이론상 호출 안 되지만) 가드
    if (fortune || goldGivenRef.current) return;

    const nowD = todayKST();
    const f = generateFortune(`${userId}:${nowD}`);
    setFortune(f);
    setModalOpen(true);

    // ✅ 골드 5 지급 (최초 공개시에만)
    try {
      goldGivenRef.current = true; // 먼저 잠금
      await addGold(5);
      toast.success(`골드를 획득했어요 +5`);
    } catch (e) {
      goldGivenRef.current = false; // 실패시 잠금 해제
      console.error("골드 지급 실패:", e);
      toast.error("골드 지급에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }

    // DB 저장(백그라운드)
    const { error } = await supabase.from("daily_fortune").upsert({
      user_id: userId,
      d: nowD,
      fortune: f,
    });
    if (error) {
      toast.error("서버 저장에 실패했지만, 다시 시도해 주세요.");
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader className="flex items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2">
          🍀 오늘의 운세
        </CardTitle>
        {fortune && (
          <div className="mt-1 text-center">
            <span className="inline-block rounded-md bg-black/40 px-2 py-1 text-xs font-medium text-white">
              {fortune.title} · {fortune.grade}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="mx-auto w-full max-w-[200px] sm:max-w-[180px]">
          <div ref={boxRef} className="relative w-full aspect-[2/3]">
            {loading || dims.w === 0 ? (
              <Skeleton className="absolute inset-0 rounded-3xl" />
            ) : !fortune ? (
              <ScratchToReveal
                width={dims.w}
                height={Math.floor((dims.w * 3) / 2)}
                minScratchPercentage={55}
                eraserRadius={34}
                gradientColors={["#f5f5f4", "#e5e7eb", "#f5f5f4"]}
                onComplete={handleScratchComplete}
                className="absolute inset-0 shadow-sm rounded-3xl overflow-hidden"
                overlay={
                  <div className="absolute inset-0 grid place-items-center px-6">
                    <div className="text-lg font-semibold text-neutral-800">
                      문질러서
                      <br /> 확인하기
                    </div>
                  </div>
                }
              >
                <TarotBack />
              </ScratchToReveal>
            ) : (
              <TarotPreviewCard
                grade={fortune.grade}
                title={fortune.title}
                onClick={() => setModalOpen(true)}
              />
            )}
          </div>
        </div>
      </CardContent>

      <TarotDetailDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        fortune={fortune}
      />
    </Card>
  );
}
