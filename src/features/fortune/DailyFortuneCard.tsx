// src/features/fortune/DailyFortuneCard.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/contexts/ToastContext";
import ScratchToReveal from "@/components/magicui/scratch-to-reveal";

import { generateFortune, type Fortune, type Grade } from "./generateFortune";
import { TAROT_CARD_SRC } from "./theme";
import TarotBack from "./TarotBack";
import TarotPreviewCard from "./TarotPreviewCard";
import TarotDetailDialog from "./TarotDetailDialog";
import { THEME } from "./theme";
import { cn } from "@/lib/utils";
/* 날짜/키 */
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
const lsKey = (userId: string, d: string) => `daily_fortune:${userId}:${d}`;

export default function DailyFortuneCard() {
  const { user } = useUser();
  const { open: toast } = useToast();
  const userId = user?.id ?? null;
  const d = useMemo(() => todayKST(), []);

  const [loading, setLoading] = useState(true);
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [revealedGrade, setRevealedGrade] = useState<Grade | null>(null);

  // 👇 부모 컨테이너(width 제한된 div)의 실제 폭을 '한 번만' 측정해서 px로 사용
  const boxRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const grade: Grade | null = fortune?.grade ?? revealedGrade ?? null; // 👈 지금 보여줄 grade

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const w = Math.floor(el.clientWidth);
    const h = Math.floor((w * 3) / 2);
    setDims({ w, h });
  }, []);

  // 최초 로드: DB → 없으면 캐시 제거 → 서버 오류면 캐시 폴백
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const key = lsKey(userId, d);
      const { data, error } = await supabase
        .from("daily_fortune")
        .select("fortune")
        .eq("user_id", userId)
        .eq("d", d)
        .maybeSingle();

      if (!error) {
        if (data?.fortune) {
          setFortune(data.fortune as Fortune);
          setRevealedGrade((data.fortune as Fortune).grade);
          localStorage.setItem(key, JSON.stringify(data.fortune));
        } else {
          localStorage.removeItem(key);
          setFortune(null);
          setRevealedGrade(null);
        }
        setLoading(false);
        return;
      }

      // 서버 오류 시 캐시 폴백
      const cached = localStorage.getItem(key);
      if (cached) {
        const f = JSON.parse(cached) as Fortune;
        setFortune(f);
        setRevealedGrade(f.grade);
      } else {
        setFortune(null);
        setRevealedGrade(null);
      }
      setLoading(false);
    })();
  }, [userId, d]);

  // 스크래치 완료 → 생성/저장 → 카드 미리보기 + 모달
  const handleScratchComplete = async () => {
    if (!userId) return;
    const f = generateFortune(`${userId}:${d}`);
    setFortune(f);
    setRevealedGrade(f.grade);
    localStorage.setItem(lsKey(userId, d), JSON.stringify(f));
    const { error } = await supabase.from("daily_fortune").upsert({
      user_id: userId,
      d,
      fortune: f,
    });
    if (error) toast("서버 저장에 실패했지만, 이 브라우저엔 저장됐어요.");
    setModalOpen(true);
  };

  return (
    <Card className="bg-white">
      <CardHeader className="flex items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2">
          오늘의 운세
          {grade && <p className="text-[11px] text-black">( {grade} )</p>}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="w-full">
          {/* 부모 기준 과하지 않게: w-full, 최대폭 제한 후 중앙정렬 */}
          <div className="mx-auto w-full max-w-[200px] sm:max-w-[180px]">
            {/* 이 상자 너비를 항상 렌더해서 측정 → ScratchToReveal px에 사용 */}
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
                    <div className="text-center px-6">
                      <div className="text-lg font-semibold text-neutral-800">
                        문질러서 운세를 확인하세요!
                      </div>
                    </div>
                  }
                >
                  {revealedGrade ? (
                    <img
                      src={TAROT_CARD_SRC[revealedGrade]}
                      alt={`${revealedGrade} 타로카드`}
                      className="w-full h-full object-cover rounded-3xl"
                      loading="lazy"
                    />
                  ) : (
                    <TarotBack />
                  )}
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
