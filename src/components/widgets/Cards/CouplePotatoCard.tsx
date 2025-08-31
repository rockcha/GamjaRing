// src/features/couple/CouplePotatoCard.tsx
"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { potatoLevels } from "@/constants/Potatolevels";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const RING_RADIUS = 30;
const RING_STROKE = 6;
const OUTLINE_STROKE = 1.4;
const OUTLINE_RADIUS = RING_RADIUS + RING_STROKE / 2 + OUTLINE_STROKE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type CouplePoints = { level: number; point: number };

export default function CouplePotatoCard({
  className,
}: {
  className?: string;
}) {
  const { user } = useUser();
  const [data, setData] = useState<CouplePoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [open, setOpen] = useState(false);

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

  const level = data?.level ?? 1;
  const point = data?.point ?? 0;
  const info = potatoLevels[level - 1];
  const nextInfo = potatoLevels[level];
  const currentProgress = point % 10;
  const isMax = level >= 5;
  const remain = isMax ? 0 : 10 - currentProgress;

  const DetailedView = (
    <div className="flex flex-col items-center gap-3">
      <div className="relative aspect-square w-full max-w-[240px]">
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
        />
      </div>

      <div className="w-full text-center">
        <div className="text-[clamp(1rem,2.2vw,1.25rem)] font-extrabold text-[#b75e20]">
          {info?.name ?? "감자"}
        </div>
        {info?.description && (
          <div className="mt-1 text-xs text-[#6b533b]">
            — {info.description}
          </div>
        )}
        {!isMax ? (
          <div className="mt-1 text-xs text-[#6b533b]">
            다음 단계{" "}
            <span className="text-orange-600 font-semibold">
              {nextInfo?.name}
            </span>
            까지 <span className="text-orange-600 font-bold">{remain}</span>{" "}
            포인트
          </div>
        ) : (
          <div className="mt-1 text-xs font-semibold text-green-700">
            모든 단계를 완료했어요! 🎉
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ✅ 기본: 작은 아이콘 + 아래 타이틀만 있는 ghost 버튼 (테두리/배경 없음) */}
      {loading ? (
        <div className={cn("inline-flex flex-col items-center", className)}>
          <Skeleton className="h-8 w-8 rounded-full mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      ) : (
        <Button
          variant="ghost"
          onClick={() => setOpen(true)}
          aria-label="우리의 감자 자세히 보기"
          className={cn(
            // 기존
            "p-0 h-auto inline-flex flex-col items-center gap-1",
            // ✨ 호버 효과 추가
            "group rounded-md transition-all duration-200 ease-out",
            "hover:-translate-y-0.5 hover:shadow-sm hover:bg-amber-50/60",
            "active:translate-y-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 focus-visible:ring-offset-2",
            className
          )}
        >
          <img
            src={info?.image}
            alt={info?.name}
            className="
        h-8 w-8 object-contain
        transition-transform duration-200 drop-shadow-sm
        group-hover:scale-110 group-active:scale-95
      "
          />
          <span
            className="
        text-xs font-medium text-[#b75e20]
        transition-colors group-hover:text-[#8a3f12]
      "
          >
            {info?.name ?? "감자"}
          </span>
        </Button>
      )}

      {/* 상세 Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <DialogTitle>우리의 감자</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-[220px] rounded-lg" />
              <Skeleton className="h-5 w-1/2 mx-auto" />
              <Skeleton className="h-2 w-full" />
            </div>
          ) : (
            <div className="py-1 flex justify-center">{DetailedView}</div>
          )}

          <DialogFooter className="justify-center sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="hover:cursor-pointer"
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
