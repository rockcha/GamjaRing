import { useEffect, useState } from "react";
import { potatoLevels } from "@/constants/Potatolevels";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

interface CouplePoints {
  level: number;
  point: number;
}

// viewBox(0~100) 기준 상대 단위
const RING_RADIUS = 35;
const RING_STROKE = 8;
const OUTLINE_STROKE = 1.6;
const OUTLINE_RADIUS = RING_RADIUS + RING_STROKE / 2 + OUTLINE_STROKE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function OurPotatoPanel() {
  const { user } = useUser();
  const [data, setData] = useState<CouplePoints | null>(null);
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const fetchCoupleLevel = async () => {
    if (!user?.couple_id) return;

    const { data, error } = await supabase
      .from("couple_points")
      .select("level, point")
      .eq("couple_id", user.couple_id)
      .single();

    if (!error) setData(data);
  };

  useEffect(() => {
    fetchCoupleLevel();
  }, [user?.couple_id]);

  useEffect(() => {
    if (!user?.couple_id) return;

    const channel = supabase
      .channel("realtime-couple-points")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couple_points",
          filter: `couple_id=eq.${user.couple_id}`,
        },
        () => fetchCoupleLevel()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.couple_id]);

  // 진행도 애니메이션 (0~100%)
  useEffect(() => {
    if (!data) return;

    const currentProgress = data.point % 10;
    const target = (currentProgress / 10) * 100;

    let frame: number;
    const animate = () => {
      setAnimatedPercent((prev) => {
        const diff = target - prev;
        const step = diff * 0.08;
        const next = prev + step;

        if (Math.abs(diff) < 0.4) return target;
        frame = requestAnimationFrame(animate);
        return next;
      });
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [data?.point]);

  if (!data) return null;

  const { level, point } = data;
  const info = potatoLevels[level - 1];
  const nextInfo = potatoLevels[level];
  const stages = ["씨감자", "새싹감자", "통통감자", "꿀감자", "감자대장"];
  const currentProgress = point % 10;
  const remain = level < 5 ? 10 - currentProgress : 0;

  return (
    <section
      className="
        w-full h-auto
        bg-[#fbf8f2] rounded-xl shadow-xl
        p-4 md:p-5
        grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6
      "
    >
      {/* LEFT: 우리 감자 (1/3) */}
      <div className="flex items-center justify-center">
        <div className="relative aspect-square w-full max-w-[340px]">
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full rotate-[-90deg] z-10"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient
                id="progressGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#fcd34d" />
              </linearGradient>
            </defs>

            {/* 외곽선 */}
            <circle
              cx="50"
              cy="50"
              r={OUTLINE_RADIUS}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={OUTLINE_STROKE}
            />
            {/* 배경 링 */}
            <circle
              cx="50"
              cy="50"
              r={RING_RADIUS}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={RING_STROKE}
            />
            {/* 진행도 링 */}
            <circle
              cx="50"
              cy="50"
              r={RING_RADIUS}
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth={RING_STROKE}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - animatedPercent / 100)}
              strokeLinecap="round"
            />
          </svg>

          {/* 감자 이미지 */}
          <img
            src={info?.image}
            alt={info?.name}
            className="
              absolute z-20
              top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-[56%] h-[56%] object-contain
            "
          />
        </div>
      </div>

      {/* RIGHT: 2/3 컨텐츠 그리드 */}
      <div className="min-w-0">
        {/* 위쪽: 2칸 가로 배치 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1) 감자 소개 */}
          <div className="rounded-xl border  bg-white p-4">
            <h3 className="text-[clamp(1.05rem,2.3vw,1.3rem)] font-bold text-[#3d2b1f]">
              감자 소개
            </h3>
            <p className="mt-2 leading-relaxed">
              {/* 감자 이름 크게 강조 */}
              <span className="block text-[clamp(1.3rem,3vw,1.8rem)] font-extrabold text-[#b75e20] tracking-tight">
                {info?.name}
              </span>
              <span className="text-[clamp(0.85rem,1.8vw,1rem)] text-[#6b533b]">
                {info?.description
                  ? `— ${info.description}`
                  : " 함께 자라고 있어요."}
              </span>
            </p>

            {/* 다음 단계 안내 */}
            {level < 5 ? (
              <p className="mt-3 text-[clamp(0.85rem,1.8vw,1rem)] text-[#6b533b]">
                다음 단계{" "}
                <span className="text-orange-600 font-semibold">
                  {nextInfo?.name}
                </span>
                까지 <span className="text-orange-600 font-bold">{remain}</span>{" "}
                포인트 남았어요.
              </p>
            ) : (
              <p className="mt-3 text-green-600 font-bold text-[clamp(0.9rem,2vw,1.05rem)]">
                🥔 다 자랐어요!
              </p>
            )}
          </div>

          {/* 2) 어떻게 키우나요? */}
          <div className="rounded-xl border  bg-white p-4">
            <h3 className="text-[clamp(1.05rem,2.3vw,1.3rem)] font-bold text-[#3d2b1f]">
              어떻게 키우나요?
            </h3>
            <ul className="mt-2 space-y-1.5 text-[clamp(0.8rem,1.7vw,0.95rem)] text-[#6b533b] leading-relaxed">
              <li>
                •{" "}
                <span className="font-semibold text-[#3d2b1f]">
                  질문에 답하면
                </span>{" "}
                <span className="text-orange-600 font-bold">+1</span> 포인트
              </li>
              {/* 확장 예정
              <li>• 서로의 답변에 하트: +1</li>
              <li>• 기념일 체크인: +? (추후 확장)</li>
              */}
            </ul>

            {/* 작은 진행 바 (다음 단계까지) */}
            {level < 5 && (
              <div className="mt-4">
                <div className="h-2 w-full bg-amber-100 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-amber-400 transition-all duration-700"
                    style={{ width: `${(currentProgress / 10) * 100}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-[#6b533b]">
                  {currentProgress}/10 진행 중
                </div>
              </div>
            )}
          </div>

          {/* 아래: 진화 단계 (두 칸 전체 폭) */}
          <div className="md:col-span-2">
            <h3 className="text-[clamp(1.05rem,2.3vw,1.3rem)] font-bold text-[#3d2b1f]">
              진화 단계
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-3">
              {stages.map((name, idx) => {
                const step = idx + 1;
                const reached = step <= level;
                const current = step === level;

                return (
                  <div key={name} className="flex items-center gap-1.5">
                    <div
                      className={[
                        "relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border",
                        reached
                          ? "bg-amber-400 text-[#3d2b1f] border-amber-300"
                          : "bg-amber-100 text-[#6b533b] border-amber-300/70",
                        current
                          ? "ring-2 ring-amber-500 shadow-md animate-pulse"
                          : "",
                      ].join(" ")}
                      title={name}
                    >
                      {step}
                      {current && (
                        <span className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500 text-white">
                          현재
                        </span>
                      )}
                    </div>

                    <span
                      className={[
                        "text-[0.9rem]",
                        reached
                          ? "text-[#3d2b1f] font-semibold"
                          : "text-[#6b533b]",
                        current
                          ? "underline decoration-amber-400 underline-offset-4"
                          : "",
                      ].join(" ")}
                    >
                      {name}
                    </span>

                    {/* 단계 연결 라인 */}
                    {step < stages.length && (
                      <div className="hidden xl:block w-8 h-[2px] bg-amber-200 rounded-full mx-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
