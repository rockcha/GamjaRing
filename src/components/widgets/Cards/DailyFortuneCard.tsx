// src/features/fortune/DailyFortuneCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
import { Sparkles } from "lucide-react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/contexts/ToastContext";

/* ──────────────────────────────────────────────────────────
   타입/유틸/데이터/생성기 (한 파일에 통합)
   ────────────────────────────────────────────────────────── */

type Grade = "대박" | "좋음" | "보통" | "주의" | "조심";
type NonEmptyArray<T> = readonly [T, ...T[]];

// ✅ noUncheckedIndexedAccess 환경에서도 OK
function pick<T>(rng: () => number, arr: NonEmptyArray<T>): T {
  const idx = Math.floor(rng() * arr.length) % arr.length;
  const val = arr[idx] ?? arr[0]; // 배열이 비지 않음을 타입/런타임 모두 보장
  return val;
}
// 결정론적 RNG
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededRandom(seedStr: string) {
  const seed = xmur3(seedStr)();
  return mulberry32(seed);
}

const GRADES = [
  "대박",
  "좋음",
  "보통",
  "주의",
  "조심",
] as const satisfies NonEmptyArray<Grade>;

const TITLES: Record<Grade, NonEmptyArray<string>> = {
  대박: [
    "별이 돕는 날",
    "행운의 바람",
    "물 흐르듯 술술",
    "빛나는 타이밍",
    "골든 찬스",
    "기회 포착",
    "오늘은 주인공",
    "운명의 편지",
  ],
  좋음: [
    "기분 좋은 예감",
    "작은 행운",
    "빛나는 하루",
    "잔잔한 상승세",
    "순항 모드",
    "미소가 절로",
    "따뜻한 순간",
    "리듬을 타는 날",
  ],
  보통: [
    "무난무난",
    "잔잔한 호수",
    "평화로운 리듬",
    "꾸준히 한 걸음",
    "평범 속의 안정",
    "익숙한 길",
    "담담하게",
    "루틴 유지",
  ],
  주의: [
    "속도 조절",
    "차분함이 필요",
    "컨디션 조심",
    "딱 한 번 더 확인",
    "돌다리도 두드려",
    "한 템포 쉬어가기",
    "과속 금지",
    "날카로운 모서리 주의",
  ],
  조심: [
    "한 번 더 점검",
    "휴식이 답",
    "서두르지 않기",
    "리스크 회피",
    "마음 가다듬기",
    "무리 금지",
    "컨디션 관리",
    "안전 제일",
  ],
} as const;

const LOVE_MSGS: NonEmptyArray<string> = [
  "작은 스킨십과 진심 한마디가 큰 힘이 됩니다.",
  "상대의 속도를 존중하면 더 가까워져요.",
  "데이트는 짧아도 밀도 있게!",
  "질문을 한 번 더—오해가 풀립니다.",
  "칭찬 세 문장, 분위기 세 배.",
  "서프라이즈보단 예고된 배려가 좋아요.",
  "상대의 ‘오늘’을 먼저 물어주세요.",
  "기억했던 사소한 취향을 꺼내보세요.",
  "답장을 늦게 보냈다면 이유를 간단히.",
  "함께 사진 한 장, 추억 한 장.",
  "약속 시간 5분 일찍 도착하기.",
  "요즘의 고민을 들어주는 날.",
  "관심사 하나를 같이 파보세요.",
  "컨디션 안 좋다면 포옹이 약.",
  "감정 표현은 ‘나-메시지’로 부드럽게.",
  "한 번 웃고, 한 번 이해하고, 한 번 양보하기.",
] as const;

const WORK_MSGS: NonEmptyArray<string> = [
  "우선순위를 세우면 속도가 납니다.",
  "협업에서 칭찬 한 마디가 분위기를 바꿔요.",
  "새로운 아이디어가 떠오르는 날.",
  "디테일 체크가 성과를 좌우합니다.",
  "30분 집중 + 5분 휴식 리듬 추천.",
  "미뤘던 일 하나만 끝내도 시야가 트여요.",
  "작은 성과를 시각화해보세요.",
  "오늘의 실패는 내일의 데이터.",
  "나만의 템플릿을 만들 때입니다.",
  "메일/메신저는 두 타임에 몰아서.",
  "하나를 버려 둘을 얻기.",
  "핵심 질문 3개로 회의 단축.",
  "페이스 유지가 가장 빠른 지름길.",
  "기록은 기억을 이긴다.",
  "점심 산책 10분, 오후 집중력 업.",
  "복잡하면 표로 정리하세요.",
] as const;

const HEALTH_MSGS: NonEmptyArray<string> = [
  "짧은 스트레칭만으로도 컨디션이 회복돼요.",
  "물 많이 마시기! 피로도가 줄어요.",
  "밤에 화면 줄이고 숙면을 챙기세요.",
  "가벼운 산책이 머리를 맑게 합니다.",
  "허리 펴고 3분 호흡.",
  "따뜻한 차 한 잔으로 리셋.",
  "가벼운 근력 10분이 하루를 바꿔요.",
  "당분 대신 과일 한 조각.",
  "늦은 카페인은 내일의 적.",
  "목/어깨 30초 릴리즈.",
  "물 1컵 + 기지개 1회",
  "야식은 마음만… 내일 더 맛있게.",
  "햇볕 5분 쬐기—기분이 달라져요.",
  "앉았다 일어나기 10회.",
  "걸음 수 목표를 낮게라도 채우기.",
  "귀가 후 샤워로 수면 루틴 ON.",
] as const;

const COLORS: NonEmptyArray<string> = [
  "에메랄드",
  "살구",
  "네이비",
  "코랄",
  "올리브",
  "라벤더",
  "아이보리",
  "민트",
  "보르도",
  "라임",
  "하늘",
  "체리",
  "샌드",
  "스틸",
  "버터",
  "청록",
  "라일락",
  "머스타드",
  "차콜",
  "피치",
  "딥그린",
  "플럼",
  "연보라",
  "버건디",
] as const;

const ITEMS: NonEmptyArray<string> = [
  "텀블러",
  "손수건",
  "이어폰",
  "책갈피",
  "스티커",
  "펜",
  "캔들",
  "립밤",
  "노트",
  "키링",
  "헤어밴드",
  "슬리퍼",
  "카드지갑",
  "키보드 키캡",
  "마그넷",
  "디퓨저",
  "손난로",
  "스테인리스 빨대",
  "차 티백",
  "휴대용 거울",
] as const;

type Fortune = {
  title: string;
  summary: string;
  love: string;
  work: string;
  health: string;
  luckyColor: string;
  luckyNumber: number;
  luckyItem: string;
  grade: Grade;
};

function generateFortune(seedKey: string): Fortune {
  const rng = seededRandom(seedKey);
  const grade: Grade = pick(rng, GRADES);

  return {
    title: pick(rng, TITLES[grade]),
    summary:
      grade === "대박"
        ? "기회가 보이면 잡아보세요!"
        : grade === "좋음"
        ? "기분 좋은 흐름, 꾸준히 밀고 가기."
        : grade === "보통"
        ? "안정적인 하루, 리듬 유지가 포인트."
        : grade === "주의"
        ? "한 템포만 늦춰도 더 잘 풀립니다."
        : "무리하지 말고 휴식이 먼저예요.",
    love: pick(rng, LOVE_MSGS),
    work: pick(rng, WORK_MSGS),
    health: pick(rng, HEALTH_MSGS),
    luckyColor: pick(rng, COLORS),
    luckyNumber: Math.floor(rng() * 44) + 1,
    luckyItem: pick(rng, ITEMS),
    grade,
  };
}

/* ──────────────────────────────────────────────────────────
   카드 컴포넌트
   ────────────────────────────────────────────────────────── */

// KST 날짜(YYYY-MM-DD)
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

function lsKey(userId: string, d: string) {
  return `daily_fortune:${userId}:${d}`;
}

export default function DailyFortuneCard() {
  const { user } = useUser();
  const { open: toast } = useToast();
  const userId = user?.id ?? null;
  const d = useMemo(() => todayKST(), []);
  const [loading, setLoading] = useState(true);
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [animating, setAnimating] = useState(false);

  // 초기 로드: DB → 로컬스토리지 → (없으면 미조회 상태)
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("daily_fortune")
        .select("fortune")
        .eq("user_id", userId)
        .eq("d", d)
        .maybeSingle();

      if (!error && data?.fortune) {
        setFortune(data.fortune as Fortune);
        localStorage.setItem(lsKey(userId, d), JSON.stringify(data.fortune));
        setLoading(false);
        return;
      }

      const cached = localStorage.getItem(lsKey(userId, d));
      if (cached) {
        setFortune(JSON.parse(cached));
        setLoading(false);
        return;
      }

      setFortune(null);
      setLoading(false);
    })();
  }, [userId, d]);

  async function handleDraw() {
    if (!userId || fortune) return; // 방어
    setAnimating(true);
    await new Promise((r) => setTimeout(r, 1000)); // 섞는 애니메이션 1s

    const f = generateFortune(`${userId}:${d}`);
    setFortune(f);
    localStorage.setItem(lsKey(userId, d), JSON.stringify(f));

    const { error } = await supabase.from("daily_fortune").upsert({
      user_id: userId,
      d,
      fortune: f,
    });
    if (error) {
      toast("서버 저장에 실패했지만, 이 브라우저엔 저장됐어요.");
    }
    setAnimating(false);
  }

  return (
    <Card className="bg-white">
      <CardHeader className="flex items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-rose-500" />
          오늘의 운세
          {fortune && (
            <Badge variant="secondary" className="text-[11px] ml-2">
              {d} 이미 확인
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-[220px] rounded-2xl" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : fortune ? (
          // 결과 카드
          <div className="grid gap-3">
            <div
              className={[
                "rounded-2xl border p-4",
                fortune.grade === "대박"
                  ? "bg-emerald-50 border-emerald-200"
                  : fortune.grade === "좋음"
                  ? "bg-sky-50 border-sky-200"
                  : fortune.grade === "보통"
                  ? "bg-slate-50 border-slate-200"
                  : fortune.grade === "주의"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-rose-50 border-rose-200",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[#3d2b1f]">
                  {fortune.title}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/70 border">
                  {fortune.grade}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#3d2b1f]/80">
                {fortune.summary}
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl border bg-white/70 p-3">
                  <div className="text-xs font-medium text-[#3d2b1f]">연애</div>
                  <p className="mt-1 text-[#3d2b1f]/80">{fortune.love}</p>
                </div>
                <div className="rounded-xl border bg-white/70 p-3">
                  <div className="text-xs font-medium text-[#3d2b1f]">
                    일/공부
                  </div>
                  <p className="mt-1 text-[#3d2b1f]/80">{fortune.work}</p>
                </div>
                <div className="rounded-xl border bg-white/70 p-3">
                  <div className="text-xs font-medium text-[#3d2b1f]">건강</div>
                  <p className="mt-1 text-[#3d2b1f]/80">{fortune.health}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#3d2b1f]">
                <span className="rounded-full bg-white/80 border px-2 py-1">
                  행운의 색: {fortune.luckyColor}
                </span>
                <span className="rounded-full bg-white/80 border px-2 py-1">
                  행운의 숫자: {fortune.luckyNumber}
                </span>
                <span className="rounded-full bg-white/80 border px-2 py-1">
                  행운의 아이템: {fortune.luckyItem}
                </span>
              </div>
            </div>
          </div>
        ) : (
          // 아직 안 봤을 때: 애니메이션 → 펼치기
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-xl">
              <div className="aspect-[2/1.2] rounded-3xl border overflow-hidden bg-gradient-to-br from-rose-50 to-amber-50 grid place-items-center">
                <AnimatePresence mode="wait">
                  {animating ? (
                    <motion.div
                      key="shuffle"
                      initial={{ opacity: 0, scale: 0.9, rotate: 0 }}
                      animate={{ opacity: 1, scale: 1, rotate: 360 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                      className="h-24 w-24 rounded-full border grid place-items-center shadow-xl"
                    >
                      <span className="relative inline-grid place-items-center h-16 w-16">
                        <span className="absolute inset-0 rounded-full border-4 border-emerald-300 border-t-transparent animate-spin" />
                        <span className="h-4 w-4 rounded-full bg-emerald-500" />
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="cta"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center px-6"
                    >
                      <div className="text-lg font-semibold text-[#3d2b1f]">
                        오늘의 운세를 확인해보세요
                      </div>
                      <p className="text-sm text-[#3d2b1f]/70 mt-1">
                        하루에 한 번만 볼 수 있어요.
                      </p>
                      <Button className="mt-4" onClick={handleDraw}>
                        운세 보기
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter />
    </Card>
  );
}
