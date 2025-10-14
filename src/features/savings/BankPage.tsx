// src/features/savings/BankPage.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, Info } from "lucide-react";

import type { Account, Product } from "./api";
import { depositToday, fetchAccounts, fetchProducts, openAccount } from "./api";
import AccountCard from "./AccountCard"; // 경로는 너 프로젝트 구조에 맞춰 유지
import ProductCard from "./ProductCard"; // 경로는 너 프로젝트 구조에 맞춰 유지
import { useCoupleContext } from "@/contexts/CoupleContext"; // ✅ 컨텍스트에서 coupleId 사용

export default function BankPage() {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id as string | undefined; // ✅ props 대신 컨텍스트

  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openAmount, setOpenAmount] = useState<Record<number, string>>({}); // product_id -> 입력값

  const loadAll = useCallback(async () => {
    if (!coupleId) return;
    try {
      setLoading(true);
      setError(null);
      const [p, a] = await Promise.all([
        fetchProducts(),
        fetchAccounts(coupleId),
      ]);
      setProducts(p);
      setAccounts(a);
    } catch (e: any) {
      setError(e?.message ?? "불러오기 오류");
    } finally {
      setLoading(false);
    }
  }, [coupleId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const productsById = useMemo(() => {
    const m = new Map<number, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const myActive = accounts.filter((a) => a.status === "active");
  const myOther = accounts.filter((a) => a.status !== "active");

  async function handleDeposit(acc: Account) {
    try {
      await depositToday({
        account_id: acc.id,
        couple_id: acc.couple_id,
        amount: acc.daily_amount,
      });
      alert("오늘 납입 완료!");
      await loadAll();
    } catch (e: any) {
      alert(e?.message ?? "납입 실패");
    }
  }

  async function handleOpen(p: Product) {
    if (!coupleId) return alert("커플 정보가 필요합니다.");
    const val = parseFloat(openAmount[p.id] ?? "");
    if (Number.isNaN(val)) return alert("일일 금액을 입력하세요.");
    if (val < p.min_daily_amount)
      return alert(`최소 ${p.min_daily_amount}G 이상 납입해야 합니다.`);
    try {
      await openAccount({
        couple_id: coupleId,
        product_id: p.id,
        daily_amount: val,
      });
      setOpenAmount((prev) => ({ ...prev, [p.id]: "" }));
      alert(`${p.name} 가입 완료! 납입은 내일부터 가능합니다.`);
      await loadAll();
    } catch (e: any) {
      alert(e?.message ?? "가입 실패");
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">은행</h1>
          <div className="text-xs text-muted-foreground mt-1">
            APY는 <b>복리 이율</b>입니다. 납입 시간: <b>09:00–18:00(KST)</b>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={loadAll}
          disabled={loading || !coupleId}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          새로고침
        </Button>
      </header>

      {!coupleId && (
        <Alert>
          <AlertTitle>커플 정보 없음</AlertTitle>
          <AlertDescription>커플 연동 후 이용해주세요.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>불러오기 오류</AlertTitle>
          <AlertDescription className="break-words">{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="mine" className="w-full">
        <TabsList className="grid grid-cols-2 w-full md:w-auto">
          <TabsTrigger value="mine">내 적금</TabsTrigger>
          <TabsTrigger value="browse">상품 둘러보기</TabsTrigger>
        </TabsList>

        {/* 내 적금 */}
        <TabsContent value="mine" className="mt-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" /> 로딩 중…
            </div>
          ) : myActive.length === 0 && myOther.length === 0 ? (
            <Card className="min-h-[160px]">
              <CardContent className="py-10 text-center space-y-3">
                <Info className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  등록된 적금이 없어요. 아래에서 상품을 골라 시작해보세요.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {myActive.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold mb-2">진행 중</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myActive.map((acc) => (
                      <AccountCard
                        key={acc.id}
                        acc={acc}
                        product={
                          acc.product ?? productsById.get(acc.product_id)!
                        }
                        onDeposit={() => handleDeposit(acc)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {myOther.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold mt-6 mb-2">완료/종료</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myOther.map((acc) => (
                      <AccountCard
                        key={acc.id}
                        acc={acc}
                        product={
                          acc.product ?? productsById.get(acc.product_id)!
                        }
                        onDeposit={() => handleDeposit(acc)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </TabsContent>

        {/* 상품 둘러보기 (시뮬레이션 포함) */}
        <TabsContent value="browse" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                value={openAmount[p.id] ?? ""}
                onChange={(v) =>
                  setOpenAmount((prev) => ({ ...prev, [p.id]: v }))
                }
                onOpen={(pp) => handleOpen(pp)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <footer className="text-xs text-muted-foreground pt-2">
        ※ 보너스는 <b>완주 시</b>에만 지급됩니다. 한번이라도 미납하면{" "}
        <b>is_perfect=false</b>로 표시되며, 납입은 계속 가능하지만{" "}
        <b>만기 보너스가 제외</b>됩니다.
      </footer>
    </div>
  );
}
