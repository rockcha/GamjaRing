"use client";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Rocket } from "lucide-react";
import type { Product } from "./api";
import DepositWindowBadge from "./DepositWindowBadge";

/* 선불형(annuity-due)·일복리(APY) */
function fvAnnuityDue(A: number, n: number, apy: number) {
  const r = apy / 365;
  if (r === 0) return A * n;
  return A * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}
const fmtG = (n: number) => `${Math.round(n).toLocaleString()}G`;

type Props = {
  p: Product;
  value: string; // 부모에서 관리하는 입력값
  onChange: (v: string) => void;
  onOpen: (p: Product) => void; // 가입 처리
};

export default function ProductCard({ p, value, onChange, onOpen }: Props) {
  const daily = Math.max(Number(value || 0), p.min_daily_amount || 0);
  const days = p.term_days;
  const apy = (p.apy_bps ?? 0) / 10_000;
  const bonusRate = (p.completion_bonus_bps ?? 0) / 10_000;

  const { principal, interest, bonus, total } = useMemo(() => {
    const principal = daily * days;
    const fv = fvAnnuityDue(daily, days, apy);
    const interest = Math.max(0, fv - principal);
    const bonus = Math.max(0, principal * bonusRate); // 완주 시 보너스 (참고값)
    const total = fv + bonus;
    return { principal, interest, bonus, total };
  }, [daily, days, apy, bonusRate]);

  return (
    <Card className="min-h-[260px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Rocket className="h-4 w-4" /> {p.name}
          </CardTitle>
          <Badge variant="outline">
            APY(복리) {(p.apy_bps / 100).toFixed(2)}%
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {p.tagline ?? ""}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span>기간</span>
            <span className="font-medium">{p.term_days}일</span>
          </div>
          <div className="flex items-center justify-between">
            <span>최소/일</span>
            <span className="font-medium">
              {p.min_daily_amount.toLocaleString()}G
            </span>
          </div>
        </div>

        <DepositWindowBadge />

        <Separator />

        <div className="flex items-center gap-2">
          <Input
            inputMode="numeric"
            placeholder={`${p.min_daily_amount}G 이상`}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
          />
          <Button onClick={() => onOpen(p)}>가입하기</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          가입 당일은 D0, 납입은 <b>D1(다음날)</b>부터. 보너스는 <b>완주 시</b>
          에만 지급됩니다.
        </p>

        {/* 시뮬레이션 결과 (입력 즉시 반영) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <Stat title="총 원금" value={fmtG(principal)} />
          <Stat title="예상 이자(일복리)" value={fmtG(interest)} />
          <Stat
            title="완주시 보너스"
            value={fmtG(bonus)}
            badge={`${(p.completion_bonus_bps ?? 0) / 100}%`}
          />
          <Stat title="만기 예상 합계" value={fmtG(total)} strong />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  title,
  value,
  badge,
  strong = false,
}: {
  title: string;
  value: string;
  badge?: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground mb-1">{title}</div>
        {badge ? (
          <Badge variant="secondary" className="h-5 px-2 text-[10px]">
            {badge}
          </Badge>
        ) : null}
      </div>
      <div
        className={`tabular-nums ${
          strong ? "text-lg font-bold" : "text-lg font-semibold"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
