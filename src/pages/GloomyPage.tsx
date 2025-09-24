// src/app/gloomy/GloomyPage.tsx
// 위치는 프로젝트 구조에 맞게 옮겨도 됩니다 (예: src/components/GloomyPage.tsx)

import GloomyMessageCard from "@/components/widgets/Cards/GloomyMessageCard";
import GloomyRatingsBoard from "@/components/widgets/Cards/GloomyRatingsBoard";
import GloomyRatingsCompletedBoard from "@/components/widgets/Cards/GloomyRatingsCompletedBoard";

export default function GloomyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
      {/* 페이지 헤더 */}

      {/* 메인 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mt-4">
        {/* 왼쪽: 메시지 카드 (데스크탑에서 스크롤 고정) */}
        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-4">
            <GloomyMessageCard />
          </div>
        </aside>

        {/* 오른쪽: 보드들 */}
        <main className="lg:col-span-7 space-y-6">
          {/* 평가 중 보드 (둘 다 채워지지 않은 항목) */}
          <GloomyRatingsBoard />

          {/* 완료 랭킹 보드 (둘 다 채워진 항목) */}
          <GloomyRatingsCompletedBoard />
        </main>
      </div>

      <footer className="py-8" />
    </div>
  );
}
