"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, ShoppingBag, RefreshCw, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/*
  DexInventoryButton.tsx — 인벤토리(완성 요리/실패물) + 수량 판매 Dialog
  - 판매 성공 시 CoupleContext.addGold(totalPrice) 호출하여 골드 증가
*/

export type DexInventoryButtonProps = {
  className?: string;
  coupleId?: string;
  onSold?: (payload: {
    kind: "dish" | "fail";
    id: number;
    unitPrice: number;
    qty: number;
    totalPrice: number;
  }) => void;
};

type Row = {
  id: number;
  name: string;
  emoji: string;
  price: number; // 단가
  qty: number;
};

export default function DexInventoryButton({
  className,
  coupleId: coupleIdProp,
  onSold,
}: DexInventoryButtonProps) {
  const { couple, addGold } = useCoupleContext();
  const coupleId = coupleIdProp ?? couple?.id ?? null;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"dish" | "fail">("dish");

  const [dishes, setDishes] = useState<Row[]>([]);
  const [fails, setFails] = useState<Row[]>([]);

  // 판매 모달 상태
  const [sellOpen, setSellOpen] = useState(false);
  const [sellKind, setSellKind] = useState<"dish" | "fail">("dish");
  const [sellRow, setSellRow] = useState<Row | null>(null);
  const [sellQty, setSellQty] = useState<number>(1);

  function openSellDialog(kind: "dish" | "fail", row: Row) {
    setSellKind(kind);
    setSellRow(row);
    setSellQty(row.qty > 0 ? 1 : 0);
    setSellOpen(true);
  }

  async function fetchAll() {
    if (!coupleId) return;
    setLoading(true);
    try {
      // dish
      const { data: dishData, error: dishErr } = await supabase
        .from("dish")
        .select('id, "이름", "이모지", "가격"')
        .order("id", { ascending: true });
      if (dishErr) throw dishErr;

      const { data: dishInv, error: dishInvErr } = await supabase
        .from("dish_inventory")
        .select("dish_id, qty")
        .eq("couple_id", coupleId);
      if (dishInvErr) throw dishInvErr;

      const dmap = new Map<number, number>();
      dishInv?.forEach((r: any) => dmap.set(Number(r.dish_id), Number(r.qty)));

      setDishes(
        (dishData ?? [])
          .map((d: any) => ({
            id: Number(d.id),
            name: d["이름"],
            emoji: d["이모지"],
            price: Number(d["가격"]),
            qty: dmap.get(Number(d.id)) ?? 0,
          }))
          .sort((a, b) => b.price - a.price)
      );

      // fail
      const { data: failData, error: failErr } = await supabase
        .from("failresult")
        .select('id, "이름", "이모지", "가격"')
        .order("id", { ascending: true });
      if (failErr) throw failErr;

      const { data: failInv, error: failInvErr } = await supabase
        .from("failresult_inventory")
        .select("failresult_id, qty")
        .eq("couple_id", coupleId);
      if (failInvErr) throw failInvErr;

      const fmap = new Map<number, number>();
      failInv?.forEach((r: any) =>
        fmap.set(Number(r.failresult_id), Number(r.qty))
      );

      setFails(
        (failData ?? [])
          .map((f: any) => ({
            id: Number(f.id),
            name: f["이름"],
            emoji: f["이모지"],
            price: Number(f["가격"]),
            qty: fmap.get(Number(f.id)) ?? 0,
          }))
          .sort((a, b) => b.price - a.price)
      );
    } catch (e) {
      console.error(e);
      toast.error("인벤토리를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && coupleId) fetchAll();
  }, [open, coupleId]);

  // 여러 개 판매 — 인벤토리 차감 후 골드 증가(addGold)
  async function sellMany(
    kind: "dish" | "fail",
    id: number,
    unitPrice: number,
    qty: number
  ) {
    if (!coupleId || qty <= 0) return;

    const totalPrice = unitPrice * qty;

    if (kind === "dish") {
      const idx = dishes.findIndex((x) => x.id === id);
      if (idx < 0) return;
      const cur = dishes[idx];
      const sellQty = Math.min(qty, cur.qty);
      if (sellQty <= 0) return;

      // 낙관적: 수량 감소
      setDishes((prev) =>
        prev.map((r, i) => (i === idx ? { ...r, qty: r.qty - sellQty } : r))
      );

      try {
        // 1) 서버 인벤토리 차감
        const { error: invErr } = await supabase.rpc(
          "decrement_dish_inventory",
          {
            p_couple_id: coupleId,
            p_dish_id: id,
            p_qty: sellQty,
          }
        );
        if (invErr) throw invErr;

        // 2) 골드 증가 (컨텍스트 함수 호출: 낙관적 + 서버 업데이트)
        const { error: goldErr } = await addGold(totalPrice);
        if (goldErr) throw goldErr;

        onSold?.({
          kind: "dish",
          id,
          unitPrice,
          qty: sellQty,
          totalPrice,
        });
        toast.success(`판매 완료! 골드 +${totalPrice}`);
      } catch (e) {
        console.error(e);
        // 롤백
        setDishes((prev) =>
          prev.map((r, i) => (i === idx ? { ...r, qty: r.qty + sellQty } : r))
        );
        toast.error("판매 처리에 실패했어요.");
        throw e;
      }
    } else {
      const idx = fails.findIndex((x) => x.id === id);
      if (idx < 0) return;
      const cur = fails[idx];
      const sellQty = Math.min(qty, cur.qty);
      if (sellQty <= 0) return;

      // 낙관적: 수량 감소
      setFails((prev) =>
        prev.map((r, i) => (i === idx ? { ...r, qty: r.qty - sellQty } : r))
      );

      try {
        // 1) 서버 인벤토리 차감
        const { error: invErr } = await supabase.rpc(
          "decrement_fail_inventory",
          {
            p_couple_id: coupleId,
            p_fail_id: id,
            p_qty: sellQty,
          }
        );
        if (invErr) throw invErr;

        // 2) 골드 증가
        const { error: goldErr } = await addGold(totalPrice);
        if (goldErr) throw goldErr;

        onSold?.({
          kind: "fail",
          id,
          unitPrice,
          qty: sellQty,
          totalPrice,
        });
        toast.success(`판매 완료! 골드 +${totalPrice}`);
      } catch (e) {
        console.error(e);
        // 롤백
        setFails((prev) =>
          prev.map((r, i) => (i === idx ? { ...r, qty: r.qty + sellQty } : r))
        );
        toast.error("판매 처리에 실패했어요.");
        throw e;
      }
    }
  }

  const handleConfirmSell = async () => {
    if (!sellRow) return;
    try {
      await sellMany(sellKind, sellRow.id, sellRow.price, sellQty);
      setSellOpen(false);
    } catch {
      /* noop */
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className={cn("rounded-xl px-3 h-9 gap-2", className)}>
            <ShoppingBag className="h-4 w-4" />
            요리 인벤토리
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-lg">요리 인벤토리</DialogTitle>
          </DialogHeader>
          <Separator />

          <div className="px-4 pb-3 pt-2">
            <div className="flex items-center justify-between">
              <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as any)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dish">일반 요리</TabsTrigger>
                  <TabsTrigger value="fail">희귀 아이템</TabsTrigger>
                </TabsList>

                <TabsContent value="dish" className="mt-3">
                  <Section
                    loading={loading}
                    rows={dishes}
                    emptyLabel="요리를 아직 보유하고 있지 않아요."
                    onSellClick={(row) => openSellDialog("dish", row)}
                  />
                </TabsContent>

                <TabsContent value="fail" className="mt-3">
                  <Section
                    loading={loading}
                    rows={fails}
                    emptyLabel="실패 결과물이 없습니다."
                    onSellClick={(row) => openSellDialog("fail", row)}
                  />
                </TabsContent>
              </Tabs>

              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                onClick={() => fetchAll()}
                aria-label="새로고침"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 판매 수량 선택 Dialog */}
      <Dialog open={sellOpen} onOpenChange={setSellOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>판매하기</DialogTitle>
          </DialogHeader>

          {sellRow && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{sellRow.emoji}</div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{sellRow.name}</div>
                  <div className="text-sm text-muted-foreground">
                    <span className="tabular-nums">🪙 {sellRow.price}</span> ·
                    보유 <span className="tabular-nums">×{sellRow.qty}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sellQty">수량 선택</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setSellQty((q) => Math.max(1, q - 1))}
                    disabled={sellRow.qty <= 0 || sellQty <= 1}
                    aria-label="수량 감소"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="sellQty"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={sellRow.qty}
                    value={sellQty}
                    onChange={(e) => {
                      const v = Number(e.target.value || 0);
                      if (Number.isNaN(v)) return;
                      setSellQty(() =>
                        Math.max(1, Math.min(sellRow.qty, Math.floor(v)))
                      );
                    }}
                    className="h-9 w-24 text-center tabular-nums"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() =>
                      setSellQty((q) =>
                        Math.min(sellRow.qty, Math.max(1, q + 1))
                      )
                    }
                    disabled={sellRow.qty <= 1 || sellQty >= sellRow.qty}
                    aria-label="수량 증가"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="ml-auto"
                    onClick={() => setSellQty(sellRow.qty || 1)}
                    disabled={sellRow.qty <= 0}
                  >
                    최대(×{sellRow.qty})
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">총 금액</div>
                <div className="text-lg font-semibold tabular-nums">
                  🪙 {sellRow.price * sellQty}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSellOpen(false)}
                >
                  취소
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleConfirmSell}
                  disabled={!sellRow || sellQty < 1}
                >
                  판매하기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({
  loading,
  rows,
  emptyLabel,
  onSellClick,
}: {
  loading: boolean;
  rows: Row[];
  emptyLabel: string;
  onSellClick: (row: Row) => void;
}) {
  return (
    <ScrollArea className="h-[64vh]">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> 불러오는 중…
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
          {rows.length === 0 && (
            <div className="col-span-full text-sm text-muted-foreground text-center py-10">
              {emptyLabel}
            </div>
          )}
          {rows.map((r) => (
            <DexCard key={r.id} row={r} onSellClick={() => onSellClick(r)} />
          ))}
        </div>
      )}
    </ScrollArea>
  );
}

function DexCard({ row, onSellClick }: { row: Row; onSellClick: () => void }) {
  const owned = row.qty > 0;
  return (
    <Card
      className={cn(
        "relative rounded-2xl border overflow-hidden",
        owned ? "bg-white" : "bg-zinc-100",
        !owned && "opacity-60 grayscale"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="text-3xl select-none leading-none">{row.emoji}</div>

          <Badge className="rounded-full bg-amber-100 border-amber-200 text-amber-900 tabular-nums">
            ×{row.qty}
          </Badge>
        </div>

        <div className="mt-2 text-sm font-medium truncate">{row.name}</div>

        {/* 가격은 항상 표시 */}
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <span className="tabular-nums">🪙 {row.price}</span>
          </div>

          {owned ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="h-7 px-2 rounded-lg gap-1"
                    onClick={onSellClick}
                  >
                    판매
                  </Button>
                </TooltipTrigger>
                <TooltipContent>수량 선택 후 판매</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              size="sm"
              className="h-7 px-2 rounded-lg gap-1 opacity-50 cursor-not-allowed"
              disabled
            >
              판매
            </Button>
          )}
        </div>
      </CardContent>

      {/* 상단 그라데이션 장식 */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-10 h-14 bg-gradient-to-b from-zinc-300/40 to-transparent"
        aria-hidden
      />
    </Card>
  );
}

/*
  RPC 예시
  create or replace function public.decrement_dish_inventory(
    p_couple_id uuid,
    p_dish_id bigint,
    p_qty int
  ) returns void language plpgsql as $$
  begin
    update public.dish_inventory
       set qty = greatest(0, qty - p_qty), updated_at = now()
     where couple_id = p_couple_id and dish_id = p_dish_id;
  end;$$;

  create or replace function public.decrement_fail_inventory(
    p_couple_id uuid,
    p_fail_id bigint,
    p_qty int 
  ) returns void language plpgsql as $$
  begin
    update public.failresult_inventory
       set qty = greatest(0, qty - p_qty), updated_at = now()
     where couple_id = p_couple_id and failresult_id = p_fail_id;
  end;$$;
*/
