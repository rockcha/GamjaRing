// src/theme/timeMoods.ts
import {
  Sunrise,
  Coffee,
  Sun,
  BookOpen,
  Sandwich,
  CloudSun,
  Sunset,
  MoonStar,
  Sparkles,
  BedDouble,
} from "lucide-react";

export type TimeMood = {
  id: string;
  label: string;
  /** [startHour, endHour) 24h 기준, end < start 면 자정 넘어감 */
  range: [number, number];
  /** Tailwind 클래스 (배경/테두리/텍스트 포맷 등) */
  classes: {
    card: string;
    ring: string;
    title: string;
    text: string;
    chip: string;
  };
  Icon: React.ComponentType<{ className?: string }>;
  line: string; // 기본 멘트
  altLines?: string[]; // 선택: 랜덤 멘트들
};

export const TIME_MOODS: TimeMood[] = [
  {
    id: "dawn",
    label: "여명",
    range: [4, 6],
    classes: {
      card: "bg-gradient-to-br from-indigo-50 via-rose-50 to-amber-50",
      ring: "ring-1 ring-indigo-200/50",
      title: "text-indigo-800",
      text: "text-indigo-600",
      chip: "bg-white/70 text-indigo-700 border border-indigo-200",
    },
    Icon: Sunrise,
    line: "새벽 공기엔 새로움이 숨어있죠.",
    altLines: ["조용한 시작이 가장 큰 변화를 데려와요."],
  },
  {
    id: "early-morning",
    label: "이른 아침",
    range: [6, 8],
    classes: {
      card: "bg-gradient-to-br from-lime-50 to-yellow-50",
      ring: "ring-1 ring-yellow-200/60",
      title: "text-yellow-800",
      text: "text-yellow-700",
      chip: "bg-white/70 text-yellow-700 border border-yellow-200",
    },
    Icon: Coffee,
    line: "천천히, 그러나 분명히.",
  },
  {
    id: "morning-sun",
    label: "아침 햇살",
    range: [8, 10],
    classes: {
      card: "bg-gradient-to-br from-sky-50 to-cyan-50",
      ring: "ring-1 ring-sky-200/60",
      title: "text-sky-800",
      text: "text-sky-700",
      chip: "bg-white/70 text-sky-700 border border-sky-200",
    },
    Icon: Sun,
    line: "오늘의 첫 페이지를 넘겨요.",
  },
  {
    id: "late-morning",
    label: "늦은 오전",
    range: [10, 12],
    classes: {
      card: "bg-gradient-to-br from-teal-50 to-emerald-50",
      ring: "ring-1 ring-emerald-200/60",
      title: "text-emerald-800",
      text: "text-emerald-700",
      chip: "bg-white/70 text-emerald-700 border border-emerald-200",
    },
    Icon: BookOpen,
    line: "작은 집중이 큰 차이를 만듭니다.",
  },
  {
    id: "noon",
    label: "정오",
    range: [12, 14],
    classes: {
      card: "bg-gradient-to-br from-amber-50 to-orange-50",
      ring: "ring-1 ring-amber-200/60",
      title: "text-amber-900",
      text: "text-amber-700",
      chip: "bg-white/70 text-amber-800 border border-amber-200",
    },
    Icon: Sandwich,
    line: "잠깐 숨 고르기, 오후를 위해 충전해요.",
  },
  {
    id: "early-afternoon",
    label: "이른 오후",
    range: [14, 16],
    classes: {
      card: "bg-gradient-to-br from-mint-50 to-sky-50",
      ring: "ring-1 ring-cyan-200/60",
      title: "text-cyan-800",
      text: "text-cyan-700",
      chip: "bg-white/70 text-cyan-700 border border-cyan-200",
    },
    Icon: CloudSun,
    line: "루틴에 작은 모험을 더해봐요.",
  },
  {
    id: "golden-hour",
    label: "골든 아워",
    range: [16, 18],
    classes: {
      card: "bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50",
      ring: "ring-1 ring-orange-200/60",
      title: "text-orange-900",
      text: "text-orange-700",
      chip: "bg-white/70 text-orange-800 border border-orange-200",
    },
    Icon: Sun,
    line: "빛이 가장 긴 시간을 만들어줘요.",
  },
  {
    id: "sunset",
    label: "노을",
    range: [18, 20],
    classes: {
      card: "bg-gradient-to-br from-pink-50 via-violet-50 to-indigo-50",
      ring: "ring-1 ring-pink-200/60",
      title: "text-pink-800",
      text: "text-pink-700",
      chip: "bg-white/70 text-pink-700 border border-pink-200",
    },
    Icon: Sunset,
    line: "오늘을 다정하게 마무리해요.",
  },
  {
    id: "evening-blue",
    label: "저녁의 온기",
    range: [20, 23],
    classes: {
      card: "bg-gradient-to-br from-indigo-50 to-blue-50",
      ring: "ring-1 ring-indigo-200/60",
      title: "text-indigo-900",
      text: "text-indigo-700",
      chip: "bg-white/70 text-indigo-700 border border-indigo-200",
    },
    Icon: MoonStar,
    line: "조용한 온기가 머무는 시간.",
  },
  {
    id: "midnight",
    label: "깊은 밤",
    range: [23, 4], // 자정 넘어감
    classes: {
      card: "bg-gradient-to-br from-slate-50 to-zinc-50",
      ring: "ring-1 ring-slate-200/60",
      title: "text-slate-900",
      text: "text-slate-700",
      chip: "bg-white/70 text-slate-700 border border-slate-200",
    },
    Icon: Sparkles,
    line: "세상이 느려지는 사이, 마음은 또렷해져요.",
    altLines: ["밤의 고요는 좋은 아이디어를 데려와요."],
  },
];
