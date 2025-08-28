"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Sun,
  Orbit,
  Star,
  Scale,
  Hourglass,
  Moon,
  Zap,
  type LucideIcon,
} from "lucide-react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/contexts/ToastContext";
import ScratchToReveal from "@/components/magicui/scratch-to-reveal";
import {
  generateFortune,
  type Fortune,
  type Grade,
} from "@/features/fortune/generateFortune";

/* ───────── util ───────── */
function todayKST(): string {
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = fmt
    .replace(/\s/g, "")
    .replace(/\./g, "-")
    .slice(0, 10)
    .split("-");
  return `${y}-${m}-${d}`;
}
const lsKey = (userId: string, d: string) => `daily_fortune:${userId}:${d}`;

/* ───────── grade별 테마 색(모달/뱃지/아이콘 색) 리팩토링 ───────── */
const THEME: Record<
  Grade,
  {
    bg: string; // 모달 배경 그라데이션
    ring: string; // 카드 테두리 링
    chip: string; // 칩(뱃지) 배경/보더
    text: string; // 메인 텍스트 색
    icon: string; // 아이콘 색
    soft: string; // 부드러운 텍스트
  }
> = {
  초대박: {
    bg: "from-yellow-50 to-fuchsia-50",
    ring: "ring-yellow-300",
    chip: "bg-yellow-100 border-yellow-300",
    text: "text-yellow-800",
    icon: "text-yellow-500",
    soft: "text-yellow-700/80",
  },
  대박: {
    bg: "from-emerald-50 to-teal-50",
    ring: "ring-emerald-300",
    chip: "bg-emerald-100 border-emerald-300",
    text: "text-emerald-800",
    icon: "text-emerald-500",
    soft: "text-emerald-700/80",
  },
  좋음: {
    bg: "from-sky-50 to-indigo-50",
    ring: "ring-sky-300",
    chip: "bg-sky-100 border-sky-300",
    text: "text-sky-800",
    icon: "text-sky-500",
    soft: "text-sky-700/80",
  },
  보통: {
    bg: "from-slate-50 to-zinc-50",
    ring: "ring-slate-300",
    chip: "bg-slate-100 border-slate-300",
    text: "text-slate-800",
    icon: "text-slate-500",
    soft: "text-slate-700/80",
  },
  주의: {
    bg: "from-amber-50 to-orange-50",
    ring: "ring-amber-300",
    chip: "bg-amber-100 border-amber-300",
    text: "text-amber-800",
    icon: "text-amber-500",
    soft: "text-amber-700/80",
  },
  조심: {
    bg: "from-rose-50 to-pink-50",
    ring: "ring-rose-300",
    chip: "bg-rose-100 border-rose-300",
    text: "text-rose-800",
    icon: "text-rose-500",
    soft: "text-rose-700/80",
  },
  위험: {
    bg: "from-neutral-50 to-blue-50",
    ring: "ring-blue-300",
    chip: "bg-blue-100 border-blue-300",
    text: "text-blue-800",
    icon: "text-blue-500",
    soft: "text-blue-700/80",
  },
};

/* ───────── 등급별 타로 PNG 경로 ─────────
 * ✅ 여기를 네가 준비한 PNG로 바꿔줘.
 */
const TAROT_CARD_SRC: Record<Grade, string> = {
  초대박: "/tarot/ultra.png",
  대박: "/tarot/great.png",
  좋음: "/tarot/good.png",
  보통: "/tarot/normal.png",
  주의: "/tarot/caution.png",
  조심: "/tarot/careful.png",
  위험: "/tarot/danger.png",
};

/* ───────── 등급별 타로 메타(로마숫자/영문/한글) + 아이콘 ───────── */
const TAROT_META: Record<
  Grade,
  { rn: string; en: string; ko: string; code: string } // rn=Roman Numeral, code="XIX THE SUN"
> = {
  초대박: { rn: "XIX", en: "The Sun", ko: "태양", code: "XIX THE SUN" },
  대박: {
    rn: "X",
    en: "Wheel of Fortune",
    ko: "운명의 수레바퀴",
    code: "X WHEEL OF FORTUNE",
  },
  좋음: { rn: "XVII", en: "The Star", ko: "별", code: "XVII THE STAR" },
  보통: { rn: "XI", en: "Justice", ko: "정의", code: "XI JUSTICE" },
  주의: {
    rn: "XII",
    en: "The Hanged Man",
    ko: "매달린 남자",
    code: "XII THE HANGED MAN",
  },
  조심: { rn: "XVIII", en: "The Moon", ko: "달", code: "XVIII THE MOON" },
  위험: { rn: "XVI", en: "The Tower", ko: "탑", code: "XVI THE TOWER" },
};

const ICONS: Record<Grade, LucideIcon> = {
  초대박: Sun,
  대박: Orbit,
  좋음: Star,
  보통: Scale,
  주의: Hourglass,
  조심: Moon,
  위험: Zap,
};

/* ───────── 카드 앞/뒤 렌더러 ───────── */
function TarotBack({ w, h }: { w: number; h: number }) {
  return (
    <div
      className="relative rounded-3xl border bg-gradient-to-br from-purple-100 to-rose-100"
      style={{ width: w, height: h }}
    >
      <div
        className="absolute inset-0 opacity-40 "
        style={{
          backgroundImage:
            "radial-gradient(#ffffff88 1px, transparent 1px), radial-gradient(#ffffff66 1px, transparent 1px)",
          backgroundSize: "12px 12px, 24px 24px",
          backgroundPosition: "0 0, 12px 12px",
        }}
      />
      <div className="absolute inset-3 rounded-2xl border border-white/70 shadow-inner" />
      <div className="absolute inset-6 rounded-xl border border-white/50" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="h-14 w-14 rounded-full bg-white/80 shadow flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-purple-500" />
        </div>
      </div>
    </div>
  );
}

/** 카드 미리보기(확인된 상태) - 등급 아이콘 + 타로 이름 + 등급 칩 + 제목 */
function TarotImageFace({
  grade,
  title,
  w,
  h,
  onClick,
}: {
  grade: Grade;
  title: string;
  w: number;
  h: number;
  onClick?: () => void;
}) {
  const src = TAROT_CARD_SRC[grade];
  const theme = THEME[grade];
  const meta = TAROT_META[grade];
  const Icon = ICONS[grade];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full h-full rounded-3xl overflow-hidden border ring-2 ${theme.ring} transition-[transform,box-shadow] hover:shadow-lg active:scale-[0.99]`}
      style={{ width: w, height: h }}
      aria-label="오늘의 운세 상세 보기"
    >
      <img
        src={src}
        alt={`${grade} 타로카드`}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />

      {/* 상단 바: 아이콘 + 타로 이름 / 우측 등급 칩 */}
      <div className="absolute left-0 right-0 top-0 p-4">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur px-3 py-1 border text-xs">
            <Icon className={`w-4 h-4 ${theme.icon}`} />
            <span className="font-medium">{meta.code}</span>
            <span className="text-neutral-500">· {meta.ko}</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full border ${theme.chip} text-xs`}
          >
            {grade}
          </span>
        </div>
      </div>

      {/* 하단 텍스트: 오늘의 타이틀 */}
      <div className="absolute bottom-3 left-3 right-3">
        <div className="rounded-full bg-black/35 text-white text-[12px] px-3 py-1 backdrop-blur-sm inline-flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-medium">{title}</span>
        </div>
      </div>
    </button>
  );
}

/* ───────── main component ───────── */
export default function DailyFortuneCard() {
  const { user } = useUser();
  const { open: toast } = useToast();
  const userId = user?.id ?? null;
  const d = useMemo(() => todayKST(), []);
  const [loading, setLoading] = useState(true);
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [revealedGrade, setRevealedGrade] = useState<Grade | null>(null); // 스크래치 완료 후 카드 PNG 노출용

  // 반응형 사이즈 (2 : 1.2)
  const hostRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const H = Math.max(200, Math.round((W || 360) * 0.6));

  // 최초 로드: DB → (없으면 캐시 제거) → 캐시 폴백(에러시에만)
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const key = lsKey(userId, d);
      const { data, error } = await supabase
        .from("daily_fortune")
        .select("fortune")
        .eq("user_id", userId)
        .eq("d", d)
        .maybeSingle();

      if (!error) {
        if (data?.fortune) {
          setFortune(data.fortune as Fortune);
          setRevealedGrade((data.fortune as Fortune).grade);
          localStorage.setItem(key, JSON.stringify(data.fortune));
        } else {
          // DB에 없으면 ‘미확인’. 캐시도 제거.
          localStorage.removeItem(key);
          setFortune(null);
          setRevealedGrade(null);
        }
        setLoading(false);
        return;
      }

      // 서버 오류 등일 때만 캐시 폴백
      const cached = localStorage.getItem(key);
      if (cached) {
        const f = JSON.parse(cached) as Fortune;
        setFortune(f);
        setRevealedGrade(f.grade);
      } else {
        setFortune(null);
        setRevealedGrade(null);
      }
      setLoading(false);
    })();
  }, [userId, d]);

  // 스크래치 완료 → 생성/저장 → 카드 PNG 노출 + 모달
  const handleScratchComplete = async () => {
    if (!userId) return;
    const f = generateFortune(`${userId}:${d}`);
    setFortune(f);
    setRevealedGrade(f.grade);
    localStorage.setItem(lsKey(userId, d), JSON.stringify(f));
    const { error } = await supabase.from("daily_fortune").upsert({
      user_id: userId,
      d,
      fortune: f,
    });
    if (error) toast("서버 저장에 실패했지만, 이 브라우저엔 저장됐어요.");
    setModalOpen(true);
  };

  return (
    <Card className="bg-white">
      <CardHeader className="flex items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-rose-500" />
          오늘의 운세
        </CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-[240px] rounded-3xl" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : (
          <div ref={hostRef} className="relative w-full max-w-xl mx-auto">
            {!fortune ? (
              // 1) 미확인: 문구 오버레이가 덮인 스크래치 → 완료 시 카드 PNG + 모달
              <ScratchToReveal
                width={W || 360}
                height={H}
                minScratchPercentage={55}
                eraserRadius={34}
                // ✨ 튀지 않는 중성톤
                gradientColors={["#f5f5f4", "#e5e7eb", "#f5f5f4"]}
                onComplete={handleScratchComplete}
                className="shadow-sm"
                overlay={
                  <div className="text-center px-6">
                    <div className="text-lg font-semibold text-neutral-800">
                      문질러서 운세를 확인하세요!
                    </div>
                  </div>
                }
              >
                {/* 처음엔 카드 뒷면. 완료 후 state가 바뀌면 바로 PNG로 교체되어 보임 */}
                {revealedGrade ? (
                  <img
                    src={TAROT_CARD_SRC[revealedGrade]}
                    alt={`${revealedGrade} 타로카드`}
                    className="w-full h-full object-cover rounded-3xl"
                    loading="lazy"
                  />
                ) : (
                  <TarotBack w={W || 360} h={H} />
                )}
              </ScratchToReveal>
            ) : (
              // 5) 확인된 상태: 등급 타로 PNG + 타로 이름/아이콘 + 제목, 클릭 시 모달
              <TarotImageFace
                grade={fortune.grade}
                title={fortune.title}
                w={W || 300}
                h={H}
                onClick={() => setModalOpen(true)}
              />
            )}
          </div>
        )}
      </CardContent>

      <CardFooter />

      {/* 4) 모달 - 등급별 컬러 테마 + 타로 카드 이름/아이콘 함께 노출 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {fortune ? (
            <div className={`p-5 bg-gradient-to-br ${THEME[fortune.grade].bg}`}>
              <DialogHeader className="px-1">
                <DialogTitle
                  className={`flex items-center gap-2 ${
                    THEME[fortune.grade].text
                  }`}
                >
                  {(() => {
                    const Icon = ICONS[fortune.grade];
                    return (
                      <Icon
                        className={`w-5 h-5 ${THEME[fortune.grade].icon}`}
                      />
                    );
                  })()}
                  오늘의 운세
                  <Badge
                    variant="secondary"
                    className={`text-[11px] ${
                      THEME[fortune.grade].chip
                    } border`}
                  >
                    {fortune.grade}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              {/* 타로 카드 미리보기 + 카드 이름(로마/영문/한글) */}
              <div
                className="mt-3 rounded-2xl overflow-hidden ring-2 bg-white/70 backdrop-blur border"
                style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)" }}
              >
                <img
                  src={TAROT_CARD_SRC[fortune.grade]}
                  alt={`${fortune.grade} 타로카드`}
                  className="w-full h-44 object-cover"
                  loading="lazy"
                />
                <div className="px-3 py-2 flex items-center justify-between">
                  <div
                    className={`inline-flex items-center gap-2 ${
                      THEME[fortune.grade].soft
                    }`}
                  >
                    {(() => {
                      const Icon = ICONS[fortune.grade];
                      return (
                        <Icon
                          className={`w-4 h-4 ${THEME[fortune.grade].icon}`}
                        />
                      );
                    })()}
                    <span className="font-medium">
                      {TAROT_META[fortune.grade].code}
                    </span>
                    <span className="text-neutral-500">
                      · {TAROT_META[fortune.grade].ko}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full border ${
                      THEME[fortune.grade].chip
                    } text-[11px]`}
                  >
                    {fortune.grade}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {/* 오늘의 타이틀 */}
                <div className="flex items-center justify-between">
                  <div
                    className={`text-sm font-semibold ${
                      THEME[fortune.grade].text
                    }`}
                  >
                    {fortune.title}
                  </div>
                </div>
                <p className="text-sm text-neutral-800/80">{fortune.summary}</p>

                {/* 섹션 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border bg-white/85 p-3">
                    <div className="text-xs font-medium text-neutral-700">
                      연애
                    </div>
                    <p className="mt-1 text-neutral-700/80">{fortune.love}</p>
                  </div>
                  <div className="rounded-xl border bg-white/85 p-3">
                    <div className="text-xs font-medium text-neutral-700">
                      일/공부
                    </div>
                    <p className="mt-1 text-neutral-700/80">{fortune.work}</p>
                  </div>
                  <div className="rounded-xl border bg-white/85 p-3">
                    <div className="text-xs font-medium text-neutral-700">
                      건강
                    </div>
                    <p className="mt-1 text-neutral-700/80">{fortune.health}</p>
                  </div>
                </div>

                {/* 라벨들 */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    className={`rounded-full border px-2 py-1 bg-white/85 ${
                      THEME[fortune.grade].text
                    }`}
                  >
                    행운의 색: {fortune.luckyColor}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 bg-white/85 ${
                      THEME[fortune.grade].text
                    }`}
                  >
                    행운의 숫자: {fortune.luckyNumber}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 bg-white/85 ${
                      THEME[fortune.grade].text
                    }`}
                  >
                    행운의 아이템: {fortune.luckyItem}
                  </span>
                </div>

                {/* 키워드 태그 */}
                {!!fortune.keywords?.length && (
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {fortune.keywords.map((k, i) => (
                      <span
                        key={i}
                        className={`text-[11px] px-2 py-1 rounded-full border ${
                          THEME[fortune.grade].chip
                        }`}
                      >
                        #{k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                결과를 불러오는 중…
              </p>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  닫기
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
