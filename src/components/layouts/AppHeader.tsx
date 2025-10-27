// src/components/layouts/AppHeader.tsx
"use client";

import React, { memo } from "react";
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

/* ───────────────────────── 타입 ───────────────────────── */
// (필요 시 타입 추가)

/* ------------------------------ 상단 클러스터 ------------------------------ */
const TitleCluster = memo(function TitleCluster({
  routeTitle,
}: {
  routeTitle: string;
}) {
  return (
    <div className="pl-2 flex flex-col md:grid md:grid-rows-[auto_auto]">
      <div className="flex items-center text-3xl">
        <FontAwesomeIcon
          icon={faHeartPulse}
          className=" mr-2 shrink-0 text-rose-500/80"
        />
        <h1 className="truncate text-2xl font-extrabold tracking-tight">
          {routeTitle}
        </h1>
      </div>
      {/* ✅ 모바일에서는 감춤 */}
      <div className="min-h-[38px] hidden md:flex items-center">
        <p className="text-[12px] font-medium text-neutral-700 truncate ">
          우리의 기록이 자라나는 공간,{" "}
          <span className="font-semibold text-[15px] text-rose-500/80">
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
    <div className="hidden md:flex items-center justify-end gap-2">
      <CoupleBalanceCard showDelta dense />
      <AvatarWidget />
    </div>
  );
});

/* ------------------------------ 모바일: 데스크탑 순서(좌→질문→우) 레일 ------------------------------ */
/** 모바일에서만 좌측 버튼군 → 질문 → 우측 버튼군을 가로 스크롤로 순서 유지해 노출 */
const MobileLinearRail = memo(function MobileLinearRail() {
  return (
    <div className="md:hidden mx-auto w-full max-w-screen-2xl px-3 sm:px-4 pb-2">
      <div
        className={cn(
          "flex items-stretch gap-2",
          "overflow-x-auto overscroll-x-contain",
          // 프로젝트에 유틸이 있으면 스크롤바 감춤: no-scrollbar / scrollbar-none
          "no-scrollbar",
          "snap-x snap-mandatory",
          "px-1.5 py-2"
        )}
      >
        {/* ── Left group (데스크탑 좌측 버튼들) ────────────────── */}
        <div className="flex items-center gap-1.5 shrink-0 snap-start">
          <NoticeCenterFloatingButton iconSize={16} />
          <NotificationDropdown iconSize={16} />
          <KoreanQuoteButton />
          <WeatherCard />
        </div>

        {/* 구분선 */}
        <div className="shrink-0 self-stretch w-px bg-gradient-to-b from-transparent via-neutral-300/60 to-transparent" />

        {/* ── Question pill (가운데 질문) ─────────────────────── */}
        <div className="min-w-[75%] max-w-[92%] shrink-0 snap-start">
          <div className="px-2 py-1 rounded-xl bg-white/80 ring-1 ring-white/60 shadow-sm">
            <TodayQuestionInline />
          </div>
        </div>

        {/* 구분선 */}
        <div className="shrink-0 self-stretch w-px bg-gradient-to-b from-transparent via-neutral-300/60 to-transparent" />

        {/* ── Right group (데스크탑 우측 버튼들) ───────────────── */}
        <div className="flex items-center gap-1.5 shrink-0 snap-start">
          <PartnerActionButton />
          <SlotSpinButton />
          <DailyFortuneCard />
          <UserMemoEmojiButton />
          <TimeCapsuleButton />
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
      <div className="md:hidden mx-auto w-full max-w-screen-2xl px-3 sm:px-4">
        {/* 1행: 타이틀(좌) + 밸런스/아바타(우) */}
        <div className="flex items-center justify-between py-2 gap-3">
          <div className="min-w-0 flex-1">
            <TitleCluster routeTitle={routeTitle} />
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <CoupleBalanceCard showDelta dense />
            <AvatarWidget />
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

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-white/55 backdrop-blur-md supports-[backdrop-filter]:bg-white/45",
        "pt-[env(safe-area-inset-top)]",
        "overflow-x-hidden",
        "relative",
        "ring-1 ring-neutral-200/70",
        "shadow-[0_6px_24px_-12px_rgba(0,0,0,0.15)]",
        "rounded-b-2xl",
        className
      )}
    >
      {/* Top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-300/60 to-transparent" />

      {/* ✅ 모바일 전용 */}
      <MobileRows routeTitle={routeTitle} />

      {/* ✅ 데스크톱 전용 상단 그리드 */}
      <div className="hidden md:block mx-auto w-full max-w-screen-2xl px-3 sm:px-4">
        <div
          className={cn(
            "grid items-stretch gap-3 py-2",
            "grid-cols-1",
            "md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(220px,0.7fr)]"
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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px " />
        <div className="mx-auto w-full max-w-screen-2xl py-2 px-3 sm:px-4">
          <div className="flex items-center gap-2 px-0 py-0">
            <div className="flex items-center gap-1.5 pl-1">
              <NoticeCenterFloatingButton />
              <NotificationDropdown />
              <KoreanQuoteButton />
              <WeatherCard />
            </div>
            <div className="h-6 w-px bg-gradient-to-b from-transparent via-neutral-300/60 to-transparent" />
            {/* Question pill만 흰색 배경 */}
            <div className="min-w-0 flex-1">
              <div className="px-2 py-1 rounded-xl bg-white/80 ring-1 ring-white/60 shadow-sm">
                <TodayQuestionInline />
              </div>
            </div>

            <div className="h-6 w-px bg-gradient-to-b from-transparent via-neutral-300/60 to-transparent" />

            {/* 버튼 3종: 배경/테두리 없음, 간격 동일 */}
            <div className="flex items-center gap-1.5 pl-1">
              <PartnerActionButton />
              <SlotSpinButton />
              <DailyFortuneCard />
              <UserMemoEmojiButton />
              <TimeCapsuleButton />
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
