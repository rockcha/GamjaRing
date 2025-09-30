// src/components/layouts/AppHeader.tsx
"use client";

import React, { memo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import supabase from "@/lib/supabase";

import NotificationDropdown from "../widgets/Notification/NotificationDropdown";
import CoupleBalanceCard from "../widgets/Cards/CoupleBalanceCard";
import DaysTogetherBadge from "../DaysTogetherBadge";
import TodayQuestionInline from "../widgets/Cards/TodayQuestionCard";
import AvatarWidget from "../widgets/AvatarWidget";

/* shadcn/ui */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHandHoldingHeart,
  faHeartPulse,
} from "@fortawesome/free-solid-svg-icons";

/* ───────────────────────── 타입 ───────────────────────── */
type PartnerMessage = {
  id: number;
  author_id: string;
  content: string;
  emoji: string;
  created_at: string;
  updated_at: string;
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
        <FontAwesomeIcon
          icon={faHeartPulse}
          className="h-6 w-6 mr-2 shrink-0 text-amber-600"
        />
        <h1 className="truncate text-2xl font-extrabold tracking-tight">
          {routeTitle}
        </h1>
      </div>
      {/* ✅ 모바일에서는 감춰짐 (hidden md:flex) */}
      <div className="min-h-[38px] hidden md:flex items-center">
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
      <div className="flex items-center gap-3 md:justify-center overflow-x-visible">
        <DaysTogetherBadge />
        <div className="md:hidden h-px w-3 shrink-0 border-b border-dashed border-slate-200/70" />
      </div>
    </div>
  );
});

const RightClusterDesktop = memo(function RightClusterDesktop() {
  return (
    <div className="hidden md:flex items-center justify-end gap-2">
      <NotificationDropdown />
      <CoupleBalanceCard showDelta dense />
      <AvatarWidget />
    </div>
  );
});

const RightClusterMobile = memo(function RightClusterMobile() {
  return (
    <div className="md:hidden px-3 pb-2">
      <div className="flex items-center justify-end gap-2">
        <CoupleBalanceCard showDelta dense />
        <div className="-mr-1">
          <NotificationDropdown />
        </div>
        <AvatarWidget />
      </div>
    </div>
  );
});

/* ------------------------------ 연인 한마디: 한줄 프리뷰 ------------------------------ */
function PartnerTodayOneLiner() {
  const { partnerId } = useCoupleContext();
  const [partnerName, setPartnerName] = useState<string>("연인");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<PartnerMessage | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!partnerId) {
        setLoading(false);
        setMsg(null);
        return;
      }
      setLoading(true);

      const { data: nickData } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", partnerId)
        .maybeSingle<{ nickname: string }>();
      if (alive && nickData?.nickname) setPartnerName(nickData.nickname);

      const { data } = await supabase
        .from("user_message")
        .select("*")
        .eq("author_id", partnerId)
        .maybeSingle<PartnerMessage>();

      if (alive) {
        setMsg(data ?? null);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [partnerId]);

  const text = msg?.content ?? "";
  const hasMsg = !!msg;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className={cn(
            "w-full rounded-full border bg-white/70 backdrop-blur px-3 py-2",
            "flex items-center gap-2 hover:bg-white transition"
          )}
          aria-label="연인의 한마디 전체 보기"
          title="연인의 한마디 전체 보기"
        >
          {msg?.emoji ? (
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0.5 text-base bg-white shrink-0"
            >
              {msg.emoji}
            </Badge>
          ) : (
            <span className="text-neutral-400 text-sm shrink-0">🙂</span>
          )}
          <span className="shrink-0 text-[13px] font-semibold text-purple-800">
            {partnerName} 의 한마디
          </span>
          <span className="text-neutral-300 mx-1 shrink-0">•</span>
          <span className="text-sm text-neutral-700 truncate">
            {loading ? "불러오는 중…" : hasMsg ? text : "아직 메시지가 없어요."}
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{partnerName} 의 한마디</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : hasMsg ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500">오늘의 기분:</span>
              <Badge
                variant="outline"
                className="rounded-full px-3 py-1 text-base"
              >
                {msg!.emoji}
              </Badge>
            </div>
            <div className="rounded-xl border bg-white p-4 text-[15px] leading-relaxed whitespace-pre-wrap">
              {msg!.content}
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">메시지가 없어요.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ 헤더 컴포넌트 ------------------------------ */
export default function AppHeader({
  routeTitle,
  className,
}: {
  routeTitle: string;
  className?: string;
}) {
  useUser(); // 우측 영역 사용을 위해 유지

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-white/65 backdrop-blur-md supports-[backdrop-filter]:bg-white/55",
        "pt-[env(safe-area-inset-top)]",
        "overflow-x-hidden",
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
          <RightClusterDesktop />
        </div>
      </div>

      {/* 모바일용 서브 행 */}
      <RightClusterMobile />

      {/* ✅ 하단: 한 줄 프리뷰 바 */}
      <div className="border-t bg-white/65 backdrop-blur-md supports-[backdrop-filter]:bg-white/55">
        <div className="mx-auto w-full max-w-screen-2xl py-2 px-3 sm:px-4">
          <div className="flex items-center gap-2">
            {/* ✅ 오늘의 질문: 모바일에서도 보이도록 변경 (hidden 제거) */}
            <div className="min-w-0 flex-1">
              <TodayQuestionInline />
            </div>
            {/* 연인 한마디 한줄 */}
            <div className="min-w-0 flex-1">
              <PartnerTodayOneLiner />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
