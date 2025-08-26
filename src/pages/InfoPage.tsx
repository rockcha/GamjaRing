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
import { Separator } from "@/components/ui/separator";
import {
  Leaf,
  MessageSquareHeart,
  Lock,
  CalendarClock,
  Camera,
  Bell,
  Mail,
  Phone,
} from "lucide-react";

const FEATURES = [
  {
    icon: Leaf,
    title: "감자 성장",
    desc: "기록할수록 감자가 자라요. 둘의 시간이 눈에 보이는 성취가 됩니다.",
  },
  {
    icon: MessageSquareHeart,
    title: "오늘의 질문",
    desc: "매일 다른 질문으로 서로를 조금씩 더 알게 돼요.",
  },
  {
    icon: Lock,
    title: "프라이빗 보관",
    desc: "둘만 보는 공간에 안전하게 저장돼요. 나중에 함께 돌아봐요.",
  },
  {
    icon: CalendarClock,
    title: "기념일 & 스트릭",
    desc: "이어가는 날들, 다가오는 날들. 우리가 놓치지 않게.",
  },
  {
    icon: Camera,
    title: "한 컷 기록",
    desc: "사진 한 장, 메모 한 줄로도 하루가 충분히 특별해집니다.",
  },
  {
    icon: Bell,
    title: "부드러운 알림",
    desc: "부담 없게, 잊지 않게. 필요한 순간에만 다정하게 알려줘요.",
  },
];

export default function InfoPage() {
  return (
    <main className="mx-auto w-full max-w-screen-xl px-5 md:px-8 py-10 md:py-12">
      {/* ===== Hero(보더/카드 없음) ===== */}
      <section className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#3d2b1f]">
          둘만의 마음을 천천히 모아, 하나의 이야기로
        </h1>
        <p className="mt-3 text-base md:text-lg text-[#6b533b]">
          질문에 답하고 소소한 순간을 기록하면 감자가 자라요. 오늘의 마음을
          남기고, 내일의 우리를 조금 더 기대해보세요.
        </p>
      </section>

      {/* ===== Features ===== */}
      <section className="mt-8 md:mt-10">
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card
              key={title}
              className="bg-white border-amber-200/60 shadow-sm"
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
      <section className="max-w-4xl mx-auto text-center mt-8 md:mt-10">
        <h3 className="text-xl md:text-2xl font-bold text-[#5b3d1d]">
          어떻게 시작하나요?
        </h3>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              no: "①",
              title: "둘이 함께 가입",
              desc: "우리의 공간을 만들어요.",
            },
            {
              no: "②",
              title: "오늘의 질문에 답",
              desc: "솔직한 마음을 가볍게 적어봐요.",
            },
            {
              no: "③",
              title: "감자 키우기",
              desc: "기록이 쌓일수록 감자가 자랍니다.",
            },
          ].map((s) => (
            <Card
              key={s.no}
              className="bg-white border-amber-200/60 shadow-sm text-left"
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
      <section className="max-w-3xl mx-auto mt-12">
        <div className="shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl md:text-2xl text-[#5b3d1d]">
              Contact
            </CardTitle>
            <CardDescription className="text-[#6b533b]">
              필요한 점이 있다면 언제든 연락주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 pb-6">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href="mailto:ojr5521@naver.com">
                <Mail className="mr-2 h-4 w-4" />
                ojr5521@naver.com
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href="tel:01055211476">
                <Phone className="mr-2 h-4 w-4" />
                010-5521-1476
              </a>
            </Button>
          </CardContent>
        </div>
      </section>
    </main>
  );
}
