import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import SadPotatoGuard from "@/components/SadPotatoGuard";
import type { CoupleSchedule, ScheduleType } from "@/utils/coupleScheduler";

interface Props {
  /** 미리보기로 보여줄 일정 개수 (기본 3) */
  limit?: number;
  className?: string;
}

const TYPE_BADGE: Record<ScheduleType, string> = {
  데이트: "bg-pink-100 border-pink-300 text-pink-800",
  기념일: "bg-amber-100 border-amber-300 text-amber-800",
  "기타 일정": "bg-blue-100 border-blue-300 text-blue-800",
};

function ymdTodayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dday(dateStr: string): number {
  // 'YYYY-MM-DD'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return 0; // 형식이 다르면 0으로 처리(원하면 throw 해도 OK)

  const y = Number(m[1]);
  const mm = Number(m[2]); // 1~12
  const dd = Number(m[3]); // 1~31

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
  const { user, isCoupled } = useUser();
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? user?.partner_id ?? null;

  const [items, setItems] = useState<CoupleSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (!coupleId) return;
    (async () => {
      setLoading(true);
      const today = ymdTodayLocal();
      const { data, error } = await supabase
        .from("couple_scheduler")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("schedule_date", today) // 과거 제외
        .order("schedule_date", { ascending: true })
        .limit(200);

      if (!error && data) setItems(data as CoupleSchedule[]);
      setLoading(false);
    })();
  }, [coupleId]);

  const preview = useMemo(() => items.slice(0, limit), [items, limit]);

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed left-4 bottom-14 z-50 rounded-full bg-[#fdf6ee] border border-amber-700 shadow-lg px-4 py-2 text-sm text-[#3d2b1f] flex items-center gap-2"
        title="일정 미리보기 펼치기"
      >
        <span>⏰</span>
        <span className="font-semibold">일정 미리보기</span>
      </button>
    );
  }

  return (
    <div
      className={[
        "rounded-2xl border-4 border-[#e6d7c6] bg-[#fdf6ee] p-4 sm:p-5 shadow-sm",
        "relative overflow-hidden",
        className,
      ].join(" ")}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div className="pl-2 flex d items-center gap-3">
          <h3 className=" text-lg sm:text-xl font-bold text-[#3d2b1f]">
            ⏰ 일정 미리보기
          </h3>
          {/* ✅ 최소화 버튼 */}
        </div>
      </div>
      <div className="flex gap-6 mb-4">
        <p className="pl-2 text-xm text-amber-800 ">
          다가오는 일정을 확인해보세요
        </p>

        <button
          onClick={() => setMinimized(true)}
          className="text-xs rounded-xl border-2 border-[#e6d7c6]  px-2  hover:bg-amber-200  "
          title="최소화"
          aria-label="최소화"
        >
          접기
        </button>
      </div>

      {/* 리스트 */}
      <div className="mt-3 space-y-2">
        {loading && (
          <>
            <div className="h-8 rounded-xl bg-white/60 animate-pulse" />
            <div className="h-8 rounded-xl bg-white/60 animate-pulse" />
            <div className="h-8 rounded-xl bg-white/60 animate-pulse" />
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
                className="flex items-center justify-between gap-3 rounded-xl bg-white/70 border-2 border-[#e6d7c6] px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate text-[15px] font-semibold text-[#3d2b1f]">
                    {it.title}
                  </span>
                </div>
                <span
                  className={[
                    "shrink-0 px-2 py-0.5 rounded-lg border text-xs font-semibold",
                    TYPE_BADGE[it.type],
                  ].join(" ")}
                >
                  {dLabel}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

/* 사용 예시

// 메인 페이지 배너 영역
<CoupleSchedulePreview limit={4} />

*/
