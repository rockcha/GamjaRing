import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle2,
  Clock,
  Coins,
  Info,
  Rocket,
  Sparkles,
  TrendingUp,
} from "lucide-react";

/**
 * SavingProductPage (server-backed)
 * - 섹션 1: 내가 든 적금(서버 조회) + 오늘 납입
 * - 섹션 2: 상품 둘러보기(서버 조회) + 가입(일일 금액 입력)
 * - 납입 가능 시간: 09:00–18:00(KST) 고정, 가입 다음날부터 납입 시작
 *
 * 예상 API
 * GET    /api/savings/products                               -> Product[]
 * GET    /api/savings/accounts?couple_id=xxx                 -> Account[]
 * POST   /api/savings/accounts                               -> open {couple_id, product_id, daily_amount}
 * POST   /api/savings/accounts/:id/installments              -> deposit today
 */

// -----------------
// Types
// -----------------
export type Product = {
  id: number;
  name: string;
  term_days: number;
  min_daily_amount: number; // G
  apy_bps: number; // e.g. 8500 = 85%
  tagline?: string;
};

export type Account = {
  id: number;
  couple_id: string;
  product_id: number;
  status: "active" | "matured" | "failed" | "closed";
  daily_amount: number; // G (고정)
  started_date: string; // YYYY-MM-DD (가입일, D0) — D1=+1day부터 납입 가능
  current_day: number; // 진행중 회차 번호(1..term_days+1)
  paid_days: number; // 성공 납입 누계
  last_paid_at?: string; // ISO timestamp
};

// -----------------
// Utilities
// -----------------
const KST_OFFSET_MIN = 9 * 60; // UTC+9
function nowInKST(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + KST_OFFSET_MIN * 60000);
}
function yyyymmdd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function toKSTDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00+09:00");
}
function isDepositWindowOpen(nowKST: Date): boolean {
  const h = nowKST.getHours();
  const m = nowKST.getMinutes();
  const total = h * 60 + m;
  const start = 9 * 60; // 09:00
  const end = 18 * 60; // 18:00
  return total >= start && total < end;
}

// 오늘이 해당 계좌의 due date 인지 판단 (D1=started_date+1)
function isTodayDue(account: Account): boolean {
  const base = toKSTDate(account.started_date);
  const due = new Date(base);
  due.setDate(due.getDate() + account.current_day);
  return yyyymmdd(due) === yyyymmdd(nowInKST());
}

// 진행률 계산
function getProgress(account: Account, product: Product) {
  const total = product.term_days;
  const done = Math.min(account.paid_days, total);
  const pct = Math.round((done / total) * 100);
  return { total, done, pct };
}

// -----------------
// API hooks (fetch)
// -----------------
async function apiGetProducts(): Promise<Product[]> {
  const r = await fetch("/api/savings/products", { cache: "no-store" });
  if (!r.ok) throw new Error("상품을 불러오지 못했습니다");
  return r.json();
}
async function apiGetAccounts(coupleId: string): Promise<Account[]> {
  const r = await fetch(
    `/api/savings/accounts?couple_id=${encodeURIComponent(coupleId)}`,
    { cache: "no-store" }
  );
  if (!r.ok) throw new Error("내 적금을 불러오지 못했습니다");
  return r.json();
}
async function apiOpenAccount(payload: {
  couple_id: string;
  product_id: number;
  daily_amount: number;
}): Promise<Account> {
  const r = await fetch("/api/savings/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("가입에 실패했습니다");
  return r.json();
}
async function apiDepositToday(accountId: number): Promise<{ ok: true }> {
  const r = await fetch(`/api/savings/accounts/${accountId}/installments`, {
    method: "POST",
  });
  if (!r.ok) throw new Error("오늘 납입에 실패했습니다");
  return { ok: true };
}

// -----------------
// Component
// -----------------
export default function SavingProductPage({ coupleId }: { coupleId: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openAmount, setOpenAmount] = useState<Record<number, string>>({}); // product_id -> input string

  const nowKST = nowInKST();
  const windowOpen = isDepositWindowOpen(nowKST);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [p, a] = await Promise.all([
        apiGetProducts(),
        apiGetAccounts(coupleId),
      ]);
      setProducts(p);
      setAccounts(a);
    } catch (e: any) {
      setError(e.message ?? "불러오기 오류");
    } finally {
      setLoading(false);
    }
  }, [coupleId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const productsById = useMemo(() => {
    const map = new Map<number, Product>();
    (products ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const handleDeposit = async (acc: Account) => {
    try {
      await apiDepositToday(acc.id);
      await loadAll();
    } catch (e: any) {
      alert(e.message ?? "납입 중 오류");
    }
  };

  const handleOpen = async (p: Product) => {
    const val = parseFloat(openAmount[p.id] ?? "");
    if (Number.isNaN(val)) return alert("일일 금액을 입력하세요");
    if (val < p.min_daily_amount)
      return alert(`최소 ${p.min_daily_amount}G 이상 납입해야 합니다`);
    try {
      await apiOpenAccount({
        couple_id: coupleId,
        product_id: p.id,
        daily_amount: val,
      });
      setOpenAmount((prev) => ({ ...prev, [p.id]: "" }));
      await loadAll();
      alert(`${p.name} 가입 완료! 납입은 내일부터 가능합니다.`);
    } catch (e: any) {
      alert(e.message ?? "가입 실패");
    }
  };

  const myActiveAccounts = (accounts ?? []).filter(
    (a) => a.status === "active"
  );
  const myOtherAccounts = (accounts ?? []).filter((a) => a.status !== "active");

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">적금</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Clock className="h-4 w-4" /> 납입 가능:{" "}
            <span className="font-medium">09:00–18:00 (KST)</span>
            {windowOpen ? (
              <Badge className="ml-2" variant="default">
                지금 납입 가능
              </Badge>
            ) : (
              <Badge className="ml-2" variant="secondary">
                지금은 납입 불가
              </Badge>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={loadAll} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          새로고침
        </Button>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>불러오기 오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          로딩 중…
        </div>
      ) : (
        <Tabs defaultValue="mine" className="w-full">
          <TabsList className="grid grid-cols-2 w-full md:w-auto">
            <TabsTrigger value="mine">내 적금</TabsTrigger>
            <TabsTrigger value="browse">상품 둘러보기</TabsTrigger>
          </TabsList>

          {/* 내 적금 */}
          <TabsContent value="mine" className="space-y-4 mt-4">
            {myActiveAccounts.length === 0 && myOtherAccounts.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center space-y-3">
                  <Info className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    등록된 적금이 없어요. 아래에서 상품을 골라 시작해보세요.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {myActiveAccounts.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-sm font-semibold">진행 중</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myActiveAccounts.map((acc) => {
                        const p = productsById.get(acc.product_id)!;
                        const { total, done, pct } = getProgress(acc, p);
                        const depositable =
                          windowOpen &&
                          isTodayDue(acc) &&
                          acc.paid_days < p.term_days;
                        return (
                          <Card key={acc.id} className="relative">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4" />
                                  {p.name}
                                </CardTitle>
                                <Badge>active</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {p.tagline}
                              </p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Coins className="h-4 w-4" />
                                  일일 금액
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
                                  <Clock className="h-4 w-4" />
                                  오늘 납입
                                </div>
                                <div className="font-medium">
                                  {isTodayDue(acc) ? "오늘" : "대기"}
                                </div>
                              </div>
                              <div className="pt-2 flex items-center justify-between gap-2">
                                <Button
                                  disabled={!depositable}
                                  onClick={() => handleDeposit(acc)}
                                  className="flex-1"
                                >
                                  {depositable
                                    ? "오늘 납입하기"
                                    : "지금은 납입 불가"}
                                </Button>
                                <Badge
                                  variant="outline"
                                  className="whitespace-nowrap"
                                >
                                  09:00–18:00
                                </Badge>
                              </div>
                              {acc.paid_days === p.term_days && (
                                <div className="mt-2 flex items-center gap-2 text-emerald-600 text-sm">
                                  <CheckCircle2 className="h-4 w-4" /> 모든 회차
                                  납입 완료! 만기 정산 대기 중
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                )}

                {myOtherAccounts.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mt-6 mb-2">
                      <h2 className="text-sm font-semibold">완료/종료</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myOtherAccounts.map((acc) => {
                        const p = productsById.get(acc.product_id)!;
                        return (
                          <Card key={acc.id}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4" />
                                  {p.name}
                                </CardTitle>
                                <Badge variant="secondary">{acc.status}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                              시작일 {acc.started_date} · 일일{" "}
                              {acc.daily_amount}G
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </TabsContent>

          {/* 상품 둘러보기 */}
          <TabsContent value="browse" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(products ?? []).map((p) => (
                <Card key={p.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Rocket className="h-4 w-4" />
                        {p.name}
                      </CardTitle>
                      <Badge variant="outline">
                        APY {(p.apy_bps / 100).toFixed(2)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {p.tagline}
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

                    <Separator />

                    <div className="flex items-center gap-2">
                      <Input
                        inputMode="numeric"
                        placeholder={`${p.min_daily_amount}G 이상`}
                        value={openAmount[p.id] ?? ""}
                        onChange={(e) =>
                          setOpenAmount((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                      />
                      <Button onClick={() => handleOpen(p)}>가입하기</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      가입 당일은 준비일(D0)이며, 납입은{" "}
                      <strong>D1(다음날)</strong>부터 가능합니다.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <footer className="text-xs text-muted-foreground pt-2">
        ※ 모든 금액은 G(골드) 단위. 실제 정산/보상 규칙은 서버 정책과 DB
        제약(09–18시, D1 시작)에 따릅니다.
      </footer>
    </div>
  );
}
