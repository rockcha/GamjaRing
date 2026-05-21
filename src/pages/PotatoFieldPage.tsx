// src/pages/PotatoFieldPage.tsx
"use client";

import { useState } from "react";
import { Leaf, Sprout, Wheat } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoupleContext } from "@/contexts/CoupleContext";
import PotatoFieldGrid from "@/features/potato_field/PotatoFieldGrid";
import ProducerSection from "@/features/producer/ProducerSection";
import { cn } from "@/lib/utils";

export default function PotatoFieldPage() {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;
  const [potatoCount, setPotatoCount] = useState<number | null>(null);

  if (!coupleId) {
    return (
      <main className="min-h-[100dvh] px-4 py-8">
        <Card className="mx-auto max-w-xl border-amber-100 bg-white/95 text-center shadow-sm">
          <CardHeader>
            <CardTitle>커플 연결이 필요해요</CardTitle>
            <CardDescription>
              감자밭은 커플을 연결한 뒤 함께 사용할 수 있어요.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto flex w-full max-w-none flex-col gap-5 px-3 py-5 sm:px-4 md:gap-6 md:py-8 lg:px-6 2xl:px-8">
        <Card className="overflow-hidden border-amber-100/80 bg-white/95 shadow-sm">
          <CardHeader className="gap-4 p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <Badge
                  variant="secondary"
                  className="w-fit gap-1.5 border border-amber-100 bg-amber-50 text-amber-700"
                >
                  <Leaf className="size-3.5" />
                  감자밭
                </Badge>
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-bold tracking-normal md:text-3xl">
                    생산 시설과 감자밭
                  </CardTitle>
                  <CardDescription className="leading-6">
                    재료 생산을 관리하고 감자를 심고 수확하는 공간이에요.
                  </CardDescription>
                </div>
              </div>

              <div className="flex w-fit items-center gap-3 rounded-lg border bg-background/80 px-4 py-3">
                <div className="grid size-10 place-items-center rounded-lg bg-amber-50 text-amber-700">
                  <Wheat className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">보유 감자</p>
                  {potatoCount == null ? (
                    <Skeleton className="mt-1 h-6 w-16" />
                  ) : (
                    <p className="text-2xl font-bold tabular-nums">
                      {potatoCount.toLocaleString("ko-KR")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid w-full items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(500px,620px)] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(560px,700px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(620px,760px)]">
          <FieldPanel
            icon={<Sprout className="size-5" />}
            title="생산 시설"
            description="보유한 생산 시설을 시작하고 완료된 재료를 수거해요."
            className="min-w-0"
          >
            <ProducerSection />
          </FieldPanel>

          <FieldPanel
            icon={<Wheat className="size-5" />}
            title="감자밭"
            description="빈 칸에는 씨앗을 심고, 다 자란 감자는 수확할 수 있어요."
            className="min-w-0"
          >
            <PotatoFieldGrid coupleId={coupleId} onCountChange={setPotatoCount} />
          </FieldPanel>
        </div>
      </div>
    </main>
  );
}

function FieldPanel({
  icon,
  title,
  description,
  className,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("overflow-hidden border-border/80 bg-white shadow-sm", className)}>
      <CardHeader className="space-y-0 p-5 pb-4">
        <div className="flex gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted/50 text-amber-700">
            {icon}
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg tracking-normal">{title}</CardTitle>
            <CardDescription className="leading-5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-5 md:pt-0">{children}</CardContent>
    </Card>
  );
}
