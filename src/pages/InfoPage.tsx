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
import {
  HeartHandshake,
  MessageSquareHeart,
  Lock,
  CalendarClock,
  Camera,
  Bell,
  Mail,
  Phone,
  Music4,
  Sparkles,
  Sprout,
} from "lucide-react";

const FEATURES = [
  {
    icon: HeartHandshake,
    title: "커플 연결",
    desc: "닉네임으로 서로를 연결하면 둘만의 비공개 공간이 열려요.",
  },
  {
    icon: MessageSquareHeart,
    title: "오늘의 질문·답변",
    desc: "매일 다른 질문으로 서로를 더 알아가요. 수정/저장도 간편해요.",
  },
  {
    icon: CalendarClock,
    title: "공유 캘린더 & 기념일",
    desc: "둘의 일정과 기념일을 함께 관리하고 놓치지 않게 챙겨줘요.",
  },
  {
    icon: Camera,
    title: "사진으로 하루 한 컷",
    desc: "사진 한 장, 메모 한 줄로도 충분히 특별한 기록이 됩니다.",
  },
  {
    icon: Music4,
    title: "우리의 음악",
    desc: "유튜브 링크로 ‘우리 노래’를 설정하고 바로 재생해요.",
  },
  {
    icon: Sparkles,
    title: "오늘의 타로",
    desc: "가볍게 보는 운세와 키워드로 하루 분위기를 포착해요.",
  },
  {
    icon: Sprout,
    title: "감자 성장",
    desc: "기록하고 함께할수록 포인트가 쌓이고 감자가 레벨업해요.",
  },
  {
    icon: Bell,
    title: "부드러운 알림 & 콕찌르기",
    desc: "답변/일정/노래 등록 알림과 ‘콕 찌르기’로 다정하게 소통해요.",
  },
  {
    icon: Lock,
    title: "프라이빗 보관",
    desc: "둘만 보는 공간에 안전하게 저장돼요. 나중에 함께 돌아봐요.",
  },
];

export default function InfoPage() {
  return (
    <main className="mx-auto w-full max-w-screen-xl px-5 md:px-8 py-10 md:py-12">
      {/* ===== Hero ===== */}
      <section className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#3d2b1f]">
          둘의 일상을 모아 감자를 키우는, 커플 다이어리
        </h1>
        <p className="mt-3 text-base md:text-lg text-[#6b533b]">
          질문에 답하고 사진을 남기고, 일정과 노래를 함께 채워보세요. 함께한
          만큼 감자가 쑥쑥 자랍니다.
        </p>
      </section>

      {/* ===== Features ===== */}
      <section className="mt-8 md:mt-10">
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="bg-white border-none shadow-sm">
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
      <section className="max-w-4xl mx-auto text-center mt-8 md:mt-10">
        <h3 className="text-xl md:text-2xl font-bold text-[#5b3d1d]">
          어떻게 시작하나요?
        </h3>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              no: "①",
              title: "가입 & 커플 연결",
              desc: "닉네임으로 서로를 연결해 둘만의 공간을 만들어요.",
            },
            {
              no: "②",
              title: "하루를 가볍게 기록",
              desc: "오늘의 질문에 답하고 사진/일정을 함께 관리해요.",
            },
            {
              no: "③",
              title: "감자 키우기",
              desc: "기록이 쌓일수록 포인트가 모이고 감자가 성장해요.",
            },
          ].map((s) => (
            <Card
              key={s.no}
              className="bg-white border-none shadow-sm text-left"
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
          {/* 상단 그라데이션 라인 */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-300 via-pink-300 to-amber-300" />

          <CardHeader className="text-center">
            <CardTitle className="text-xl md:text-2xl text-[#5b3d1d] flex items-center justify-center gap-2">
              {/* 루시드 아이콘 포인트 */}
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

            {/* 태그 칩 */}
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
            {/* 메인 액션: 이메일 */}
            <Button
              asChild
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-600/90 text-white"
            >
              <a href="mailto:ojr5521@naver.com">
                {/* Mail 아이콘 */}
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

            {/* 보조 액션: 전화 */}
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href="tel:01055211476">
                {/* Phone 아이콘 */}
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
