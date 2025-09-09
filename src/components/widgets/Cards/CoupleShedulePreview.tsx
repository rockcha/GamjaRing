// src/features/couple/CoupleSchedulePreview.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

import { Link } from "react-router-dom";

import { useCoupleContext } from "@/contexts/CoupleContext";
import type { CoupleSchedule, ScheduleType } from "@/utils/coupleScheduler";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  /** 더 이상 slice 하지 않음. 하위 호환 위해 받기만 함 */
  limit?: number;
  className?: string;
  /** 목록 영역의 최대 높이(px or CSS 값). 넘치면 세로 스크롤 */
  maxHeight?: number | string;
}

const TYPE_BADGE: Record<ScheduleType, string> = {
  데이트: "bg-pink-100  text-rose-900",
  기념일: "bg-amber-100  text-amber-900",
  "기타 일정": "bg-blue-100  text-blue-900",
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

export default function CoupleSchedulePreview({
  className = "",
  maxHeight = 280, // 👈 기본 최대 높이(넘치면 스크롤)
  limit: _limit, // 하위 호환용(미사용)
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
          .limit(1000); // 👈 사실상 전체

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
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-center">
          <CardTitle className="text-[#3d2b1f] text-lg">
            ⏰ 일정 미리보기
          </CardTitle>
        </div>
      </CardHeader>

      <Separator />

      <CardContent>
        <div className="mt-2">
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-9 rounded-xl" />
              <Skeleton className="h-9 rounded-xl" />
              <Skeleton className="h-9 rounded-xl" />
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="text-sm text-[#6b533b]">
              예정된 일정이 없어요. 달력에서 일정을 추가해보세요! ✨
            </div>
          )}

          {!loading && items.length > 0 && (
            <div
              className={cn(
                "overflow-y-auto pr-1", // 스크롤
                // 살짝 부드러운 스크롤 느낌(선택)
                "[scrollbar-width:thin]"
              )}
              style={{ maxHeight: listMaxHeight }}
            >
              {items.map((it, idx) => {
                const d = dday(it.schedule_date);
                const dLabel = d === 0 ? "D-Day" : `D-${d}`;
                const badgeClass =
                  TYPE_BADGE[it.type] ?? "bg-neutral-100  text-neutral-800";

                return (
                  <div key={it.id} className="py-2">
                    <Link
                      to="/scheduler"
                      className={cn(
                        "flex items-center justify-start  rounded-xl",
                        "  cursor-pointer transition"
                      )}
                      aria-label={`${it.schedule_date} ${it.title}로 이동`}
                    >
                      <div className="flex items-center justify-start gap-4 rounded-xl">
                        <Badge
                          variant="outline"
                          className={cn(
                            "inline-flex items-center gap-1.5 shrink-0 border-0",
                            badgeClass
                          )}
                        >
                          {dLabel}
                        </Badge>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate text-[15px] font-semibold text-[#3d2b1f]">
                            {it.title}
                          </span>
                        </div>
                      </div>
                    </Link>

                    {idx < items.length - 1 && <Separator className="mt-2" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
