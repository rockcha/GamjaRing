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
import TodayMessageCard from "../widgets/Cards/TodayMessageCard";

/* shadcn/ui */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeartPulse } from "@fortawesome/free-solid-svg-icons";

/* ───────────────────────── 타입 ───────────────────────── */
type UserMessage = {
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
      <NotificationDropdown iconSize={56} />
      <CoupleBalanceCard showDelta dense />
      <AvatarWidget />
    </div>
  );
});

/* ------------------------------ 모바일: 1행(타이틀/로고 + 밸런스/아바타), 2행(DaysTogether) ------------------------------ */
const MobileRows = memo(function MobileRows({
  routeTitle,
}: {
  routeTitle: string;
}) {
  return (
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
      {/* 2행: DaysTogether 한 줄만 */}
      <div className="pb-2">
        <DaysTogetherBadge />
      </div>
    </div>
  );
});

/* ------------------------------ 내 한마디: 한줄 프리뷰 + 수정 다이얼로그 ------------------------------ */
function SelfTodayOneLiner() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<UserMessage | null>(null);
  const [open, setOpen] = useState(false);

  // 초기 로드
  useEffect(() => {
    let alive = true;
    if (!user?.id) {
      setLoading(false);
      setMsg(null);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_message")
        .select("*")
        .eq("author_id", user.id)
        .maybeSingle<UserMessage>();
      if (!alive) return;
      if (error) console.error("[AppHeader] self message load error:", error);
      setMsg(data ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // Realtime: 저장/수정 → 프리뷰 갱신
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("self_user_message_live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_message",
          filter: `author_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) setMsg(payload.new as UserMessage);
          else if (payload.eventType === "DELETE") setMsg(null);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const emoji = msg?.emoji || "🙂";
  const text = msg?.content || "오늘 한마디를 남겨보세요.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "w-full rounded-xl border border-neutral-200/60 bg-white/70 backdrop-blur px-3 py-2",
            "ring-1 ring-white/60 shadow-sm hover:shadow transition",
            "hover:bg-white"
          )}
          aria-label="내 한마디 작성/수정"
          title="내 한마디 작성/수정"
        >
          <Badge
            variant="outline"
            className="rounded-full px-2 py-0.5 text-base bg-white/90 shrink-0 border-neutral-200/70"
          >
            {emoji}
          </Badge>
          <span className="ml-2 shrink-0 text-[13px] font-semibold text-purple-800/90">
            나의 한마디
          </span>
          <span className="mx-1 shrink-0 text-neutral-300">•</span>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Skeleton className="h-4 w-24 rounded" />
            </span>
          ) : (
            <span className="text-sm text-neutral-700/90 truncate">{text}</span>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>나의 한마디</DialogTitle>
        </DialogHeader>
        <TodayMessageCard maxLen={140} />
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
  useUser();
  useCoupleContext();

  return (
    <header
      className={cn(
        // ✅ 두꺼운 실선 대신: 투명 배경 + 얇은 그라디언트 헤어라인 + 은은한 링 + 둥근 모서리
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

      {/* ✅ 하단 프리뷰 바: 실선 → 부드러운 헤어라인 + 섬세한 분리감 */}
      <div className="hidden md:block relative">
        {/* Top separator of preview bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px " />
        <div className="mx-auto w-full max-w-screen-2xl py-2 px-3 sm:px-4">
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl",
              " backdrop-blur",
              "ring-1 ring-white/60 shadow-sm"
            )}
          >
            <div className="min-w-0 flex-1 px-2 py-1">
              <TodayQuestionInline />
            </div>
            {/* vertical hairline */}
            <div className="h-6 w-px bg-gradient-to-b from-transparent via-neutral-300/60 to-transparent" />
            <div className="min-w-0 flex-1 px-2 py-1">
              <SelfTodayOneLiner />
            </div>
          </div>
        </div>
        {/* Bottom hairline of preview bar */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-neutral-300/50 to-transparent" />
      </div>

      {/* Bottom hairline of header */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-neutral-300/60 to-transparent" />
    </header>
  );
}
