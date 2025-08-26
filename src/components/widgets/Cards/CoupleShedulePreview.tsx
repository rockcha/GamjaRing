// src/features/couple/CoupleSchedulePreview.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import type { CoupleSchedule, ScheduleType } from "@/utils/coupleScheduler";

// shadcn/ui
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import { Skeleton } from "../../ui/skeleton";

interface Props {
  limit?: number;
  className?: string;
}

const TYPE_BADGE: Record<ScheduleType, string> = {
  데이트: "bg-pink-100 border border-pink-200 text-pink-900",
  기념일: "bg-amber-100 border border-amber-200 text-amber-900",
  "기타 일정": "bg-blue-100 border border-blue-200 text-blue-900",
};

function dday(dateStr: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return 0;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  const target = new Date(y, mm - 1, dd);
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
  const coupleId = couple?.id ?? user?.partner_id ?? null;

  const [items, setItems] = useState<CoupleSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!coupleId) return;
    (async () => {
      setLoading(true);
      // 필요 시 로컬 YYYY-MM-DD 사용으로 교체 가능
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("couple_scheduler")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("schedule_date", today)
        .order("schedule_date", { ascending: true })
        .limit(200);

      if (!error && data) setItems(data as CoupleSchedule[]);
      setLoading(false);
    })();
  }, [coupleId]);

  const preview = useMemo(() => items.slice(0, limit), [items, limit]);

  return (
    <Card className={["relative overflow-hidden", className].join(" ")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {/* 제목 XL */}
          <CardTitle className="text-[#3d2b1f] text-xl">
            ⏰ 일정 미리보기
          </CardTitle>
          {/* ✅ 최소화/닫기 버튼 제거 */}
        </div>
        <p className="pl-1 text-sm text-amber-800 mt-1">
          다가오는 일정을 확인해보세요
        </p>
      </CardHeader>

      {/* 구분선 */}
      <Separator />

      <CardContent>
        <div className="mt-2 space-y-2">
          {loading && (
            <>
              <Skeleton className="h-9 rounded-xl" />
              <Skeleton className="h-9 rounded-xl" />
              <Skeleton className="h-9 rounded-xl" />
            </>
          )}

          {!loading && preview.length === 0 && (
            <div className="text-sm text-[#6b533b]">
              예정된 일정이 없어요. 달력에서 일정을 추가해보세요! ✨
            </div>
          )}

          {!loading &&
            preview.map((it) => {
              const d = dday(it.schedule_date);
              const dLabel = d === 0 ? "D-Day" : `D-${d}`;
              return (
                <div
                  key={it.id}
                  className="flex items-center justify-start gap-4 rounded-xl py-2"
                >
                  <Badge
                    variant="outline"
                    className={[
                      "inline-flex items-center gap-1.5 shrink-0",
                      TYPE_BADGE[it.type],
                    ].join(" ")}
                  >
                    {dLabel}
                  </Badge>

                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-[15px] font-semibold text-[#3d2b1f]">
                      {it.title}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
