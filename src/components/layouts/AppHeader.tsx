// src/components/layouts/AppHeader.tsx
"use client";

import React, { memo, useCallback } from "react";
import {
  HeartHandshake,
  Home,
  Info,
  Settings,
  MessageSquareText,
  Package,
  CalendarClock,
  Fish,
  Waves,
  Sprout,
  ChefHat,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

import WeatherCard from "../widgets/WeatherCard";
import { Separator } from "../ui/separator";
import DailyFortuneCard from "@/features/fortune/DailyFortuneCard";
import NotificationDropdown from "../widgets/Notification/NotificationDropdown";

import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import CoupleBalanceCard from "../widgets/Cards/CoupleBalanceCard";
import DaysTogetherBadge from "../DaysTogetherBadge";
import { NavIconButton } from "../widgets/NavIconButton";

/* ----------------------------------------------------------------
   1) 네비/가드/라우팅 — 모듈 상단 "상수"로 고정 (참조 동일성 보장)
----------------------------------------------------------------- */
type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const BASIC: readonly NavItem[] = [
  { id: "home", label: "메인페이지", icon: Home },
  { id: "info", label: "감자링이란?", icon: Info },
  { id: "settings", label: "마이페이지", icon: Settings },
] as const;

const DAILY: readonly NavItem[] = [
  { id: "questions", label: "오늘의 질문", icon: MessageSquareText },
  { id: "bundle", label: "답변꾸러미", icon: Package },
  { id: "scheduler", label: "커플 스케쥴러", icon: CalendarClock },
] as const;

const WORLD: readonly NavItem[] = [
  { id: "aquarium", label: "아쿠아리움", icon: Fish },
  { id: "fishing", label: "바다낚시", icon: Waves },
  { id: "potatoField", label: "농장", icon: Sprout },
  { id: "kitchen", label: "조리실", icon: ChefHat },
  { id: "shop", label: "상점", icon: Store },
] as const;

const GUARDS: Record<
  string,
  { requireLogin?: boolean; requireCouple?: boolean }
> = {
  home: {},
  info: {},
  settings: { requireLogin: true },

  questions: { requireLogin: true, requireCouple: true },
  bundle: { requireLogin: true, requireCouple: true },
  scheduler: { requireLogin: true, requireCouple: true },

  aquarium: { requireLogin: true, requireCouple: true },
  fishing: { requireLogin: true, requireCouple: true },
  potatoField: { requireLogin: true, requireCouple: true },
  kitchen: { requireLogin: true, requireCouple: true },
  shop: { requireLogin: true, requireCouple: true },
};

const FALLBACK_ROUTE: Record<string, string> = {
  home: "/main",
  info: "/info",
  settings: "/settings",
  questions: "/questions",
  bundle: "/bundle",
  scheduler: "/scheduler",
  aquarium: "/aquarium",
  fishing: "/fishing",
  potatoField: "/potatoField",
  kitchen: "/kitchen",
  shop: "/shop",
};

/* ----------------------------------------------------------------
   2) 메모 가능한 하위 섹션 컴포넌트들
   - props가 안 바뀌면 render 스킵됨
----------------------------------------------------------------- */

// 좌측: 로고 + 타이틀 + 슬로건 (routeTitle 바뀌면 이 섹션만 리렌더)
const TitleCluster = memo(function TitleCluster({
  routeTitle,
}: {
  routeTitle: string;
}) {
  return (
    <div className="pl-2 flex flex-col md:grid md:grid-rows-[auto_auto]">
      <div className="flex items-center">
        <HeartHandshake className="h-7 w-7 mr-2 shrink-0 text-amber-600" />
        <h1 className="truncate text-2xl font-extrabold tracking-tight">
          {routeTitle}
        </h1>
      </div>
      <div className="min-h-[38px] flex items-center">
        <p className="text-[15px] font-medium text-neutral-700 truncate">
          우리를 잇는 따뜻한 고리,{" "}
          <span className="font-semibold text-amber-600">감자링</span>
        </p>
      </div>
    </div>
  );
});

// 중앙: D+일 배지 (자체 컨텍스트로 갱신됨 / routeTitle 변화와 분리)
const CenterCluster = memo(function CenterCluster() {
  return (
    <div className="relative self-center order-last md:order-none">
      <div className="flex items-center gap-3 md:justify-center overflow-x-auto overscroll-x-contain">
        <DaysTogetherBadge />
        <div className="md:hidden h-px w-3 shrink-0 border-b border-dashed border-slate-200/70" />
      </div>
    </div>
  );
});

// 우측: 알림/타로/날씨/잔액 (props 없이 메모 → routeTitle 변해도 스킵)
const RightCluster = memo(function RightCluster() {
  return (
    <div className="flex items-center justify-end gap-2">
      <NotificationDropdown />
      <Separator
        orientation="vertical"
        className="h-6 my-auto hidden md:block"
      />
      <DailyFortuneCard />
      <Separator
        orientation="vertical"
        className="h-6 my-auto hidden md:block"
      />
      <WeatherCard />
      <Separator
        orientation="vertical"
        className="h-6 my-auto hidden md:block"
      />
      <CoupleBalanceCard showDelta showTooltip dense />
    </div>
  );
});

// 하단 네비의 그룹 (title, items, 콜백 2개만 받음)
const GroupInline = memo(function GroupInline({
  title,
  items,
  disabledByState,
  onGo,
}: {
  title: string;
  items: readonly NavItem[];
  disabledByState: (id: string) => boolean;
  onGo: (id: string) => void;
}) {
  const strongHover = "hover:bg-amber-200 hover:text-amber-900";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold text-amber-800 bg-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap">
        {title}
      </span>
      <div className="flex items-center">
        {items.map((it, idx) => {
          const Dis = disabledByState(it.id);
          const Icon = it.icon;
          return (
            <div key={it.id} className="flex items-center">
              <NavIconButton
                icon={Icon}
                tooltip={it.label}
                disabled={Dis}
                onClick={() => !Dis && onGo(it.id)}
                className={strongHover}
                side="top"
              />
              {idx < items.length - 1 && (
                <Separator
                  orientation="vertical"
                  className="h-6 mx-1 hidden md:block"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

/* ----------------------------------------------------------------
   3) AppHeader (부모) — 하위는 memoized, 콜백은 useCallback으로 안정화
----------------------------------------------------------------- */
export default function AppHeader({
  routeTitle,
  className,
}: {
  routeTitle: string;
  className?: string;
}) {
  const { user } = useUser();
  const uid = user?.id ?? null;
  const coupled = !!user?.couple_id;

  // 가드 체크: uid / coupled 바뀔 때만 새로 생김 (routeTitle 변화와 독립)
  const disabledByState = useCallback(
    (id: string) => {
      const g = GUARDS[id] || {};
      if (g.requireLogin && !uid) return true;
      if (g.requireCouple && !coupled) return true;
      return false;
    },
    [uid, coupled]
  );

  // 라우팅: uid/coupled 바뀔 때만 새로 생김
  const go = useCallback(
    (id: string) => {
      const g = GUARDS[id] || {};
      if (g.requireLogin && !uid) {
        toast.warning("로그인이 필요해요.");
        return;
      }
      if (g.requireCouple && !coupled) {
        toast.warning("커플 연동이 필요해요.");
        return;
      }
      const url = FALLBACK_ROUTE[id] ?? `/${id}`;
      if (typeof window !== "undefined") window.location.assign(url);
    },
    [uid, coupled]
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-white/65 backdrop-blur-md supports-[backdrop-filter]:bg-white/55",
        "pt-[env(safe-area-inset-top)]",
        className
      )}
    >
      {/* 상단 헤더 */}
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4">
        <div
          className={cn(
            "grid items-stretch gap-3 py-3",
            "grid-cols-1",
            "md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(220px,0.7fr)]"
          )}
        >
          <TitleCluster routeTitle={routeTitle} />
          <div className="hidden md:block" />
          <CenterCluster />
          <RightCluster />
        </div>
      </div>

      {/* 하단 네비 */}
      <div className="border-t bg-white/65 backdrop-blur-md supports-[backdrop-filter]:bg-white/55">
        <div className="mx-auto w-full max-w-screen-2xl py-3 px-3 sm:px-4">
          <nav
            role="navigation"
            aria-label="헤더 네비게이션 바"
            className={cn(
              "min-h-12 md:min-h-14 flex items-center gap-4",
              "overflow-x-auto overflow-y-hidden whitespace-nowrap scroll-smooth",
              "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            )}
          >
            <GroupInline
              title="기본"
              items={BASIC}
              disabledByState={disabledByState}
              onGo={go}
            />

            <Separator orientation="vertical" className="h-6 hidden md:block" />

            <GroupInline
              title="우리의 일상"
              items={DAILY}
              disabledByState={disabledByState}
              onGo={go}
            />

            <Separator orientation="vertical" className="h-6 hidden md:block" />

            <GroupInline
              title="감자링의 세상"
              items={WORLD}
              disabledByState={disabledByState}
              onGo={go}
            />
          </nav>
        </div>
      </div>
    </header>
  );
}
