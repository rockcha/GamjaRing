// src/pages/AnswersPage.tsx
"use client";

import MyAnswersCard from "@/components/MyAnswersCard";
import MyPartnerAnswersCard from "@/components/MyPartnerAnswersCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AnswersPage() {
  return (
    <main className="mx-auto w-full max-w-screen-lg px-4 md:px-6 py-6">
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
