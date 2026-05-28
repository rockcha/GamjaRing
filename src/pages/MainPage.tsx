// src/pages/MainPages/MainPage.tsx
"use client";

import { useUser } from "@/contexts/UserContext";
import { Skeleton } from "@/components/ui/skeleton";

/* 기존 카드들 */
import SoloUserCard from "@/components/widgets/Cards/SoloUserCard";
import CoupleSchedulePreview from "@/components/widgets/Cards/CoupleShedulePreview";
import CoupleMusicCard from "@/components/widgets/Cards/CoupleMusicCard";
import OneLinerCard from "@/components/widgets/Cards/OneLinerCard";
import CoupleMemoriesCarousel from "@/components/widgets/Cards/CoupleMemoriesCarousel";
import MainWeatherCard from "@/components/widgets/Cards/MainWeatherCard";

export default function MainPage() {
  const { isCoupled, loading } = useUser();

  // ✅ 로딩 중: 레이아웃 유지 + 감성 배너 느낌 스켈레톤
  if (loading) {
    return <MainPageSkeleton />;
  }

  // ✅ 솔로면 솔로 카드 + 감성 배너
  if (!isCoupled) {
    return (
      <div className="w-full">
        <div className="mx-auto space-y-2">
          <SoloUserCard />
        </div>
      </div>
    );
  }

  // ✅ 커플이면 기존 메인 레이아웃 + 상단 감성 배너
  return (
    <div className="w-full">
      <div
        className="grid gap-3 items-start grid-cols-1
        md:[grid-template-columns:minmax(220px,1fr)_minmax(0,0.9fr)]
        lg:[grid-template-columns:minmax(260px,0.9fr)_minmax(0,1.0fr)_minmax(0,1.0fr)]"
      >
        {/* 왼쪽: 일정 프리뷰 */}
        <div className="flex flex-col gap-3 min-w-0">
          <CoupleSchedulePreview
            className="h-[560px] w-full lg:h-[620px]"
            maxHeight="100%"
          />
          <MainWeatherCard className="h-[400px] lg:h-[420px]" />
        </div>

        {/* 가운데: 기억 슬라이더 */}
        <div className="flex flex-col gap-3 min-w-0">
          <CoupleMemoriesCarousel className="h-[560px] lg:h-[620px]" />
        </div>

        {/* 오른쪽: 한줄 기록 + 음악 */}
        <div className="flex flex-col gap-3 min-w-0">
          <OneLinerCard className="h-[560px] lg:h-[620px]" />
          <CoupleMusicCard className="h-[400px] lg:h-[420px]" />
        </div>
      </div>
    </div>
  );
}

/** 메인 페이지 레이아웃과 동일한 스켈레톤 */
function MainPageSkeleton() {
  return (
    <div className="w-full">
      {/* 감성 배너 스켈레톤 */}
      <div className="mb-2">
        <div className="h-16 w-full rounded-2xl bg-gradient-to-br from-slate-50 to-zinc-50 ring-1 ring-slate-200/60" />
      </div>

      <div
        className="grid gap-2 items-start grid-cols-1
        md:[grid-template-columns:minmax(220px,1fr)_minmax(0,0.9fr)]
        lg:[grid-template-columns:minmax(260px,0.9fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]"
      >
        {/* 왼쪽 가짜 카드들 */}
        <div className="flex flex-col gap-2 min-w-0">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-14 w-14 rounded-full" />
        </div>

        {/* 가운데 큰 이미지 스켈레톤 */}
        <div className="min-w-0">
          <Skeleton className="w-full h-[620px] rounded-xl" />
        </div>

        {/* 오른쪽 가짜 카드들 */}
        <div className="flex flex-col gap-2 min-w-0">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
