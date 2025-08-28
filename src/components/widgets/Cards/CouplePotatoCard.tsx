// src/features/couple/CouplePotatoCard.tsx
"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { potatoLevels } from "@/constants/Potatolevels";

// shadcn/ui
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CouplePoints = { level: number; point: number };

// ---- 원형 진행 링 상수(viewBox=0~100 기준) ----
const RING_RADIUS = 30; // 🔽 35 → 30
const RING_STROKE = 6; // 🔽 8 → 6
const OUTLINE_STROKE = 1.4; // 🔽 1.6 → 1.4
const OUTLINE_RADIUS = RING_RADIUS + RING_STROKE / 2 + OUTLINE_STROKE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function CouplePotatoCard({
  className,
}: {
  className?: string;
}) {
  const { user } = useUser();
  const [data, setData] = useState<CouplePoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatedPercent, setAnimatedPercent] = useState(0);

  // --- 데이터 로드 ---
  const fetchCoupleLevel = async () => {
    if (!user?.couple_id) return;
    const { data, error } = await supabase
      .from("couple_points")
      .select("level, point")
      .eq("couple_id", user.couple_id)
      .single();
    if (!error) setData(data);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchCoupleLevel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.couple_id]);

  // --- 실시간 갱신 ---
  useEffect(() => {
    if (!user?.couple_id) return;
    const ch = supabase
      .channel("realtime-couple-points-card")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couple_points",
          filter: `couple_id=eq.${user.couple_id}`,
        },
        fetchCoupleLevel
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.couple_id]);

  // --- 진행도 애니메이션 ---
  useEffect(() => {
    if (!data) return;
    const current = data.point % 10;
    const target = (current / 10) * 100;

    let raf = 0;
    const tick = () => {
      setAnimatedPercent((prev) => {
        const diff = target - prev;
        const step = diff * 0.08;
        const next = prev + step;
        if (Math.abs(diff) < 0.4) return target;
        raf = requestAnimationFrame(tick);
        return next;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data?.point]);

  // --- 파생 값 ---
  const level = data?.level ?? 1;
  const point = data?.point ?? 0;
  const info = potatoLevels[level - 1];
  const nextInfo = potatoLevels[level];
  const currentProgress = point % 10;
  const isMax = level >= 5;
  const remain = isMax ? 0 : 10 - currentProgress;

  return (
    <Card className={cn("bg-white p-3", className)}>
      <CardContent className="pt-2">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-[220px] rounded-lg" /> {/* 🔽 280 → 220 */}
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-2 w-full" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* 원형 링 + 감자 이미지 */}
            <div className="relative aspect-square w-full max-w-[240px]">
              {/* 🔽 max-w 320 → 240 */}
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full rotate-[-90deg] z-10"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient
                    id="progressGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#fcd34d" />
                  </linearGradient>
                </defs>

                <circle
                  cx="50"
                  cy="50"
                  r={OUTLINE_RADIUS}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth={OUTLINE_STROKE}
                />
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth={RING_STROKE}
                />
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth={RING_STROKE}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - animatedPercent / 100)}
                  strokeLinecap="round"
                />
              </svg>

              <img
                src={info?.image}
                alt={info?.name}
                className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] object-contain"
                // 🔽 56% → 50%
              />
            </div>

            {/* 현재 상태 */}
            <div className="w-full text-center">
              <div className="text-[clamp(1rem,2.2vw,1.25rem)] font-extrabold text-[#b75e20]">
                {info?.name ?? "감자"}
              </div>
              {info?.description && (
                <div className="mt-1 text-xs text-[#6b533b]">
                  {/* 🔽 text-sm → text-xs */}— {info.description}
                </div>
              )}
              {!isMax ? (
                <div className="mt-1 text-xs text-[#6b533b]">
                  다음 단계{" "}
                  <span className="text-orange-600 font-semibold">
                    {nextInfo?.name}
                  </span>
                  까지{" "}
                  <span className="text-orange-600 font-bold">{remain}</span>{" "}
                  포인트
                </div>
              ) : (
                <div className="mt-1 text-xs font-semibold text-green-700">
                  모든 단계를 완료했어요! 🎉
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
