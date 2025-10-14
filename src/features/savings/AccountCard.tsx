"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Coins, Clock, TrendingUp, Info } from "lucide-react";
import type { Account, Product } from "./api";
import { getProgress, isDepositWindowOpen, isTodayDue } from "./time";
import DepositWindowBadge from "./DepositWindowBadge";

type Props = {
  acc: Account;
  product: Product;
  onDeposit: () => void;
};

export default function AccountCard({ acc, product, onDeposit }: Props) {
  const { total, done, pct } = getProgress(acc, product);
  const canDeposit =
    isDepositWindowOpen() &&
    isTodayDue(acc) &&
    acc.paid_days < product.term_days;

  const statusBadge = (() => {
    if (acc.status === "active" && !acc.is_perfect) {
      return <Badge variant="destructive">완주 실패(보너스 제외)</Badge>;
    }
    if (acc.status === "active") return <Badge>active</Badge>;
    return <Badge variant="secondary">{acc.status}</Badge>;
  })();

  return (
    <Card className="min-h-[236px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {product.name}
          </CardTitle>
          {statusBadge}
        </div>
        <div className="text-[11px] text-muted-foreground">
          APY(복리) {(product.apy_bps / 100).toFixed(2)}%
          {product.completion_bonus_bps ? (
            <>
              {" "}
              · 완주 보너스 {(product.completion_bonus_bps / 100).toFixed(2)}%
            </>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4" /> 일일 금액
          </div>
          <div className="font-medium">
            {acc.daily_amount.toLocaleString()}G
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>진행률</span>
            <span className="tabular-nums">
              {done}/{total} ({pct}%)
            </span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> 오늘 납입
          </div>
          <div className="font-medium">{isTodayDue(acc) ? "오늘" : "대기"}</div>
        </div>

        <DepositWindowBadge />

        <div className="pt-2 flex items-center justify-between gap-2">
          <Button className="flex-1" disabled={!canDeposit} onClick={onDeposit}>
            {canDeposit ? "오늘 납입하기" : "지금은 납입 불가"}
          </Button>
          <Badge variant="outline" className="whitespace-nowrap">
            {product.term_days}일
          </Badge>
        </div>

        {acc.status === "active" && !acc.is_perfect && (
          <div className="mt-1 text-[11.5px] text-amber-600 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-[2px]" />
            <span>
              한 번 이상 미납되어 보너스는 지급되지 않습니다. 납입은 계속
              가능합니다.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
