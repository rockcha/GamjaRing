// src/features/savings/BankPage.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, Info, SlidersHorizontal } from "lucide-react";

import type { Account, Product } from "./api";
import { depositToday, fetchAccounts, fetchProducts, openAccount } from "./api";
import AccountCard from "./AccountCard";
import ProductCard from "./ProductCard";
import { useCoupleContext } from "@/contexts/CoupleContext";
import RulesSection from "./RulesSection";

/* shadcn select */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortKey = "term_asc" | "min_daily_asc" | "apy_desc" | "bonus_desc";

export default function BankPage() {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id as string | undefined;

  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openAmount, setOpenAmount] = useState<Record<number, string>>({});
  const [sortKey, setSortKey] = useState<SortKey>("term_asc");

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

  const sortedProducts = useMemo(() => {
    const list = [...products];
    list.sort((a, b) => {
      switch (sortKey) {
        case "term_asc":
          return (a.term_days ?? 0) - (b.term_days ?? 0);
        case "min_daily_asc":
          return (a.min_daily_amount ?? 0) - (b.min_daily_amount ?? 0);
        case "apy_desc":
          return (b.apy_bps ?? 0) - (a.apy_bps ?? 0);
        case "bonus_desc":
          return (b.completion_bonus_bps ?? 0) - (a.completion_bonus_bps ?? 0);
        default:
          return 0;
      }
    });
    return list;
  }, [products, sortKey]);

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
      return alert(`최소 ${p.min_daily_amount} 이상 납입해야 합니다.`);
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
      {/* 헤더 */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">감자링 중앙은행</h1>
      </header>

      <RulesSection />

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

      {/* 탭 (슬라이드 애니메이션 추가) */}
      <Tabs defaultValue="mine" className="w-full">
        <TabsList className="w-full md:w-auto grid grid-cols-2 rounded-xl bg-muted/50 p-1">
          <TabsTrigger
            value="mine"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
          >
            내 적금
          </TabsTrigger>
          <TabsTrigger
            value="browse"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
          >
            상품 둘러보기
          </TabsTrigger>
        </TabsList>

        {/* 내 적금 - 슬라이드 인 */}
        <TabsContent
          value="mine"
          className="mt-4 space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-left-6"
        >
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
                  <h2 className="text-sm font-semibold mb-2">나의 적금</h2>
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

        {/* 상품 둘러보기 - 정렬바 + 슬라이드 인 */}
        <TabsContent
          value="browse"
          className="mt-4 space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-right-6"
        >
          {/* 정렬 바 */}
          <div className="flex items-center justify-between rounded-xl border bg-card p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              정렬
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={sortKey}
                onValueChange={(v) => setSortKey(v as SortKey)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue
                    placeholder="정렬 기준"
                    aria-label="정렬 기준 선택"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="term_asc">기간 적은 순</SelectItem>
                  <SelectItem value="min_daily_asc">
                    최소 납입금 낮은 순
                  </SelectItem>
                  <SelectItem value="apy_desc">이율(APY) 높은 순</SelectItem>
                  <SelectItem value="bonus_desc">
                    완주 보너스 높은 순
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortKey("term_asc")}
              >
                초기화
              </Button>
            </div>
          </div>

          {/* 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedProducts.map((p) => (
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
    </div>
  );
}
