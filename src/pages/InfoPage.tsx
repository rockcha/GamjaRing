// src/pages/InfoPage.tsx
"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import InstallButton from "@/components/InstallButton";

import {
  MessageSquareHeart,
  Lock,
  CalendarClock,
  Camera,
  Bell,
  Music4,
  Sparkles,
  Sprout,
  Fish,
  Anchor,
  UtensilsCrossed,
  Download,
  Waves,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────
   데이터: 기능 버킷 (놀이 중심) — 사용자가 손본 문구 기반
────────────────────────────────────────────────────────────── */
const FEATURE_BUCKETS = [
  {
    icon: Sprout,
    title: "감자밭",
    desc: "씨앗을 심고 감자를 수확할 수 있어요.",
  },
  {
    icon: Fish,
    title: "아쿠아리움",
    desc: "낚시로 만난 친구들을 관리할 수 있어요.",
  },
  {
    icon: Anchor,
    title: "낚시",
    desc: "재료로 낚시를 할 수 있어요! 전설의 물고기를 노려봐요 ✨",
  },
  {
    icon: UtensilsCrossed,
    title: "요리",
    desc: "열심히 모은 재료로 레시피를 완성해요.",
  },
  {
    icon: MessageSquareHeart,
    title: "오늘의 질문",
    desc: "하루 한 번, 서로를 더 알아가는 질문.",
  },
  {
    icon: Camera,
    title: "사진 한 컷",
    desc: "사진과 메모로 순간을 간단히 남겨요.",
  },
  {
    icon: CalendarClock,
    title: "공유 캘린더",
    desc: "일정·기념일을 함께 관리해요.",
  },
  {
    icon: Music4,
    title: "우리의 음악",
    desc: "링크로 BGM 설정, 바로 재생.",
  },
  {
    icon: Sparkles,
    title: "오늘의 타로",
    desc: "키워드로 하루의 무드 포착.",
  },
  {
    icon: Bell,
    title: "알림 & 콕찌르기",
    desc: "알람을 통해 함께하고 있다는 걸 알려줘요.",
  },
  {
    icon: Lock,
    title: "프라이빗 보관",
    desc: "둘만의 공간에 안전하게 저장.",
  },
  {
    icon: Download,
    title: "웹 설치",
    desc: "앱처럼 빠르게, 홈 화면으로.",
  },
] as const;

export default function InfoPage() {
  return (
    <main className="mx-auto w-full max-w-screen-xl px-5 md:px-8 py-10 md:py-12">
      {/* ===== Hero ===== */}
      <section className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] text-amber-800">
          <Waves className="h-3.5 w-3.5" />
          함께하는 커플들의 놀이터, 감자링
        </div>

        <h1 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight text-[#3d2b1f]">
          감자링에 온 것을 환영합니다.
        </h1>

        {/* 담백 + ‘일상 공유 → 게임적 재미’ 흐름 반영 */}
        <p className="mt-3 text-base md:text-lg text-[#6b533b]">
          질문·사진·일정으로 일상을 나누고,&nbsp; 감자밭·아쿠아리움·요리로
          즐거움까지.
        </p>
        <p className="mt-1 text-sm md:text-base text-[#6b533b]">
          하루의 작은 기록이 모여, 감자와 수조가 자라고 게임처럼 재미도
          더해집니다.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button
            asChild
            className="bg-amber-600 hover:bg-amber-600/90 text-white"
          >
            <a href="/intro">지금 시작하기</a>
          </Button>
          <InstallButton className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50 hover:border-sky-400 transition-colors" />
        </div>
      </section>

      {/* ===== Features (놀이 중심) ===== */}
      <section className="mt-8 md:mt-10">
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_BUCKETS.map(({ icon: Icon, title, desc }) => (
            <Card
              key={title}
              className="bg-white/70 backdrop-blur-sm border border-slate-200/70 shadow-sm hover:shadow-md transition"
            >
              <CardContent className="p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-200">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-semibold text-[#3d2b1f]">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#6b533b]">
                  {desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="max-w-4xl mx-auto text-center mt-10 md:mt-12">
        <h3 className="text-xl md:text-2xl font-bold text-[#5b3d1d]">
          어떻게 시작하나요?
        </h3>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              no: "①",
              title: "커플 연결",
              desc: "닉네임으로 서로 연결해 둘만의 공간을 만들어요.",
            },
            {
              no: "②",
              title: "오늘 한 가지",
              desc: "질문/씨앗/낚시/사진 중 하나만 해도 충분해요.",
            },
            {
              no: "③",
              title: "모으고 성장",
              desc: "감자·골드·어종이 쌓이며 수조와 레벨이 확장돼요.",
            },
            {
              no: "④",
              title: "요리·전시",
              desc: "재료로 레시피를 완성하고, 수조에 친구들을 전시해요.",
            },
          ].map((s) => (
            <Card
              key={s.no}
              className="bg-white/70 backdrop-blur-sm border border-slate-200/70 shadow-sm text-left"
            >
              <CardContent className="p-5">
                <div className="text-2xl">{s.no}</div>
                <p className="mt-1 font-semibold text-[#3d2b1f]">{s.title}</p>
                <p className="mt-1 text-sm text-[#6b533b]">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ===== Contact ===== */}
      <section className="relative max-w-3xl mx-auto mt-12">
        {/* 은은한 배경 글로우 */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-2rem] h-48 w-48 -translate-x-1/2 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="absolute right-[-2rem] bottom-[-2rem] h-40 w-40 rounded-full bg-pink-200/40 blur-3xl" />
        </div>

        <Card className="overflow-hidden border-amber-200/60 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-lg">
          <div className="h-1 w-full bg-gradient-to-r from-amber-300 via-pink-300 to-amber-300" />

          <CardHeader className="text-center">
            <CardTitle className="text-xl md:text-2xl text-[#5b3d1d] flex items-center justify-center gap-2">
              {/* 위치 핀 느낌의 심볼 */}
              <svg
                className="h-5 w-5 text-amber-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 20s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10z" />
              </svg>
              우리에게 편지를 보내주세요
            </CardTitle>
            <CardDescription className="text-[#6b533b]">
              작은 인사도 큰 힘이 돼요. 따뜻한 제안, 버그 제보, 응원 모두
              환영해요.
            </CardDescription>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px]">
              {["문의", "제안", "버그 신고"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[#6b533b]"
                >
                  {t}
                </span>
              ))}
            </div>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-3 pb-6">
            <Button
              asChild
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-600/90 text-white"
            >
              <a href="mailto:ojr5521@naver.com">
                <svg
                  className="mr-2 h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M4 4h16v16H4z" />
                  <path d="m22 6-10 7L2 6" />
                </svg>
                이메일 보내기
              </a>
            </Button>

            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href="tel:01055211476">
                <svg
                  className="mr-2 h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.88.33 1.74.62 2.56a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.52-1.12a2 2 0 0 1 2.11-.45c.82.29 1.68.5 2.56.62A2 2 0 0 1 22 16.92z" />
                </svg>
                010-5521-1476
              </a>
            </Button>

            <p className="mt-2 text-xs text-[#6b533b]">
              보통 하루 이내에 답장 드려요. 주말/공휴일은 조금 늦을 수 있어요 ☺️
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
