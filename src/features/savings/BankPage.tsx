// src/features/savings/BankPage.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info, SlidersHorizontal } from "lucide-react";

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

import { Skeleton } from "@/components/ui/skeleton";
import { isDepositWindowOpen } from "./time";

import SeedShopButton from "../FlowerShop/SeedShopButton";
import FlowerDexButton from "../FlowerShop/FlowerDexButton";
import GardenBackyard from "../FlowerShop/GardenBackyard";

type SortKey = "term_asc" | "min_daily_asc" | "apy_desc" | "bonus_desc";

export default function BankPage() {
  const { couple, gold, spendGold } = useCoupleContext();
  const coupleId = couple?.id as string | undefined;

  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("term_asc");

  // 진행 중 / 완료 필터 (내 적금 탭 안에서만 사용)
  const [statusFilter, setStatusFilter] = useState<"active" | "completed">(
    "active"
  );

  const MAX_OPEN = 4;

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

  const activeSavingCount = myActive.length;
  const reachedLimit = activeSavingCount >= MAX_OPEN;

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

  // ✅ 개별 납입
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

  // ✅ 한 번에 납입 (진행 중인 적금 중 "오늘 납입 가능"한 것들만)
  async function handleDepositAllToday() {
    if (!coupleId) return;
    if (!isDepositWindowOpen()) {
      alert("지금은 납입 가능 시간이 아닙니다. (09:00~18:00)");
      return;
    }
    if (!myActive.length) {
      alert("진행 중인 적금이 없습니다.");
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // 오늘 납입 가능한 계좌만 필터링
    const depositable = myActive.filter((acc) => {
      const lastPaidStr = acc.last_paid_at
        ? acc.last_paid_at.slice(0, 10)
        : null;
      const alreadyPaidToday = lastPaidStr === todayStr;

      const product = acc.product ?? productsById.get(acc.product_id) ?? null;
      const termDays = product?.term_days ?? 0;

      return (
        acc.status === "active" && !alreadyPaidToday && acc.paid_days < termDays
      );
    });

    if (!depositable.length) {
      alert("오늘 납입할 수 있는 적금이 없습니다.");
      return;
    }

    if (
      !confirm(
        `오늘 납입 가능 적금 ${depositable.length}개를 한 번에 납입할까요?`
      )
    ) {
      return;
    }

    setBulkLoading(true);
    try {
      let remainingGold = gold ?? 0;
      let successCount = 0;

      for (const acc of depositable) {
        if (remainingGold < acc.daily_amount) {
          // 더 이상 골드 부족하면 중단
          break;
        }

        // 골드 차감
        const { error } = await spendGold(acc.daily_amount);
        if (error) {
          // 이 계좌는 스킵, 다음으로
          continue;
        }
        remainingGold -= acc.daily_amount;

        // 납입 트랜잭션
        await depositToday({
          account_id: acc.id,
          couple_id: acc.couple_id,
          amount: acc.daily_amount,
        });

        successCount += 1;
      }

      if (successCount === 0) {
        alert("골드가 부족하거나 오늘 납입 가능한 적금이 없습니다.");
      } else {
        alert(`총 ${successCount}개의 적금을 오늘 납입했습니다.`);
        await loadAll();
      }
    } catch (e: any) {
      console.error("[BankPage] bulk deposit error:", e);
      alert(e?.message ?? "한 번에 납입 처리 중 오류가 발생했습니다.");
    } finally {
      setBulkLoading(false);
    }
  }

  /** ✅ 프론트에서만 가입 차단 + 최저금액 보정 */
  async function handleOpen(p: Product, dailyAmount: number) {
    if (!coupleId) return alert("커플 정보가 필요합니다.");

    if (reachedLimit) {
      alert(
        `활성 적금이 ${activeSavingCount}개입니다. 최대 ${MAX_OPEN}개까지만 가입할 수 있어요.`
      );
      return;
    }

    const min = p.min_daily_amount ?? 0;
    const safe = Math.max(min, Math.floor(dailyAmount) || min);

    try {
      await openAccount({
        couple_id: coupleId,
        product_id: p.id,
        daily_amount: safe,
      });
      alert(`${p.name} 가입 완료! (일일 납입액: ${safe.toLocaleString()})`);
      await loadAll();
    } catch (e: any) {
      alert(e?.message ?? "가입 실패");
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">
      {/* 헤더 */}
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

      {/* 상단 상태 바 */}
      <div className="rounded-xl border bg-card/60 p-4">
        <header className="flex items-center justify-center">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            감자링 중앙은행
          </h1>
        </header>

        <div className="mt-2 flex items-center justify-center gap-3">
          <div className="text-sm md:text-base">
            현재 활성 적금: <b className="tabular-nums">{activeSavingCount}</b>{" "}
            / {MAX_OPEN}
          </div>
          {reachedLimit ? (
            <Badge variant="destructive" className="text-[11px] md:text-xs">
              적금 추가 가입 불가
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[11px] md:text-xs">
              가입 가능
            </Badge>
          )}
        </div>

        {/* 규칙 섹션 */}
        <div className="mt-3">
          <RulesSection />
        </div>
      </div>

      {/* 탭 */}
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

        {/* 내 적금 */}
        <TabsContent
          value="mine"
          className="mt-4 space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-left-6"
        >
          {loading ? (
            // ✅ Skeleton 로딩: 부모 width 기준 w-full
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="min-h-[260px]">
                  <CardContent className="p-4 space-y-4">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-2 w-3/4" />
                  </CardContent>
                </Card>
              ))}
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
              {/* ✅ 진행 중 / 완료 필터 토글 (기본: 진행 중) */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("active")}
                    className={`px-3 py-1 rounded-full transition text-xs md:text-sm ${
                      statusFilter === "active"
                        ? "bg-background shadow-sm font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    진행 중 ({myActive.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("completed")}
                    className={`px-3 py-1 rounded-full transition text-xs md:text-sm ${
                      statusFilter === "completed"
                        ? "bg-background shadow-sm font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    완료·종료 ({myOther.length})
                  </button>
                </div>

                {/* ✅ 오늘 한 번에 납입 버튼 (진행 중 탭일 때만) */}
                {statusFilter === "active" && myActive.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs md:text-sm"
                    onClick={handleDepositAllToday}
                    disabled={bulkLoading}
                  >
                    {bulkLoading ? "한 번에 납입 중..." : "오늘 한 번에 납입"}
                  </Button>
                )}
              </div>

              {/* ✅ 필터에 따른 리스트 */}
              {statusFilter === "active" ? (
                myActive.length === 0 ? (
                  <Card className="min-h-[140px]">
                    <CardContent className="py-8 text-center space-y-2">
                      <p className="text-sm text-muted-foreground">
                        진행 중인 적금이 없어요.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        &quot;상품 둘러보기&quot; 탭에서 새 적금을 시작해보세요.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
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
                )
              ) : myOther.length === 0 ? (
                <Card className="min-h-[140px]">
                  <CardContent className="py-8 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      완료·종료된 적금이 아직 없어요.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      적금을 완주하면 이곳에서 기록을 확인할 수 있어요.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <section>
                  <h2 className="text-sm font-semibold mb-2">
                    완료/종료된 적금
                  </h2>
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

        {/* 상품 둘러보기 */}
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
                onOpen={(pp, amt) => handleOpen(pp, amt)} // 금액까지 전달
                activeSavingCount={activeSavingCount} // 프론트 차단 정보 전달
                maxOpen={MAX_OPEN}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
