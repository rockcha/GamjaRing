// src/components/layouts/AppHeader.tsx
"use client";

import React, { memo, Suspense, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";

import NotificationDropdown from "../widgets/Notification/NotificationDropdown";
import CoupleBalanceCard from "../widgets/Cards/CoupleBalanceCard";
import DaysTogetherBadge from "../DaysTogetherBadge";
import TodayQuestionInline from "../widgets/Cards/TodayQuestionCard";
import AvatarWidget from "../widgets/AvatarWidget";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeartPulse } from "@fortawesome/free-solid-svg-icons";

/* ✅ Notice & 기타 위젯 */
import NoticeCenterFloatingButton from "@/features/dev-note/NoticeFloatingButton";
import UserMemoEmojiButton from "@/features/memo/UserMemoEmojiButton";

/* ✅ NEW: 파트너 액션/기타 버튼 */
import PartnerActionButton from "../widgets/PartnerActionButton";
import TimeCapsuleButton from "@/features/time-capsule/TimeCapsuleButton";
import DailyFortuneCard from "@/features/fortune/DailyFortuneCard";
import KoreanQuoteButton from "../widgets/KoreanQuoteButton";
import WeatherCard from "../widgets/WeatherCard";
import SlotSpinButton from "../widgets/SlotSpinButton";

/* ───────────────────────── 유틸/토큰 ───────────────────────── */
const container = "mx-auto w-full max-w-screen-2xl px-3 sm:px-4";
const railGap = "gap-2 md:gap-3";
const iconBtn =
  "inline-flex items-center justify-center h-8 w-8 rounded-lg ring-1 ring-transparent hover:ring-neutral-200/80 hover:bg-white/60 transition " +
  "outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white " +
  "dark:focus-visible:ring-offset-neutral-900 motion-safe:active:scale-[0.98] motion-safe:hover:scale-[1.03]";

/* ───────────────────────── 스크롤 시 컴팩트 헤더 ───────────────────────── */
function useCompactHeader(threshold = 10) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      setCompact(window.scrollY > threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return compact;
}

/* ------------------------------ 상단 클러스터 ------------------------------ */
const TitleCluster = memo(function TitleCluster({
  routeTitle,
}: {
  routeTitle: string;
}) {
  return (
    <div className="pl-2 flex flex-col md:grid md:grid-rows-[auto_auto]">
      <div className="flex items-center">
        <FontAwesomeIcon
          icon={faHeartPulse}
          className="mr-2 shrink-0 text-rose-500/80"
        />
        <h1 className="truncate text-[clamp(20px,2.2vw,24px)] leading-tight font-extrabold tracking-tight">
          {routeTitle}
        </h1>
      </div>
      {/* ✅ 모바일에서는 감춤 */}
      <div className="min-h-[38px] hidden md:flex items-center">
        <p className="text-[11px] md:text-[12px] font-medium text-neutral-600/90 dark:text-neutral-300 truncate">
          우리의 기록이 자라나는 공간,{" "}
          <span className="font-semibold text-[13px] md:text-[15px] text-rose-500/80">
            감자링
          </span>
        </p>
      </div>
    </div>
  );
});

const CenterCluster = memo(function CenterCluster() {
  return (
    <div className="relative self-center order-last md:order-none">
      <div className="flex items-center gap-3 md:justify-center overflow-x-visible">
        <DaysTogetherBadge />
        <div className="md:hidden h-px w-3 shrink-0 bg-gradient-to-r from-transparent via-neutral-300/60 to-transparent" />
      </div>
    </div>
  );
});

const RightClusterDesktop = memo(function RightClusterDesktop() {
  return (
    <div className="hidden md:flex items-center justify-end gap-2 [--h:40px]">
      <CoupleBalanceCard showDelta dense className="h-[var(--h)]" />
      <Suspense
        fallback={
          <div className="h-[var(--h)] w-[var(--h)] rounded-full bg-neutral-200/70 dark:bg-neutral-800/70 animate-pulse" />
        }
      >
        <AvatarWidget className="h-[var(--h)]" />
      </Suspense>
    </div>
  );
});

/* ------------------------------ 모바일: 데스크탑 순서(좌→질문→우) 레일 ------------------------------ */
const MobileLinearRail = memo(function MobileLinearRail() {
  return (
    <div className={cn("md:hidden", container, "pb-2")}>
      <div
        className={cn(
          "flex items-stretch",
          railGap,
          "overflow-x-auto overscroll-x-contain no-scrollbar snap-x snap-mandatory px-2 py-2"
        )}
      >
        {/* ── Left group (데스크탑 좌측 버튼들) ────────────────── */}
        <div className="flex items-center gap-2 shrink-0 snap-start pr-1">
          <div className={iconBtn}>
            <NoticeCenterFloatingButton iconSize={16} />
          </div>
          <div className={iconBtn}>
            <NotificationDropdown iconSize={16} />
          </div>
          <div className={iconBtn}>
            <KoreanQuoteButton />
          </div>
          <div className={iconBtn}>
            <WeatherCard />
          </div>
        </div>

        {/* 구분선 */}
        <div className="shrink-0 self-stretch w-px bg-gradient-to-b from-transparent via-neutral-300/60 to-transparent" />

        {/* ── Question pill (가운데 질문) ─────────────────────── */}
        <div className="min-w-[76%] max-w-[92%] shrink-0 snap-start">
          <TodayQuestionInline />
        </div>

        {/* 구분선 */}
        <div className="shrink-0 self-stretch w-px bg-gradient-to-b from-transparent via-neutral-300/60 to-transparent" />

        {/* ── Right group (데스크탑 우측 버튼들) ───────────────── */}
        <div className="flex items-center gap-2 shrink-0 snap-start pl-1">
          <div className={iconBtn}>
            <PartnerActionButton />
          </div>
          <div className={iconBtn}>
            <SlotSpinButton />
          </div>
          <div className={iconBtn}>
            <DailyFortuneCard />
          </div>
          <div className={iconBtn}>
            <UserMemoEmojiButton />
          </div>
          <div className={iconBtn}>
            <TimeCapsuleButton />
          </div>
        </div>
      </div>
    </div>
  );
});

/* ------------------------------ 모바일: 1행(타이틀/밸런스/아바타), 2행(DaysTogether), 3행(레일) ------------------------------ */
const MobileRows = memo(function MobileRows({
  routeTitle,
}: {
  routeTitle: string;
}) {
  return (
    <>
      <div className={cn("md:hidden", container)}>
        {/* 1행: 타이틀(좌) + 밸런스/아바타(우) */}
        <div className="flex items-center justify-between py-2 gap-3">
          <div className="min-w-0 flex-1">
            <TitleCluster routeTitle={routeTitle} />
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <CoupleBalanceCard showDelta dense />
            <Suspense
              fallback={
                <div className="h-10 w-10 rounded-full bg-neutral-200/70 dark:bg-neutral-800/70 animate-pulse" />
              }
            >
              <AvatarWidget />
            </Suspense>
          </div>
        </div>

        {/* 2행: DaysTogether */}
        <div className="pb-2">
          <DaysTogetherBadge />
        </div>
      </div>

      {/* 3행: 데스크탑 순서(좌→질문→우) 그대로 가로 스크롤 레일 */}
      <MobileLinearRail />
    </>
  );
});

/* ------------------------------ 헤더 컴포넌트 ------------------------------ */
export default function AppHeader({
  routeTitle,
  className,
}: {
  routeTitle: string;
  className?: string;
}) {
  useUser();
  useCoupleContext();

  const isCompact = useCompactHeader(12);

  return (
    <header
      data-compact={isCompact ? "y" : "n"}
      className={cn(
        "sticky top-0 z-40 transition-[padding,box-shadow,backdrop-filter] duration-300",
        // 배경/블러/그라데이션 헤어라인
        "bg-white/55 dark:bg-neutral-900/55",
        "backdrop-blur-md supports-[backdrop-filter]:bg-white/45",
        // 라인/그림자
        "ring-1 ring-neutral-200/70 dark:ring-neutral-800/70",
        "shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]",
        // 라운딩·세이프에어리어
        "rounded-b-2xl pt-[env(safe-area-inset-top)]",
        // 컴팩트 높이
        "data-[compact=y]:py-1 data-[compact=n]:py-2",
        "overflow-x-hidden relative",
        className
      )}
    >
      {/* Top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-300/60 to-transparent" />

      {/* ✅ 모바일 레이아웃 */}
      <MobileRows routeTitle={routeTitle} />

      {/* ✅ 데스크톱 상단 그리드 */}
      <div className={cn("hidden md:block", container)}>
        <div
          className={cn(
            "grid items-center gap-4 py-3",
            "grid-cols-1",
            "md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(240px,0.7fr)]"
          )}
        >
          <TitleCluster routeTitle={routeTitle} />
          <div />
          <CenterCluster />
          <RightClusterDesktop />
        </div>
      </div>

      {/* ✅ 데스크톱 프리뷰 바: Question만 흰색 카드, 버튼은 배경 없음 */}
      <div className="hidden md:block relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px" />
        <div className={cn(container, "py-2")}>
          <div className={cn("flex items-center", "gap-2 px-0 py-0")}>
            {/* 좌측 버튼들(배경 없음, hover에서 약한 테두리) */}
            <div className="flex items-center gap-1.5 pl-1">
              <div className={iconBtn}>
                <NoticeCenterFloatingButton />
              </div>
              <div className={iconBtn}>
                <UserMemoEmojiButton />
              </div>
              <div className={iconBtn}>
                <KoreanQuoteButton />
              </div>
              <div className={iconBtn}>
                <WeatherCard />
              </div>
            </div>

            <div className="h-6 w-px bg-gradient-to-b from-transparent via-neutral-300/60 to-transparent" />

            {/* Question pill만 흰 배경 */}
            <div className="min-w-0 flex-1 border rounded-lg">
              <TodayQuestionInline />
            </div>

            <div className="h-6 w-px bg-gradient-to-b from-transparent via-neutral-300/60 to-transparent" />

            {/* 우측 버튼들 */}
            <div className="flex items-center gap-1.5 pl-1">
              <div className={iconBtn}>
                <PartnerActionButton />
              </div>
              <div className={iconBtn}>
                <NotificationDropdown />
              </div>
              <div className={iconBtn}>
                <SlotSpinButton />
              </div>
              <div className={iconBtn}>
                <DailyFortuneCard />
              </div>
              <div className={iconBtn}>
                <TimeCapsuleButton />
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-neutral-300/60 to-transparent" />
      </div>

      {/* Bottom hairline of header */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-neutral-300/60 to-transparent" />
    </header>
  );
}
