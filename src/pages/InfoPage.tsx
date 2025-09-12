// src/pages/InfoPage.tsx
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Leaf,
  Coins,
  CookingPot,
  Sandwich,
  Trophy,
  HeartHandshake,
} from "lucide-react";

/* ------------------------------------------------------------------
   데이터: 기능/가치 버킷
------------------------------------------------------------------- */
const FEATURE_BUCKETS = [
  { icon: Sprout, title: "감자밭", desc: "씨앗을 심고 감자를 수확해요." },
  { icon: Fish, title: "아쿠아리움", desc: "낚시로 만난 친구들을 전시/관리." },
  { icon: Anchor, title: "낚시", desc: "재료로 낚시! 전설의 어종을 노려봐요." },
  {
    icon: UtensilsCrossed,
    title: "요리",
    desc: "모은 재료로 레시피를 완성해요.",
  },
  {
    icon: MessageSquareHeart,
    title: "오늘의 질문",
    desc: "하루 한 번, 서로를 더 알아가기.",
  },
  { icon: Camera, title: "사진 한 컷", desc: "사진과 메모로 순간을 남겨요." },
  {
    icon: CalendarClock,
    title: "공유 캘린더",
    desc: "일정·기념일을 함께 관리.",
  },
  { icon: Music4, title: "우리의 음악", desc: "링크로 BGM 설정, 바로 재생." },
  { icon: Sparkles, title: "오늘의 타로", desc: "키워드로 하루의 무드 포착." },
  {
    icon: Bell,
    title: "알림 & 콕찌르기",
    desc: "작은 알림으로 서로를 가까이.",
  },
  { icon: Lock, title: "프라이빗 보관", desc: "둘만의 공간에 안전하게 저장." },
  { icon: Download, title: "웹 설치", desc: "홈 화면에 추가해 앱처럼 사용." },
] as const;

/* ------------------------------------------------------------------
   섹션: 리소스 가이드 (획득/사용 정리)
------------------------------------------------------------------- */
const RESOURCE_GUIDE = {
  obtain: [
    {
      title: "골드 얻는 법",
      items: [
        "일일 미션 보상 (질문 답변, 타로 확인)",
        "미니게임 성공 보상",
        "낚시한 어종 판매",
        "완성된 음식 판매",
      ],
      icon: Coins,
    },
    {
      title: "재료 얻는 법",
      items: [
        "감자 교환소에서 감자와 교환",
        "생산 시설 구매 후 정기적으로 획득",
      ],
      icon: Leaf,
    },
    {
      title: "감자 얻는 법",
      items: ["감자밭에 씨앗 심기 → 성장 → 수확"],
      icon: Sprout,
    },
  ],
  usage: [
    {
      title: "골드 사용처",
      items: [
        "아쿠아리움 테마/어항 확장 구매",
        "미니게임 입장비용",
        "생산 시설 구매",
      ],
      icon: Trophy,
    },
    {
      title: "재료 사용처",
      items: ["요리 레시피 제작", "교환소에서 감자/골드와 교환"],
      icon: CookingPot,
    },
    {
      title: "감자 사용처",
      items: ["감자 교환소에서 재료와 교환", "음식 조리"],
      icon: Sandwich,
    },
  ],
};

export default function InfoPage() {
  return (
    <main className="mx-auto w-full max-w-screen-xl px-5 md:px-8 py-4 md:py-12">
      {/* ===== Hero ===== */}
      <section className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#5b3d1d]">
          GamjaRing
        </h1>
        <p className="mt-2 text-sm text-[#6b533b]">
          둘의 일상을 기록하고, 함께 즐기는 커플 라이프 서비스
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <InstallButton className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50 hover:border-amber-400 transition-colors" />
          {/* 다운로드 버튼: 필요에 맞게 href 수정 */}
          <Button
            asChild
            variant="outline"
            className="inline-flex items-center gap-1.5"
          ></Button>
        </div>
      </section>

      {/* ===== What is GamjaRing? (진지함 & 재미) ===== */}
      <section className="mt-10 md:mt-12">
        <h2 className="text-center text-xl md:text-2xl font-bold text-[#5b3d1d]">
          감자링은 어떤 사이트인가요?
        </h2>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* 진지함 */}
          <Card className="bg-white border border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#3d2b1f]">
                <HeartHandshake className="h-5 w-5 text-amber-700" /> 진지함
              </CardTitle>
              <CardDescription className="text-[#6b533b]">
                매일 질문에 답하고 반응을 남겨요. 일정과 기념일을 공유해 둘의
                리듬을 맞춰요.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 text-sm text-[#5f4a36] list-disc pl-5">
                <li>오늘의 질문 · 답변 · 반응</li>
                <li>공유 캘린더로 일정/기념일 관리</li>
                <li>사진과 메모로 하루의 순간 기록</li>
              </ul>
            </CardContent>
          </Card>

          {/* 재미 */}
          <Card className="bg-white border border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#3d2b1f]">
                <Fish className="h-5 w-5 text-sky-700" /> 재미
              </CardTitle>
              <CardDescription className="text-[#6b533b]">
                감자밭과 아쿠아리움을 키우고, 낚시/요리/미니게임으로 ‘감자링
                아일랜드’를 즐겨요.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 text-sm text-[#5f4a36] list-disc pl-5">
                <li>감자 재배 · 수확 · 상점</li>
                <li>낚시와 미니게임으로 어종/재료 수집</li>
                <li>아쿠아리움 전시 · 테마 꾸미기</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ===== Feature list (간단 카드) ===== */}
      <section className="mt-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURE_BUCKETS.map(({ icon: I, title, desc }) => (
            <Card
              key={title}
              className="bg-white border border-slate-200/70 shadow-sm"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-[#3d2b1f]">
                  <I className="h-4 w-4" /> {title}
                </CardTitle>
                <CardDescription className="text-[#6b533b]">
                  {desc}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* ===== Resource guide ===== */}
      <section className="mt-12">
        <h3 className="text-center text-xl md:text-2xl font-bold text-[#5b3d1d]">
          리소스 가이드
        </h3>
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 획득 */}
          <Card className="bg-white border border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#3d2b1f] flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-700" /> 얻는 법
              </CardTitle>
              <CardDescription className="text-[#6b533b]">
                플레이만 해도 쌓여요. 일상 기록과 작은 도전이 보상이 됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4">
              {RESOURCE_GUIDE.obtain.map(({ title, items, icon: I }) => (
                <div key={title} className="text-left">
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[#3d2b1f]">
                    <I className="h-4 w-4" /> {title}
                  </div>
                  <ul className="list-disc pl-5 text-sm text-[#5f4a36] space-y-1">
                    {items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 사용처 */}
          <Card className="bg-white border border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#3d2b1f] flex items-center gap-2">
                <CookingPot className="h-5 w-5 text-sky-700" /> 사용처
              </CardTitle>
              <CardDescription className="text-[#6b533b]">
                모은 자원은 확장과 꾸미기, 교환과 제작에 아낌없이 쓰세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4">
              {RESOURCE_GUIDE.usage.map(({ title, items, icon: I }) => (
                <div key={title} className="text-left">
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[#3d2b1f]">
                    <I className="h-4 w-4" /> {title}
                  </div>
                  <ul className="list-disc pl-5 text-sm text-[#5f4a36] space-y-1">
                    {items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ===== Contact ===== */}
      <section className="max-w-3xl mx-auto mt-12">
        {/* 은은한 배경 글로우 제거됨 */}
        <Card className="overflow-hidden border-amber-200/60 bg-white shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-amber-300 via-pink-300 to-amber-300" />
          <CardHeader className="text-center">
            <CardTitle className="text-xl md:text-2xl text-[#5b3d1d] flex items-center justify-center gap-2">
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
            {/* 이메일 버튼 제거 → 텍스트로 안내 */}
            <p className="text-sm text-[#5f4a36]">
              이메일:{" "}
              <a
                href="mailto:ojr5521@naver.com"
                className="underline underline-offset-2"
              >
                ojr5521@naver.com
              </a>
            </p>

            {/* 전화는 유지 */}
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
