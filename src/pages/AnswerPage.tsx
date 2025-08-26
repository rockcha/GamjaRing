// src/pages/AnswersPage.tsx
"use client";

import MyAnswersCard from "@/components/MyAnswersCard";
import MyPartnerAnswersCard from "@/components/MyPartnerAnswersCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AnswersPage() {
  return (
    <main className="mx-auto w-full max-w-screen-lg px-4 md:px-6 py-6">
      {/* 제목 + 보충설명 */}
      <header className="flex justify-center items-center mb-4">
        <div className="flex flex-col items-center">
          {" "}
          <h1 className="text-2xl md:text-3xl font-bold text-[#3d2b1f]">
            답변꾸러미
          </h1>
          <p className="mt-1 text-sm md:text-base text-[#6b533b]">
            서로의 답변을 모아 한눈에 볼 수 있어요.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className="bg-white border shadow-sm">
          <CardHeader>
            <CardTitle>나의 답변</CardTitle>
          </CardHeader>
          <CardContent>
            <MyAnswersCard />
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm">
          <CardHeader>
            <CardTitle>연인의 답변</CardTitle>
          </CardHeader>
          <CardContent>
            <MyPartnerAnswersCard />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
