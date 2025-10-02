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

import { CalendarDays, ChevronRight, Clock } from "lucide-react";
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

/** 타입별 뱃지 색상 (shadcn Badge에 className으로 입힘) */
const TYPE_BADGE: Record<ScheduleType, string> = {
  데이트: "bg-pink-100 text-rose-900",
  기념일: "bg-amber-100 text-amber-900",
  "기타 일정": "bg-blue-100 text-blue-900",
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
      <Card className={cn("relative overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-start gap-2 text-xl">
            <FontAwesomeIcon icon={faCalendar} className="mr-2 opacity-80" />
            <CardTitle className="text-[#3d2b1f] text-xl">
              일정 미리보기
            </CardTitle>
          </div>
        </CardHeader>

        <Separator />

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
            <div className="mt-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="size-5 text-muted-foreground" />
                <div className="text-sm text-[#6b533b]">
                  예정된 일정이 없어요. 달력에서 일정을 추가해보세요! ✨
                </div>
              </div>
              <Separator className="my-3" />
              <Link
                to="/scheduler"
                className={cn(
                  "group inline-flex items-center gap-1.5 text-sm font-medium",
                  "text-primary hover:underline"
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
              className="mt-2 pr-1"
            >
              <ul className="w-full">
                {items.map((it, idx) => {
                  const d = dday(it.schedule_date);
                  const dLabel =
                    d === 0 ? "D-Day" : d > 0 ? `D-${d}` : `D+${Math.abs(d)}`;
                  const badgeClass =
                    TYPE_BADGE[it.type] ?? "bg-neutral-100 text-neutral-800";
                  const pretty = prettyKST(it.schedule_date);

                  return (
                    <li key={it.id} className="py-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            to="/scheduler"
                            className={cn(
                              "flex w-full items-center justify-start gap-4 rounded-xl px-1 py-1.5",
                              "hover:bg-muted/50 transition-colors"
                            )}
                            aria-label={`${it.schedule_date} ${it.title}로 이동`}
                          >
                            {/* D-day */}
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 border-0 px-2.5 py-1 text-xs font-semibold",
                                "ring-1 ring-inset ring-black/5 shadow-sm",
                                badgeClass
                              )}
                            >
                              {dLabel}
                            </Badge>

                            {/* 날짜 • 타입 */}
                            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                              <span className="hidden sm:inline">{pretty}</span>
                              <span className="sm:hidden">
                                {it.schedule_date}
                              </span>
                              <span aria-hidden>•</span>
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] leading-none">
                                {it.type}
                              </span>
                            </div>

                            {/* 제목 */}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px] font-semibold text-[#3d2b1f]">
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

                      {idx < items.length - 1 && <Separator className="mt-2" />}
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
