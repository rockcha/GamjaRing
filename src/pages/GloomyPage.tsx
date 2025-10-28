// src/pages/GloomyPage.tsx
"use client";
import { useState } from "react";
import GloomyMessageCard from "@/components/widgets/Cards/GloomyMessageCard";
import GloomyRatingsBoard from "@/components/widgets/Cards/GloomyRatingsBoard";
import GloomyRatingsCompletedBoard from "@/components/widgets/Cards/GloomyRatingsCompletedBoard";
import GloomyAccessGateDbSimple from "@/components/widgets/Cards/GloomyAccessGateDb";

export default function GloomyPage() {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <main
      className="min-h-[100dvh] w-full bg-fixed bg-cover bg-center"
      style={{ backgroundImage: "url('/gloomypageBackground.png')" }}
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8 md:py-10">
        {/* 게이트 */}
        {!unlocked && (
          <div className="mb-6">
            <GloomyAccessGateDbSimple onUnlocked={() => setUnlocked(true)} />
          </div>
        )}

        {/* 통과 후 콘텐츠 */}
        {unlocked && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mt-4">
            <aside className="lg:col-span-5">
              <div className="lg:sticky lg:top-4">
                <GloomyMessageCard />
              </div>
            </aside>

            <section className="lg:col-span-7 space-y-6">
              <GloomyRatingsBoard />
              <GloomyRatingsCompletedBoard />
            </section>
          </div>
        )}
        <footer className="py-8" />
      </div>
    </main>
  );
}
