// src/components/AccountCard.tsx
"use client";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Account, Product } from "./api";
import { getProgress, isDepositWindowOpen, isTodayDue } from "./time";

import { useCoupleContext } from "@/contexts/CoupleContext";
import { toast } from "sonner";
import supabase from "@/lib/supabase";

/* ===== 유틸 ===== */
const fmt = (n: number | string) => Math.round(Number(n || 0)).toLocaleString();

/** 내일 09:00(로컬)을 반환. 이미 그 시각을 지났다면 모레 09:00 */
function getTomorrowNine(from = new Date()) {
  const y = from.getFullYear();
  const m = from.getMonth();
  const d = from.getDate();
  const target = new Date(y, m, d + 1, 9, 0, 0, 0);
  return target.getTime() > from.getTime()
    ? target
    : new Date(y, m, d + 2, 9, 0, 0, 0);
}

/** 목표 시각까지 남은 시간 n시간 m분 */
function useCountdownToTomorrowNine() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000); // 30초마다 가볍게 갱신
    return () => clearInterval(id);
  }, []);
  const target = useMemo(() => getTomorrowNine(now), [now]);
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { target, hours, minutes };
}

type Props = {
  acc: Account;
  product: Product;
  onDeposit: () => void;
};

export default function AccountCard({ acc, product, onDeposit }: Props) {
  const { total, done, pct } = getProgress(acc, product);
  const { gold, spendGold } = useCoupleContext();

  const isMatured = acc.status === "matured";
  const isClosed = acc.status === "closed";
  const canDeposit =
    !isMatured &&
    !isClosed &&
    isDepositWindowOpen() &&
    isTodayDue(acc) &&
    acc.paid_days < product.term_days;

  const dailyCost = acc.daily_amount;
  const lacksGold = (gold ?? 0) < dailyCost;

  const ratePctInt = Math.round((product.apy_bps ?? 0) / 100);
  const bonusAmount = Math.max(0, product.completion_bonus_bps ?? 0);

  const principal = (acc.daily_amount ?? 0) * (product.term_days ?? 0);
  const interest = Math.round(principal * ((product.apy_bps ?? 0) / 10000));
  const bonus = acc.is_perfect ? bonusAmount : 0;
  const totalAtMaturity = principal + interest + bonus;

  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const statusBadge = useMemo(() => {
    if (isClosed)
      return (
        <Badge variant="secondary" className="text-xs">
          closed
        </Badge>
      );
    if (isMatured)
      return (
        <Badge variant="outline" className="text-xs">
          matured
        </Badge>
      );
    if (acc.status === "active" && !acc.is_perfect) {
      return (
        <Badge variant="destructive" className="text-xs">
          완료 보너스 제외
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
  }, [acc.status, acc.is_perfect, isMatured, isClosed]);

  // ⏱ active일 때만: 내일 09:00까지 남은 시간
  const { hours, minutes } = useCountdownToTomorrowNine();
  const showCountdown = acc.status === "active" && !isMatured && !isClosed;

  // 🧾 납입
  const handleDeposit = async () => {
    if (!canDeposit || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await spendGold(dailyCost);
      if (error) {
        toast.error(
          /골드가 부족/.test(error.message)
            ? "골드가 부족합니다."
            : error.message
        );
        return;
      }
      await Promise.resolve(onDeposit());
      toast.success("납입 완료!");
    } catch (e: any) {
      console.error("[AccountCard] deposit error:", e);
      toast.error(e?.message ?? "납입 처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 💰 만기 지급
  const handleClaim = async () => {
    if (!isMatured || claiming) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("payout_matured_savings", {
        p_account_id: acc.id,
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.credited) {
        const amt = Number(row?.total ?? 0);
        toast.success(`만기 지급 완료! +${fmt(amt)} Gold`);
      } else {
        toast.message("지급 가능한 상태가 아니거나 이미 지급되었습니다.");
      }
    } catch (e: any) {
      console.error("[AccountCard] claim error:", e);
      toast.error(e?.message ?? "만기 지급 처리 중 오류");
    } finally {
      setClaiming(false);
    }
  };

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
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg md:text-xl font-extrabold tracking-tight">
            {product.name}
          </CardTitle>
          {statusBadge}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* 📋 계좌/상품 정보 */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-base">📋</span>
            <h3 className="text-sm font-semibold">적금 정보</h3>
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
              value={`🪙${fmt(acc.daily_amount)}`}
            />
            <InfoTile emoji="📈" title="이율" value={`${ratePctInt}%`} />
            <InfoTile
              emoji="🎁"
              title="완주 보너스"
              value={
                acc.is_perfect ? `🪙${fmt(bonusAmount)}` : `0 (미완주로 제외)`
              }
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
            <Progress
              value={pct}
              className="h-2 [&>div]:transition-[width] [&>div]:duration-300 [&>div]:ease-in-out"
            />
            {(isMatured || isClosed) && (
              <p className="text-[12px] text-emerald-600">
                {isClosed
                  ? "지급 완료된 적금입니다."
                  : "만기 도달! 지금 지급받을 수 있어요."}
              </p>
            )}
          </div>
        </section>

        {/* ⏰ 납입 안내 + 카운트다운(내일 09:00) */}
        {!isMatured && !isClosed && (
          <>
            <section>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-base">⏰</span>
                <h3 className="text-sm font-semibold">납입 안내</h3>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">상태</span>
                <span className="font-medium">
                  {isTodayDue(acc) ? "오늘" : "대기"}
                </span>
              </div>

              {/* ✅ active일 때만 표시 */}
              {acc.status === "active" && (
                <div className="mt-2 rounded-lg border bg-background/70 px-3 py-2 flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">
                    다음 납입 시간까지
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums">
                    {hours}시간 {minutes}분
                  </span>
                </div>
              )}
            </section>

            {/* 💳 결제(골드) 안내 */}
            <div className="rounded-lg border bg-background px-3 py-2 text-[12px] flex items-center justify-between">
              <span className="text-muted-foreground">하루 납입 비용</span>
              <span className="tabular-nums font-semibold">
                🪙{fmt(acc.daily_amount)}
              </span>
            </div>
            <div className="text-[12px] text-muted-foreground text-right -mt-2">
              보유: 🪙<b className="tabular-nums">{fmt(gold ?? 0)}</b>
            </div>
          </>
        )}

        {/* 💵 만기 예상/지급 섹션 */}
        {(isMatured || isClosed) && (
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-base">💵</span>
              <h3 className="text-sm font-semibold">만기 지급</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <InfoTile
                emoji="💼"
                title="원금(총 납입)"
                value={fmt(principal)}
              />
              <InfoTile emoji="📈" title="이자" value={fmt(interest)} />
              <InfoTile emoji="🎁" title=" 보너스" value={fmt(bonus)} />
              <InfoTile
                emoji="✅"
                title="지급액 합계"
                value={fmt(totalAtMaturity)}
              />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button
                className="flex-1"
                onClick={handleClaim}
                disabled={!isMatured || claiming}
              >
                {claiming ? "지급 처리 중..." : "만기 지급받기"}
              </Button>
              <Badge variant="outline" className="whitespace-nowrap">
                {product.term_days}일
              </Badge>
            </div>
          </section>
        )}

        {/* 액션 */}
        {!isMatured && !isClosed && (
          <div className="pt-2 flex items-center justify-between gap-2">
            <Button
              className="flex-1"
              disabled={!canDeposit || submitting || lacksGold}
              onClick={handleDeposit}
            >
              {!canDeposit
                ? "지금은 납입 불가"
                : lacksGold
                ? "골드 부족"
                : submitting
                ? "처리 중..."
                : "오늘 납입하기"}
            </Button>
          </div>
        )}

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
    <div className="rounded-xl ring-1 ring-border bg-background/60 backdrop-blur-[2px] p-3 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-base">{emoji}</span>
        <span className="text-[12px] font-semibold">{title}</span>
      </div>
      <div className="mt-1 tabular-nums text-base font-bold">{value}</div>
    </div>
  );
}
