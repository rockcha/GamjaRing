// src/components/layouts/AppHeader.tsx
"use client";

import React, { memo } from "react";
import { type LucideIcon } from "lucide-react"; // 타입만 유지 (호환용)
import { cn } from "@/lib/utils";

import WeatherCard from "../widgets/WeatherCard";
import { Separator } from "../ui/separator";

import NotificationDropdown from "../widgets/Notification/NotificationDropdown";

import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import CoupleBalanceCard from "../widgets/Cards/CoupleBalanceCard";
import DaysTogetherBadge from "../DaysTogetherBadge";
import TodayQuestionInline from "../widgets/Cards/TodayQuestionCard";

import { NavItem } from "../widgets/NavIconButton";
import AvatarWidget from "../widgets/AvatarWidget";

/* =========================
   Font Awesome 아이콘 래퍼
========================= */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHandHoldingHeart,
  faHouse,
  faCircleInfo,
  faCircleQuestion,
  faComments,
  faCalendarDays,
  faTractor,
  faBowlFood,
  faSailboat,
  faFish,
  faDiceThree,
  faGamepad,
  faNoteSticky,
  faHourglassHalf,
  faRightLeft,
  faClipboard,
  faGhost,
} from "@fortawesome/free-solid-svg-icons";

// LucideIcon 시그니처처럼 className만 받아 렌더하는 래퍼
const makeFA =
  (iconDef: any) =>
  ({ className }: { className?: string }) =>
    <FontAwesomeIcon icon={iconDef} className={className} />;

// 기존 이름 유지 (타입은 LucideIcon으로 단언해 NavItem과 호환)
const HeartHandshake = makeFA(faHandHoldingHeart) as unknown as LucideIcon;
const Home = makeFA(faHouse) as unknown as LucideIcon;
const Info = makeFA(faCircleInfo) as unknown as LucideIcon;
const MessageCircleQuestionMark = makeFA(
  faCircleQuestion
) as unknown as LucideIcon;
const MessagesSquare = makeFA(faComments) as unknown as LucideIcon;
const CalendarDays = makeFA(faCalendarDays) as unknown as LucideIcon;
const Tractor = makeFA(faTractor) as unknown as LucideIcon;
const CookingPot = makeFA(faBowlFood) as unknown as LucideIcon;
const Waves = makeFA(faSailboat) as unknown as LucideIcon;
const Fish = makeFA(faFish) as unknown as LucideIcon;
const Dice3 = makeFA(faDiceThree) as unknown as LucideIcon;
const Gamepad2 = makeFA(faGamepad) as unknown as LucideIcon;
const Sticker = makeFA(faClipboard) as unknown as LucideIcon;
const Hourglass = makeFA(faHourglassHalf) as unknown as LucideIcon; // 타임캡슐
const ArrowLeftRight = makeFA(faRightLeft) as unknown as LucideIcon;
const Ghost = makeFA(faGhost) as unknown as LucideIcon;

/* ------------------------------ 네비 정의/가드 ------------------------------ */
type SimpleNavDef = {
  id:
    | "home"
    | "info"
    | "questions"
    | "bundle"
    | "scheduler"
    | "timeCapsule"
    | "exchange"
    | "farm"
    | "kitchen"
    | "aquarium"
    | "fishing"
    | "stickerBoard"
    | "oddEven"
    | "miniGame"
    | "gloomy";

  label: string;
  icon: LucideIcon; // NavItem과 타입 호환 유지
};

const NAV_GROUPS: readonly (readonly SimpleNavDef[])[] = [
  [
    { id: "home", label: "메인페이지", icon: Home },
    { id: "info", label: "감자링이란?", icon: Info },
  ],
  [
    { id: "questions", label: "답변하기", icon: MessageCircleQuestionMark },
    { id: "bundle", label: "답변꾸러미", icon: MessagesSquare },
    { id: "scheduler", label: "스케쥴러", icon: CalendarDays },

    { id: "timeCapsule", label: "타임캡슐", icon: Hourglass },
    { id: "gloomy", label: "음침한 방", icon: Ghost }, // ✅ 추가
  ],
  [
    { id: "farm", label: "농장", icon: Tractor },
    { id: "kitchen", label: "조리실", icon: CookingPot },
    { id: "exchange", label: "교환소", icon: ArrowLeftRight },
  ],
  [
    { id: "aquarium", label: "아쿠아리움", icon: Fish },
    { id: "fishing", label: "낚시터", icon: Waves },
  ],
  [
    { id: "stickerBoard", label: "스티커보드", icon: Sticker },
    { id: "oddEven", label: "홀짝게임", icon: Dice3 },
    { id: "miniGame", label: "미니게임", icon: Gamepad2 },
  ],
] as const;

const GUARDS: Record<
  string,
  { requireLogin?: boolean; requireCouple?: boolean }
> = {
  home: {},
  info: {},
  questions: { requireLogin: true, requireCouple: true },
  bundle: { requireLogin: true, requireCouple: true },

  scheduler: { requireLogin: true, requireCouple: true },
  timeCapsule: { requireLogin: true, requireCouple: true },
  gloomy: { requireLogin: true, requireCouple: true }, // ✅ 추가

  farm: { requireLogin: true, requireCouple: true },
  kitchen: { requireLogin: true, requireCouple: true },
  exchange: { requireLogin: true, requireCouple: true },
  aquarium: { requireLogin: true, requireCouple: true },
  fishing: { requireLogin: true, requireCouple: true },

  stickerBoard: { requireLogin: true, requireCouple: true },
  oddEven: { requireLogin: true, requireCouple: true },
  miniGame: { requireLogin: true, requireCouple: true },
};

const FALLBACK_ROUTE: Record<string, string> = {
  home: "/main",
  info: "/info",
  questions: "/questions",
  bundle: "/bundle",
  scheduler: "/scheduler",

  timeCapsule: "/timeCapsule",
  gloomy: "/gloomy",

  farm: "/potatoField",
  kitchen: "/kitchen",
  exchange: "/exchange",
  aquarium: "/aquarium",
  fishing: "/fishing",

  stickerBoard: "/stickerBoard",
  oddEven: "/oddEven",
  miniGame: "/miniGame",
};

/* ------------------------------ 상단 클러스터 ------------------------------ */
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
          우리의 기록이 자라나는 공간,{" "}
          <span className="font-semibold text-amber-600">감자링</span>
        </p>
      </div>
    </div>
  );
});

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

const RightCluster = memo(function RightCluster() {
  return (
    <div className="flex items-center justify-end gap-2">
      {/* <WeatherCard /> */}
      <NotificationDropdown />
      <CoupleBalanceCard showDelta dense />
      <AvatarWidget />
    </div>
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
  const { user } = useUser();
  const uid = user?.id ?? null;
  const coupled = !!user?.couple_id;

  const disabledByState = React.useCallback(
    (id: string) => {
      const g = GUARDS[id] || {};
      if (g.requireLogin && !uid) return true;
      if (g.requireCouple && !coupled) return true;
      return false;
    },
    [uid, coupled]
  );

  const go = React.useCallback(
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
            "grid items-stretch gap-3 py-2",
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

      {/* ✅ 하단: 좌우 반반 레이아웃 */}
      <div className="border-t bg-white/65 backdrop-blur-md supports-[backdrop-filter]:bg-white/55">
        <div className="mx-auto w-full max-w-screen-2xl py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 px-1 items-start">
            {/* : TodayQuestion 카드 */}
            <div className="min-w-0 px-1 ">
              <TodayQuestionInline />
            </div>
            {/* 좌측: 네비 (아이콘 크기만큼 자동 줄바꿈) */}
            <nav aria-label="주 네비게이션" className="min-w-0">
              <div
                className={cn(
                  "grid grid-flow-col auto-cols-max",
                  "gap-x-2 gap-y-1 justify-start content-start"
                )}
              >
                {NAV_GROUPS.map((group, gi) => (
                  <React.Fragment key={gi}>
                    {group.map(({ id, label, icon }) => (
                      <div key={id}>
                        <NavItem
                          icon={icon}
                          label={label}
                          disabled={disabledByState(id)}
                          onClick={() => go(id)}
                        />
                      </div>
                    ))}
                    {gi < NAV_GROUPS.length - 1 && (
                      <Separator
                        orientation="vertical"
                        decorative
                        aria-hidden
                        className="h-8 w-px shrink-0 self-center bg-slate-200"
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
