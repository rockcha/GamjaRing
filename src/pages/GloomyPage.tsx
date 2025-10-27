// src/pages/GloomyPage.tsx
"use client";

import GloomyMessageCard from "@/components/widgets/Cards/GloomyMessageCard";
import GloomyRatingsBoard from "@/components/widgets/Cards/GloomyRatingsBoard";
import GloomyRatingsCompletedBoard from "@/components/widgets/Cards/GloomyRatingsCompletedBoard";
import GloomyAccessGateDb from "@/components/widgets/Cards/GloomyAccessGateDb";

export default function GloomyPage() {
  return (
    <main
      className="min-h-[100dvh] w-full bg-fixed bg-cover bg-center"
      style={{
        backgroundImage: "url('/gloomypageBackground.png')",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8 md:py-10">
        {/* 페이지 헤더 자리 */}

        {/* 메인 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mt-4">
          {/* 왼쪽: 메시지 카드 */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-4">
              <GloomyMessageCard />
            </div>
          </aside>

          {/* 오른쪽: 보드들 */}
          <main className="lg:col-span-7 space-y-6">
            <GloomyRatingsBoard />
            <GloomyRatingsCompletedBoard />
          </main>
        </div>

        <footer className="py-8" />
      </div>
    </main>
  );
}
