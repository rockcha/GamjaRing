// src/app/(whatever)/PotatoFieldPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useCoupleContext } from "@/contexts/CoupleContext";
import PotatoFieldGrid from "@/features/potato_field/PotatoFieldGrid";
import { ensureRow, getPotatoCount } from "@/features/potato_field/utils";
import ProducerSection from "@/features/producer/ProducerSection";
import BrowseProducersButton from "@/features/producer/BrowseProducersButton";
import { cn } from "@/lib/utils";

export default function PotatoFieldPage() {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [count, setCount] = useState<number>(0);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    if (!coupleId) return;
    (async () => {
      await ensureRow(coupleId);
      const n = await getPotatoCount(coupleId);
      setCount(n);
      setReady(true);
    })();
  }, [coupleId]);

  if (!coupleId) {
    return (
      <div className="w-full py-10 text-center text-slate-600">
        커플 연결이 필요해요.
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="w-full py-10 text-center text-slate-600">
        감자밭 불러오는 중… 🥔
      </div>
    );
  }

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-3">
      {/* 레이아웃: 좌(시설 7) / 우(감자밭 3) */}
      <div className="grid w-full items-start gap-8 md:grid-cols-10">
        {/* 시설 섹션 */}
        <section className="min-w-0 md:col-span-7">
          <SectionHeader
            emoji="🏗️"
            title="생산시설"
            subtitle="재료를 생산하는 우리만의 공간"
          />
          <GradientDivider className="mt-2" />
          {/* 내용: 배경/테두리 없이 자연스럽게 */}
          <div className="mt-4">
            <ProducerSection />
          </div>
        </section>

        {/* 감자밭 섹션 */}
        <section className="min-w-0 md:col-span-3">
          <SectionHeader
            emoji="🥔"
            title="감자밭"
            subtitle="씨앗을 심고 수확해요"
            right={
              <PotatoChip count={count} className="hidden md:inline-flex" />
            }
          />
          <GradientDivider className="mt-2" />
          <div className="mt-4">
            {/* 모바일에서 감자 수 표시 (헤더 오른쪽 배지가 숨겨지는 경우) */}
            <PotatoChip count={count} className="mb-3 md:hidden" />
            <PotatoFieldGrid coupleId={coupleId} onCountChange={setCount} />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ───────────────────────────── helpers/ui ───────────────────────────── */

function SectionHeader({
  emoji,
  title,
  subtitle,
  right,
  className,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="text-2xl leading-none">{emoji}</span>
          <span className="truncate">{title}</span>
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        )}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function GradientDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-px w-full bg-gradient-to-r from-amber-200/70 via-amber-100/0 to-transparent",
        className
      )}
    />
  );
}

function PotatoChip({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 ring-1",
        "bg-amber-50/80 ring-amber-200/80 text-amber-900",
        className
      )}
    >
      <span className="text-xl leading-none">🥔</span>
      <span className="tabular-nums font-semibold">{count}</span>
    </div>
  );
}
