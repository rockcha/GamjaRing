// src/components/layouts/AppHeader.tsx
"use client";

import { HeartHandshake } from "lucide-react";
import DaysTogetherBadge from "../DaysTogetherBadge";

import { cn } from "@/lib/utils";

import CouplePotatoCard from "../widgets/Cards/CouplePotatoCard";
import WeatherCard from "../widgets/WeatherCard";
import PotatoPokeButton from "../widgets/PotatoPokeButton";
import { Separator } from "../ui/separator";

import DailyFortuneCard from "@/features/fortune/DailyFortuneCard";
import NotificationDropdown from "../widgets/Notification/NotificationDropdown";

/* ✅ 추가 */
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
/* ✅ 추가: AuthButton */
import AuthButton from "../widgets/AuthButton";

type HeaderMeta = { url: string; header?: string };
type HeaderMapLike = Record<string, string | HeaderMeta>;

interface AppHeaderProps {
  routeTitle: string;
  onNavigate?: (id: string) => void;
  headerById?: HeaderMapLike;
  className?: string;
}

const DEFAULT_HEADER_BY_ID: HeaderMapLike = {
  home: { url: "/", header: "감자링" },
  info: { url: "/info", header: "감자링이란?" },
  settings: { url: "/settings", header: "마이페이지" },
  notifications: { url: "/notifications", header: "알림페이지" },
  questions: { url: "/questions", header: "오늘의 질문" },
  bundle: { url: "/bundle", header: "답변꾸러미" },
  scheduler: { url: "/scheduler", header: "커플 스케쥴러" },
};

function toLabelMap(m: HeaderMapLike): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(m)) {
    out[k] = typeof v === "string" ? v : v.header ?? k;
  }
  return out;
}

export default function AppHeader({
  routeTitle,
  onNavigate,
  headerById = DEFAULT_HEADER_BY_ID,
  className,
}: AppHeaderProps) {
  const labelMap = toLabelMap(headerById);

  /* ✅ 커플 여부 */
  const { user } = useUser();
  const isCoupled = !!user?.couple_id;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60",
        className
      )}
    >
      {/* ✅ 모바일에서 AuthButton을 우상단에 고정시키기 위해 relative 부여 */}
      <div className="mx-auto px-4 py-3 relative">
        {/* 4섹션 그리드 */}
        <div
          className="
            grid items-stretch gap-3
            grid-cols-1
            md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]
          "
        >
          {/* 섹션 1: 로고 + 감자링 멘트 */}
          <div className="pl-3 flex flex-col md:grid md:grid-rows-[auto_auto] ">
            <div className="flex items-center md:items-start ">
              <HeartHandshake className="h-8 w-8 mr-2 shrink-0" />
              <h1 className="truncate text-2xl md:text-3xl font-extrabold tracking-tight">
                {routeTitle}
              </h1>
              <p className="ml-2 text-sm font-medium text-neutral-700 truncate md:hidden ">
                우리를 잇는 따뜻한 고리,{" "}
                <span className="font-semibold text-amber-600">감자링🥔</span>
              </p>
            </div>
            <div className="hidden md:flex min-h-[42px] items-center ">
              <p className="text-base font-medium text-neutral-700 truncate">
                우리를 잇는 따뜻한 고리,{" "}
                <span className="font-semibold text-amber-600">감자링🥔</span>
              </p>
            </div>
          </div>

          {/* 섹션 2: DaysTogetherBadge (중앙) */}
          <div className="flex items-center justify-center">
            <DaysTogetherBadge />
          </div>

          {/* 섹션 3: 위젯 섹션 (가운데-오른쪽) */}
          <div className="relative self-center">
            {!isCoupled && (
              <button
                type="button"
                aria-label="커플 연결 필요"
                className="absolute inset-0 z-10 cursor-not-allowed bg-transparent"
                onClick={() => toast.warning("커플 연결부터 해주세요")}
              />
            )}
            <div
              className={cn(
                "flex items-center gap-3 md:justify-center",
                !isCoupled && "opacity-60"
              )}
              aria-hidden={!isCoupled}
              tabIndex={isCoupled ? 0 : -1}
            >
              <NotificationDropdown />
              <Separator orientation="vertical" className="h-6 my-auto" />
              <WeatherCard />
              <Separator orientation="vertical" className="h-6 my-auto" />
              <PotatoPokeButton />
              <Separator orientation="vertical" className="h-6 my-auto" />
              <DailyFortuneCard />
              <Separator orientation="vertical" className="h-6 my-auto" />
            </div>
          </div>

          {/* ✅ 섹션 4: AuthButton - 데스크탑에선 4번째 열, 모바일에선 우상단 고정 */}
          <div className="hidden md:flex items-center justify-end">
            <AuthButton />
          </div>
        </div>

        {/* ✅ 모바일 전용: 우상단 고정 버튼 (md부터는 grid 아이템이 대신 표시) */}
        <div className="absolute right-4 top-3 z-10 md:hidden">
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
