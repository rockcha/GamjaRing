// src/components/AccountCard.tsx
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Account, Product } from "./api";
import { getProgress, isDepositWindowOpen, isTodayDue } from "./time";
import DepositWindowBadge from "./DepositWindowBadge";

type Props = {
  acc: Account;
  product: Product;
  onDeposit: () => void;
};

const fmt = (n: number) => Math.round(n).toLocaleString();

export default function AccountCard({ acc, product, onDeposit }: Props) {
  const { total, done, pct } = getProgress(acc, product);

  const canDeposit =
    isDepositWindowOpen() &&
    isTodayDue(acc) &&
    acc.paid_days < product.term_days;

  // ✅ ProductCard 규칙과 동일: apy_bps = 퍼센트 표시/계산용 값(2800 → 28%)
  const ratePctInt = Math.round((product.apy_bps ?? 0) / 100); // 정수 % 표기
  // ✅ 보너스는 정액(금액)
  const bonusAmount = Math.max(0, product.completion_bonus_bps ?? 0);

  const statusBadge = (() => {
    if (acc.status === "active" && !acc.is_perfect) {
      return (
        <Badge variant="destructive" className="text-xs">
          완주 실패(보너스 제외)
        </Badge>
      );
    }
    if (acc.status === "active")
      return <Badge className="text-xs">active</Badge>;
    return (
      <Badge variant="secondary" className="text-xs">
        {acc.status}
      </Badge>
    );
  })();

  return (
    <Card
      className="
        min-h-[260px]
        bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50
        dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900/70
        shadow-[0_6px_24px_-12px_rgba(0,0,0,0.08)]
        border-0 ring-1 ring-border
      "
    >
      {/* 헤더 */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          {/* 제목: 아이콘 제거, 강조 */}
          <CardTitle className="text-lg md:text-xl font-extrabold tracking-tight">
            {product.name}
          </CardTitle>
          {statusBadge}
        </div>

        {/* 설명 요약(이모지) */}
        <div className="text-[12px] text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <span>📈 이율 {ratePctInt}%</span>
          <span>🎁 보너스 {fmt(bonusAmount)}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* 📋 계좌/상품 정보 (이모지 타일) */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-base">📋</span>
            <h3 className="text-sm font-semibold">계좌 정보</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoTile
              emoji="⏳"
              title="기간"
              value={`${product.term_days}일`}
            />
            <InfoTile
              emoji="💰"
              title="일일 금액"
              value={`${acc.daily_amount.toLocaleString()}`}
            />
            <InfoTile emoji="📈" title="이율" value={`${ratePctInt}%`} />
            <InfoTile
              emoji="🎁"
              title="완주 보너스"
              value={`${fmt(bonusAmount)}`}
            />
          </div>
        </section>

        {/* 🧮 진행률 */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-base">🧮</span>
            <h3 className="text-sm font-semibold">진행률</h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>진행</span>
              <span className="tabular-nums">
                {done}/{total} ({pct}%)
              </span>
            </div>
            {/* shadcn Progress 내부 bar에 부드러운 width 전환 적용 */}
            <Progress
              value={pct}
              className="h-2 [&>div]:transition-[width] [&>div]:duration-300 [&>div]:ease-in-out"
            />
          </div>
        </section>

        {/* ⏰ 오늘 납입 */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-base">⏰</span>
            <h3 className="text-sm font-semibold">오늘 납입</h3>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">상태</span>
            <span className="font-medium">
              {isTodayDue(acc) ? "오늘" : "대기"}
            </span>
          </div>
        </section>

        {/* 입금 가능 시간 뱃지 */}
        <DepositWindowBadge />

        {/* 액션 */}
        <div className="pt-2 flex items-center justify-between gap-2">
          <Button className="flex-1" disabled={!canDeposit} onClick={onDeposit}>
            {canDeposit ? "오늘 납입하기" : "지금은 납입 불가"}
          </Button>
          <Badge variant="outline" className="whitespace-nowrap">
            {product.term_days}일
          </Badge>
        </div>

        {/* 경고 문구 */}
        {acc.status === "active" && !acc.is_perfect && (
          <p className="mt-1 text-[11.5px] text-amber-600">
            한 번 이상 미납되어 보너스는 지급되지 않습니다. 납입은 계속
            가능합니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ===== Subcomponents ===== */

function InfoTile({
  emoji,
  title,
  value,
}: {
  emoji: string;
  title: string;
  value: string;
}) {
  return (
    <div
      className="
        rounded-xl ring-1 ring-border bg-background/60 backdrop-blur-[2px]
        p-3 shadow-[0_1px_0_rgba(0,0,0,0.02)]
      "
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-base">{emoji}</span>
        <span className="text-[12px] font-semibold">{title}</span>
      </div>
      <div className="mt-1 tabular-nums text-base font-bold">{value}</div>
    </div>
  );
}
