// src/features/couple/CoupleSchedulePreview.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import type { CoupleSchedule, ScheduleType } from "@/utils/coupleScheduler";

/* shadcn/ui */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

import { CalendarDays, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar } from "@fortawesome/free-solid-svg-icons";

interface Props {
  /** 더 이상 slice 하지 않음. 하위 호환 위해 받기만 함 */
  limit?: number;
  className?: string;
  /** 목록 영역의 최대 높이(px or CSS 값). 넘치면 세로 스크롤 */
  maxHeight?: number | string;
}

/** 타입별 뱃지 색상 (shadcn Badge에 className으로 입힘) - 파스텔 톤으로 조정 */
const TYPE_BADGE: Record<ScheduleType, string> = {
  데이트: "bg-pink-50 text-rose-700 ring-rose-200",
  기념일: "bg-amber-50 text-amber-700 ring-amber-200",
  "기타 일정": "bg-sky-50 text-sky-700 ring-sky-200",
};

// KST 기준 YYYY-MM-DD
function getLocalYmd(tz = "Asia/Seoul") {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** D-day 계산 (오늘 0시 기준) */
function dday(dateStr: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return 0;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  const target = new Date(y, mm - 1, dd); // 로컬 기준 00:00
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const diff = target.getTime() - base.getTime();
  return Math.round(diff / 86400000);
}

/** YYYY-MM-DD → M월 D일(요일) 포맷 (KST) */
function prettyKST(dateStr: string, tz = "Asia/Seoul") {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: tz,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(dt);
}

/** 몽글 칩 (D-Day) */
function DChip({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
        "text-[11px] font-bold text-rose-700",
        "bg-rose-50 ring-1 ring-inset ring-rose-200",
        "shadow-[0_1px_0_rgba(0,0,0,0.03)]",
        "animate-[jelly_500ms_ease-in-out]"
      )}
    >
      {label}
    </span>
  );
}

export default function CoupleSchedulePreview({
  className = "",
  maxHeight = 180, // 기본 높이
  limit: _limit, // 하위 호환(미사용)
}: Props) {
  const { user } = useUser();
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? user?.couple_id ?? null;

  const [items, setItems] = useState<CoupleSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!coupleId) return;
    let canceled = false;

    (async () => {
      setLoading(true);
      try {
        const today = getLocalYmd("Asia/Seoul");
        const { data, error } = await supabase
          .from("couple_scheduler")
          .select("id, title, type, schedule_date")
          .eq("couple_id", coupleId)
          .gte("schedule_date", today)
          .order("schedule_date", { ascending: true })
          .limit(1000);

        if (!canceled) {
          if (error) {
            console.error("[couple_scheduler] fetch error:", error.message);
            setItems([]);
          } else {
            setItems((data ?? []) as CoupleSchedule[]);
          }
        }
      } finally {
        !canceled && setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [coupleId]);

  // 스크롤 박스 높이 계산
  const listMaxHeight = useMemo(
    () =>
      typeof maxHeight === "number"
        ? `${Math.max(120, maxHeight)}px`
        : maxHeight,
    [maxHeight]
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Card
        className={cn(
          "relative overflow-hidden rounded-2xl border-0",
          // 파스텔 그라데이션 + 소프트 글로우
          "bg-gradient-to-br from-rose-50 via-amber-50 to-sky-50",
          "shadow-[0_10px_30px_-12px_rgba(0,0,0,0.15)] ",
          className
        )}
      >
        {/* 아주 옅은 패턴/빛 번짐 오버레이 */}
        <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-white/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-white/30 blur-3xl" />

        <CardHeader className="pb-3">
          <div className="relative">
            {/* 리본 캡슐 느낌 배경 */}
            <div className="absolute inset-0 -z-10 mx-[-8px] rounded-xl bg-white/40 backdrop-blur-sm" />
            <div className="flex items-center gap-2 px-1 py-1.5 text-xl ">
              <FontAwesomeIcon className="opacity-70" icon={faCalendar} />
              <CardTitle className="text-[#3d2b1f] tracking-tight">
                일정 미리보기
              </CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* 로딩 상태 */}
          {loading && (
            <div className="mt-3 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-5 flex-1 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* 비어있음 */}
          {!loading && items.length === 0 && (
            <div className="mt-3 rounded-2xl bg-white/70  p-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="size-6 text-rose-400" />
                <div className="text-sm text-[#6b533b]">
                  예정된 일정이 없어요. 달력에서 일정을 추가해보세요! ✨
                </div>
              </div>

              <Link
                to="/scheduler"
                className={cn(
                  "group inline-flex items-center gap-1.5 text-sm font-semibold",
                  "text-rose-600 hover:text-rose-700"
                )}
                aria-label="스케줄러로 이동"
              >
                일정 추가하러 가기
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}

          {/* 목록 */}
          {!loading && items.length > 0 && (
            <ScrollArea
              style={{ maxHeight: listMaxHeight }}
              className="relative mt-2 pr-1"
            >
              {/* 위/아래 페이드 마스크 */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white/70 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white/70 to-transparent" />

              <ul className="w-full">
                {items.map((it, idx) => {
                  const d = dday(it.schedule_date);
                  const dLabel =
                    d === 0 ? "D-Day" : d > 0 ? `D-${d}` : `D+${Math.abs(d)}`;
                  const badgeClass =
                    TYPE_BADGE[it.type] ??
                    "bg-neutral-100 text-neutral-800 ring-neutral-200";
                  const pretty = prettyKST(it.schedule_date);

                  return (
                    <li key={it.id} className="py-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            to="/scheduler"
                            className={cn(
                              "flex w-full items-center justify-start gap-4 rounded-xl px-2.5 py-2",
                              // 젤리 캡슐 스타일
                              "shadow-sm backdrop-blur-[2px] ",
                              "hover:bg-white/80 hover:shadow-[0_6px_20px_-10px_rgba(0,0,0,0.25)]",
                              "transition-all duration-200 hover:-translate-y-[1px] hover:scale-[1.01]"
                            )}
                            aria-label={`${it.schedule_date} ${it.title}로 이동`}
                          >
                            {/* D-day 칩 */}
                            <DChip label={dLabel} />

                            {/* 날짜 • 타입 (스티커 감성) */}
                            <div className="flex shrink-0 items-center gap-2 text-xs text-[#7b6146]">
                              <span className="hidden sm:inline rounded-md bg-white/60 ring-1 ring-black/5 px-2 py-0.5">
                                {pretty}
                              </span>
                              <span className="sm:hidden rounded-md bg-white/60 ring-1 ring-black/5 px-2 py-0.5">
                                {it.schedule_date}
                              </span>
                              <span aria-hidden>•</span>
                              <span
                                className={cn(
                                  "rounded-md px-1.5 py-0.5 text-[11px] leading-none",
                                  "ring-1 ring-inset",
                                  badgeClass
                                )}
                              >
                                {it.type}
                              </span>
                            </div>

                            {/* 제목 */}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px] font-semibold text-[#3d2b1f] leading-[1.15]">
                                {it.title}
                              </p>
                            </div>

                            <ChevronRight
                              className="size-4 text-muted-foreground"
                              aria-hidden
                            />
                          </Link>
                        </TooltipTrigger>

                        <TooltipContent side="top" align="start">
                          <div className="text-xs">
                            <div className="font-medium">{it.title}</div>
                            <div className="text-muted-foreground">
                              {it.schedule_date} • {it.type}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>

        {/* jelly keyframes (컴포넌트 스코프) */}
        <style>{`
          @keyframes jelly {
            0%, 100% { transform: scale(1); }
            30% { transform: scale(1.06, 0.94); }
            60% { transform: scale(0.97, 1.03); }
          }
        `}</style>
      </Card>
    </TooltipProvider>
  );
}
