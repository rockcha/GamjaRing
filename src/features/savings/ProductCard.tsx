// src/components/ProductCard.tsx
"use client";
import * as React from "react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Product } from "./api";

const fmt = (n: number) => Math.round(n).toLocaleString();

/** 숫자 애니메이션 (easeInOut, 280ms 기본) */
function useCountUp(value: number, duration = 280) {
  const [display, setDisplay] = React.useState<number>(Math.round(value));
  const lastRef = React.useRef<number>(Math.round(value));

  React.useEffect(() => {
    const from = lastRef.current;
    const to = Math.round(value);
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else lastRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}

type Props = {
  p: Product;
  value?: string; // 계산기 초기값 seed (옵션)
  onChange?: (v: string) => void;
  onOpen: (p: Product, dailyAmount: number) => void; // 가입 확정 (즉시)
  /** 현재 가입 개수와 최대 허용 개수(기본 2) */
  activeSavingCount?: number;
  maxOpen?: number;
};

export default function ProductCard({
  p,
  value = "",
  onChange,
  onOpen,
  activeSavingCount = 0,
  maxOpen = 2,
}: Props) {
  const minDaily = p.min_daily_amount ?? 0;
  const days = p.term_days;

  /** apy_bps 그대로 퍼센트 표기/계산 */
  const ratePctInt = Math.round((p.apy_bps ?? 0) / 100); // 2800 → 28
  const rate = (p.apy_bps ?? 0) / 10000; // 2800 → 0.28

  /** 정액 보너스: completion_bonus_bps 그대로 금액 */
  const bonusAmount = Math.max(0, p.completion_bonus_bps ?? 0);

  const reachedLimit = activeSavingCount >= maxOpen;

  // 계산기 다이얼로그
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcAmount, setCalcAmount] = useState<number>(() => {
    const n = Number(value || 0);
    return Number.isFinite(n) && n > 0 ? n : minDaily;
  });

  // 계산(단순 이자 + 정액 보너스)
  const raw = useMemo(() => {
    const A = Math.max(minDaily, Math.max(0, Number(calcAmount || 0)));
    const principal = A * days;
    const interest = principal * rate;
    const bonus = bonusAmount;
    const total = principal + interest + bonus;
    const profit = interest + bonus;

    const denom = Math.max(total, 1);
    return {
      A,
      principal,
      interest,
      bonus,
      total,
      profit,
      ratios: {
        principal: (principal / denom) * 100,
        interest: (interest / denom) * 100,
        bonus: (bonus / denom) * 100,
      },
    };
  }, [calcAmount, minDaily, days, rate, bonusAmount]);

  // 숫자 애니메이션 값
  const principalAnim = useCountUp(raw.principal);
  const interestAnim = useCountUp(raw.interest);
  const bonusAnim = useCountUp(raw.bonus);
  const totalAnim = useCountUp(raw.total);
  const profitAnim = useCountUp(raw.profit);

  /** 가입 핸들러: 입력이 비었거나 최저 미만이어도 minDaily로 가입 */
  const handleJoinFromCalc = () => {
    if (reachedLimit) return; // 한도면 가입 막기 (계산기는 열 수 있음)
    const n = Number(calcAmount);
    const safeAmt =
      Number.isFinite(n) && n > 0
        ? Math.max(minDaily, Math.floor(n))
        : minDaily;
    onOpen(p, safeAmt);
    setCalcOpen(false);
  };

  const Tagline = p.tagline ? (
    <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
      {p.tagline}
    </p>
  ) : null;

  return (
    <>
      <Card
        className={`
          min-h-[280px]
          bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50
          dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900/70
          shadow-[0_6px_24px_-12px_rgba(0,0,0,0.08)]
          border-0 ring-1 ring-border
        `}
      >
        {/* 헤더 */}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg md:text-xl font-extrabold tracking-tight">
              {p.name}
            </CardTitle>
            {/* ❌ 카드별 배지 제거 (페이지 상단에서만 표시) */}
          </div>
          {Tagline}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 📋 상품 정보 */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-base">📋</span>
              <h3 className="text-sm font-semibold">상품 정보</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoTile emoji="⏳" title="기간(일수)" value={`${days}일`} />
              <InfoTile
                emoji="💰"
                title="일일 최소 납입"
                value={fmt(minDaily)}
              />
              <InfoTile emoji="📈" title="이율" value={`${ratePctInt}%`} />
              <InfoTile
                emoji="🎁"
                title="완주 보너스"
                value={fmt(bonusAmount)}
              />
            </div>
          </section>

          {/* 🧮 만기액 계산 */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-base">🧮</span>
              <h3 className="text-sm font-semibold">만기액 계산</h3>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] text-muted-foreground">
                일일 납입액과 일수({days}일)를 기준으로 만기 수령액을 미리
                계산해요.
              </p>
              <Button
                variant="outline"
                onClick={() => setCalcOpen(true)}
                // ✅ 계산기는 항상 열 수 있게 유지 (한도여도 열림)
                title={
                  reachedLimit
                    ? "가입은 제한되지만 계산은 가능합니다"
                    : "계산기 열기"
                }
              >
                계산기 열기
              </Button>
            </div>
          </section>
        </CardContent>
      </Card>

      {/* ── 계산기 다이얼로그 ── */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent className="w-[92vw] sm:max-w-lg md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>만기액 계산기</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 좌측: 입력 & 핵심 요약 */}
            <div className="space-y-4">
              {/* 입력 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">일일 납입액</label>
                <div className="flex items-center gap-2">
                  <Input
                    inputMode="numeric"
                    value={
                      Number.isFinite(calcAmount) ? String(calcAmount) : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      const n = Number(raw);
                      setCalcAmount(Number.isFinite(n) ? n : 0);
                      onChange?.(raw);
                    }}
                    placeholder={`${fmt(minDaily)} 이상`}
                    className="w-full md:w-[200px]"
                  />
                  <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                    최저 <b>{fmt(minDaily)}</b>
                  </span>
                </div>
                {Number(calcAmount) < minDaily && (
                  <p className="text-[12px] text-muted-foreground">
                    입력이 없거나 최저 미만이면 <b>{fmt(minDaily)}</b>로
                    가입돼요.
                  </p>
                )}
              </div>

              {/* A × 일수 = 원금 요약 */}
              <div className="rounded-lg border bg-background p-3 text-sm flex items-center justify-between">
                <span className="text-muted-foreground">원금 계산</span>
                <span className="tabular-nums font-semibold">
                  {fmt(raw.A)} × {days}일 = {fmt(principalAnim)}
                </span>
              </div>

              {/* 상단 Big KPI */}
              <div className="text-center space-y-1">
                <div className="text-[11px] text-muted-foreground">
                  만기 수령액
                </div>
                <div className="tabular-nums text-2xl font-extrabold tracking-tight">
                  {fmt(totalAnim)}
                </div>
                <div className="text-[12px] text-muted-foreground">
                  이자 포함
                </div>
              </div>
            </div>

            {/* 우측: 분해 구성 + KPI들 */}
            <div className="space-y-4">
              {/* 3색 진행바 */}
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted relative">
                <span
                  className="absolute left-0 top-0 h-full bg-primary/70"
                  style={{
                    width: `${raw.ratios.principal}%`,
                    transition: "width 280ms ease",
                  }}
                  title={`원금 ${fmt(principalAnim)}`}
                />
                <span
                  className="absolute top-0 h-full bg-emerald-500/70"
                  style={{
                    left: `${raw.ratios.principal}%`,
                    width: `${raw.ratios.interest}%`,
                    transition: "left 280ms ease, width 280ms ease",
                  }}
                  title={`이자 ${fmt(interestAnim)}`}
                />
                <span
                  className="absolute top-0 h-full bg-amber-500/70"
                  style={{
                    left: `${raw.ratios.principal + raw.ratios.interest}%`,
                    width: `${raw.ratios.bonus}%`,
                    transition: "left 280ms ease, width 280ms ease",
                  }}
                  title={`보너스 ${fmt(bonusAnim)}`}
                />
              </div>

              {/* 3열 KPI */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <Kpi label="만기 수령액" value={fmt(totalAnim)} strong />
                <Kpi label="원금(총 납입)" value={fmt(principalAnim)} />
                <Kpi label="총 이윤" value={fmt(profitAnim)} />
              </div>

              {/* 구성 요약 */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <StatChip label="이자" value={fmt(interestAnim)} />
                <StatChip label="보너스" value={fmt(bonusAnim)} />
              </div>

              {/* 수식 안내 */}
              <p className="text-[12px] text-muted-foreground text-center">
                <span className="font-medium">총 이윤</span> = 만기 수령액 −
                원금 = 이자 + 보너스
              </p>
            </div>
          </div>

          {/* 가입 제한 안내 (다이얼로그 내부 안내 문구만) */}
          {reachedLimit && (
            <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
              현재 활성 적금이 {activeSavingCount}/{maxOpen} 입니다. 추가 가입은
              제한됩니다.
            </div>
          )}

          {/* 버튼: 가입하기/닫기 — 가입만 막음 */}
          <DialogFooter className="flex w-full items-center justify-between gap-2">
            <Button
              onClick={handleJoinFromCalc}
              disabled={reachedLimit}
              title={
                reachedLimit
                  ? `신규 가입 불가 (${activeSavingCount}/${maxOpen})`
                  : "가입하기"
              }
            >
              {reachedLimit ? `가입 한도 초과 (${maxOpen}개)` : "가입하기"}
            </Button>
            <Button variant="outline" onClick={() => setCalcOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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

function StatChip({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-background p-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-semibold text-right">{value}</span>
    </div>
  );
}

function Kpi({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      <div
        className={`tabular-nums ${
          strong ? "text-xl font-extrabold" : "text-lg font-semibold"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
