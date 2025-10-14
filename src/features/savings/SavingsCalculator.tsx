"use client";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import type { Product } from "./api";

/* 선불형(annuity-due)·일복리 */
function fvAnnuityDue(A: number, n: number, apy: number) {
  const r = apy / 365;
  if (r === 0) return A * n;
  return A * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}
const clampInt = (v: number, min: number, max: number) =>
  Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : min;
const fmtG = (n: number) => `${Math.round(n).toLocaleString()}G`;

type Props = { products: Product[]; className?: string };

export default function SavingsCalculator({ products, className }: Props) {
  const defaultPid = products[0]?.id ?? 0;
  const [selectedPid, setSelectedPid] = useState<number>(defaultPid);
  const selected = useMemo(
    () => products.find((p) => p.id === selectedPid) ?? products[0],
    [products, selectedPid]
  );

  const minDaily = selected?.min_daily_amount ?? 0;
  const maxDays = selected?.term_days ?? 30;
  const apy = (selected?.apy_bps ?? 0) / 10_000;
  const bonusBps = selected?.completion_bonus_bps ?? 0;
  const bonusRate = bonusBps / 10_000;

  const [daily, setDaily] = useState<number>(minDaily || 100);
  const [days, setDays] = useState<number>(maxDays || 30);

  const onChangeProduct = (pid: number) => {
    setSelectedPid(pid);
    const p = products.find((x) => x.id === pid);
    if (p) {
      setDays(clampInt(days, 1, p.term_days));
      setDaily((d) => Math.max(d, p.min_daily_amount));
    }
  };
  const onChangeDaily = (val: string) => {
    const num = Number(val.replace(/[^\d.]/g, ""));
    setDaily(Math.max(minDaily, isNaN(num) ? minDaily : num));
  };
  const onChangeDays = (val: string) => {
    const num = Number(val.replace(/[^\d]/g, ""));
    setDays(clampInt(isNaN(num) ? maxDays : num, 1, maxDays));
  };

  const principal = useMemo(() => daily * days, [daily, days]);
  const fv = useMemo(() => fvAnnuityDue(daily, days, apy), [daily, days, apy]);
  const interest = Math.max(0, fv - principal);
  const completionBonus = Math.max(0, principal * bonusRate); // 원금 기준
  const totalMaturity = fv + completionBonus;

  return (
    <Card className={`min-h-[360px] ${className || ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">적금 계산기</CardTitle>
          <Badge variant="outline" className="gap-1">
            APY(복리) {(selected?.apy_bps ?? 0) / 100}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 md:col-span-1">
            <Label className="text-xs">상품 유형</Label>
            <Select
              value={String(selected?.id ?? "")}
              onValueChange={(v) => onChangeProduct(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="상품 선택" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} · {p.term_days}일 · APY{" "}
                    {(p.apy_bps / 100).toFixed(2)}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">일일 납입(G)</Label>
            <Input
              inputMode="numeric"
              min={minDaily}
              value={daily}
              onChange={(e) => onChangeDaily(e.target.value)}
              onBlur={(e) => onChangeDaily(e.target.value)}
              placeholder={`${minDaily}G 이상`}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              최소 {fmtG(minDaily)} 이상
            </p>
          </div>

          <div>
            <Label className="text-xs">기간(일)</Label>
            <Input
              inputMode="numeric"
              min={1}
              max={maxDays}
              value={days}
              onChange={(e) => onChangeDays(e.target.value)}
              onBlur={(e) => onChangeDays(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              상품 기간: 최대 {maxDays}일
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat title="총 원금" value={fmtG(principal)} />
          <Stat title="예상 이자(일복리)" value={fmtG(interest)} />
          <Stat
            title="완주시 보너스"
            value={fmtG(completionBonus)}
            badge={`${(bonusBps / 100).toFixed(2)}%`}
          />
          <Stat title="만기 예상 합계" value={fmtG(totalMaturity)} strong />
        </div>

        <div className="flex items-start gap-2 text-[11.5px] text-muted-foreground">
          <Info className="mt-[2px] h-3.5 w-3.5" />
          <div className="leading-relaxed">
            계산은 <b>선불형(Annuity-Due)·일복리(APY)</b>를 가정합니다. 보너스는{" "}
            <b>완주 시</b>에만 지급되며, 미완주(<code>is_perfect=false</code>)면
            제외됩니다.
          </div>
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
