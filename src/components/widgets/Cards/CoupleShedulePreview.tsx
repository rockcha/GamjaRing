// src/features/couple/CoupleSchedulePreview.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import type { CoupleSchedule, ScheduleType } from "@/utils/coupleScheduler";

// shadcn/ui (프로젝트 경로에 맞게 조정)
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  limit?: number;
  className?: string;
}

const TYPE_BADGE: Record<ScheduleType, string> = {
  데이트: "bg-pink-100 border border-pink-200 text-pink-900",
  기념일: "bg-amber-100 border border-amber-200 text-amber-900",
  "기타 일정": "bg-blue-100 border border-blue-200 text-blue-900",
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
  limit = 3,
  className = "",
}: Props) {
  const { user } = useUser();
  const { couple } = useCoupleContext();

  // ✅ couple.id 우선, 없으면 user.couple_id 사용 (partner_id 사용 금지)
  const coupleId = couple?.id ?? user?.couple_id ?? null;

  const [items, setItems] = useState<CoupleSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!coupleId) return;
    let canceled = false;

    (async () => {
      setLoading(true);
      try {
        const today = getLocalYmd("Asia/Seoul"); // KST 기준
        const { data, error } = await supabase
          .from("couple_scheduler")
          .select("id, title, type, schedule_date") // 필요한 필드만
          .eq("couple_id", coupleId)
          .gte("schedule_date", today)
          .order("schedule_date", { ascending: true })
          .limit(200);

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

  const preview = useMemo(() => items.slice(0, limit), [items, limit]);

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#3d2b1f] text-xl">
            ⏰ 일정 미리보기
          </CardTitle>
        </div>
        <p className="pl-1 text-sm text-amber-800 mt-1">
          다가오는 일정을 확인해보세요
        </p>
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

          {!loading && preview.length === 0 && (
            <div className="text-sm text-[#6b533b]">
              예정된 일정이 없어요. 달력에서 일정을 추가해보세요! ✨
            </div>
          )}

          {!loading &&
            preview.map((it, idx) => {
              const d = dday(it.schedule_date);
              const dLabel = d === 0 ? "D-Day" : `D-${d}`;
              const badgeClass =
                TYPE_BADGE[it.type] ?? "bg-neutral-100 border text-neutral-800";

              return (
                <div key={it.id} className="py-2">
                  <div className="flex items-center justify-start gap-4 rounded-xl">
                    <Badge
                      variant="outline"
                      className={cn(
                        "inline-flex items-center gap-1.5 shrink-0",
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

                  {/* ✅ 각 아이템 밑에만 1줄 — 마지막은 제외 */}
                  {idx < preview.length - 1 && <Separator className="mt-2" />}
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
