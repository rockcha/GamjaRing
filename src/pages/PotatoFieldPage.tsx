// src/app/(whatever)/PotatoFieldPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useCoupleContext } from "@/contexts/CoupleContext";
import PotatoFieldGrid from "@/features/potato_field/PotatoFieldGrid";
import { ensureRow, getPotatoCount } from "@/features/potato_field/utils";
import ProducerSection from "@/features/producer/ProducerSection";
import { cn } from "@/lib/utils";
import PotatoExchange from "@/components/widgets/PotatoExchange";

/* ───────────────────────────── page ───────────────────────────── */

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
    return <EmptyState>커플 연결이 필요해요.</EmptyState>;
  }

  if (!ready) {
    return <EmptyState>감자밭 불러오는 중… 🥔</EmptyState>;
  }

  return (
    <div className="relative w-full px-3 sm:px-4 md:px-6 py-4">
      {/* ▶ PotatoFieldPage 컨테이너 기준 오른쪽 상단 고정 */}
      <div className="absolute right-6 top-3 z-50">
        <div
          className={cn(
            "rounded-lg   bg-white/70 backdrop-blur",
            "shadow-sm hover:shadow-md transition-shadow",
            "px-2.5 py-1.5"
          )}
          role="region"
          aria-label="감자 교환 위젯"
        >
          <div className="flex items-center gap-2">
            <PotatoExchange />
          </div>
        </div>
      </div>

      {/* 레이아웃: 모바일 1컬럼 → md↑ 7:3 */}
      <div className="grid w-full items-start gap-6 md:gap-8 md:grid-cols-10">
        {/* ── 생산시설 ───────────────────────── */}
        <section className="min-w-0 md:col-span-7">
          <SectionHeader
            emoji="🏗️"
            title="생산시설"
            subtitle="재료를 생산하는 우리만의 공간"
          />
          <GradientDivider className="mt-2" />
          <SectionCard className="mt-4">
            <ProducerSection />
          </SectionCard>
        </section>

        {/* ── 감자밭 ─────────────────────────── */}
        <section className="min-w-0 md:col-span-3">
          <SectionHeader
            emoji="🥔"
            title="감자밭"
            subtitle="씨앗을 심고 수확해요"
          />
          <GradientDivider className="mt-2" />
          <SectionCard className="mt-4">
            <PotatoFieldGrid coupleId={coupleId} onCountChange={setCount} />
          </SectionCard>
          {/* ⛔️ 기존 하단 PotatoExchange는 제거 */}
        </section>
      </div>
    </div>
  );
}

/* ───────────────────────────── helpers/ui ───────────────────────────── */

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full py-12 text-center text-slate-600">{children}</div>
  );
}

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
          <span aria-hidden className="text-2xl leading-none">
            {emoji}
          </span>
          <span className="truncate">{title}</span>
        </h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function GradientDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-px w-full bg-gradient-to-r from-amber-200/70 via-transparent to-transparent",
        className
      )}
    />
  );
}

/** 유리톤 섹션 래퍼: 가벼운 그림자 + 링 + 부드러운 전환 */
function SectionCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white/60 backdrop-blur-sm",
        "shadow-sm hover:shadow-md transition-shadow",
        "px-3 sm:px-4 md:px-5 py-3 sm:py-4",
        className
      )}
    >
      {children}
    </div>
  );
}
