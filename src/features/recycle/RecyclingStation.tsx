// src/features/recycle/RecyclingStation.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { toast } from "sonner";

/* shadcn */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* icons */
import { Trash2, Minus, Gift, Loader2 } from "lucide-react";

/* =========================
   타입
========================= */
type Rarity = "일반" | "희귀" | "에픽" | "전설" | string;

type InvRow = { id: string; entity_id: string; created_at: string };
type EntityMeta = {
  id: string;
  name_ko: string | null;
  is_recyclable: boolean | null;
  rarity: Rarity | null;
};

type StockEntry = {
  entity_id: string;
  name_ko: string | null;
  rarity: Rarity | null;
  stock: number; // 내 보유량 (실제 DB 기준)
};

type SelectMap = Record<string, number>; // entity_id -> 선택 수량(가상 소모)

type FailReward = {
  id: number;
  name: string;
  emoji: string;
  price: number;
  qty: number;
  imageSrc: string;
};

/* =========================
   유틸
========================= */
function rarityDir(r: Rarity | null | undefined) {
  const v = (r ?? "일반").toString();
  if (v === "일반") return "common";
  if (v === "희귀") return "rare";
  if (v === "에픽") return "epic";
  if (v === "전설") return "legend";
  return "common";
}
function buildEntityImageSrc(id: string, rarity: Rarity | null | undefined) {
  return `/aquarium/${rarityDir(rarity)}/${id}.png`;
}
function buildFailImageSrc(id: number) {
  return `/cooking/fail/${id}.png`;
}
const fmtQty = (n: number) => `x ${n.toLocaleString("ko-KR")}`;

/* =========================
   메인
========================= */
export default function RecyclingStation({
  className,
  title = "♻️ 분리수거장",
  description = "재활용 표시가 있는 오브젝트만 담을 수 있어요. 5개 또는 10개를 꽉 채워서 재활용하면 보상을 받아요.",
}: {
  className?: string;
  title?: string;
  description?: string;
}) {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [selected, setSelected] = useState<SelectMap>({});
  const selectedCount = useMemo(
    () => Object.values(selected).reduce((a, b) => a + b, 0),
    [selected]
  );

  // 5개 / 10개 모드
  const [bundle, setBundle] = useState<5 | 10 | null>(null);
  const capacity = bundle ?? 0;
  const capacityLeft = Math.max(0, capacity - selectedCount);
  const filled = bundle !== null && selectedCount >= capacity;

  /* 보상 다이얼로그 */
  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewards, setRewards] = useState<FailReward[]>([]);

  /* -------- 데이터 로드 -------- */
  const load = useCallback(async () => {
    if (!coupleId) return;
    setLoading(true);
    try {
      const { data: inv, error: invErr } = await supabase
        .from("couple_aquarium_inventory")
        .select("entity_id");
      if (invErr) throw invErr;

      const counter = new Map<string, number>();
      for (const r of (inv ?? []) as { entity_id: string }[]) {
        const id = String(r.entity_id);
        counter.set(id, (counter.get(id) ?? 0) + 1);
      }
      const ids = Array.from(counter.keys());
      if (ids.length === 0) {
        setStock([]);
        return;
      }

      const { data: ents, error: entErr } = await supabase
        .from("aquarium_entities")
        .select("id, name_ko, is_recyclable, rarity")
        .in("id", ids);
      if (entErr) throw entErr;

      const metaMap = new Map<string, EntityMeta>();
      for (const e of (ents ?? []) as EntityMeta[]) {
        metaMap.set(String(e.id), {
          id: String(e.id),
          name_ko: e.name_ko ?? null,
          is_recyclable: !!e.is_recyclable,
          rarity: e.rarity ?? "일반",
        });
      }

      const out: StockEntry[] = [];
      for (const id of ids) {
        const meta = metaMap.get(id);
        if (!meta) continue;
        if (!meta.is_recyclable) continue; // 재활용 가능만
        out.push({
          entity_id: id,
          name_ko: meta.name_ko,
          rarity: meta.rarity,
          stock: counter.get(id)!,
        });
      }

      out.sort((a, b) =>
        (a.name_ko ?? a.entity_id).localeCompare(b.name_ko ?? b.entity_id, "ko")
      );
      setStock(out);
    } catch (e) {
      console.error(e);
      toast.error("재활용 가능한 항목을 불러오지 못했어요.");
      setStock([]);
    } finally {
      setLoading(false);
    }
  }, [coupleId]);

  useEffect(() => {
    setSelected({});
    setBundle(null);
    void load();
  }, [load]);

  /* -------- 빠른 재고 조회 맵 -------- */
  const stockMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stock) m.set(s.entity_id, s.stock);
    return m;
  }, [stock]);

  /* -------- 가상 선택/해제 -------- */
  const addOne = (s: StockEntry) => {
    if (!bundle) {
      toast.info("먼저 5개 또는 10개 묶음을 선택하세요.");
      return;
    }
    if (filled) return;

    const curSelected = selected[s.entity_id] ?? 0;
    const available = s.stock - curSelected; // 선택 중 가상 남은 수량
    if (available <= 0) return;

    setSelected((prev) => {
      const currentTotal = Object.values(prev).reduce((a, b) => a + b, 0);
      if (currentTotal >= (bundle ?? 0)) return prev;
      return { ...prev, [s.entity_id]: curSelected + 1 };
    });
  };

  const subOne = (id: string) => {
    setSelected((prev) => {
      const cur = prev[id] ?? 0;
      if (cur <= 1) {
        const n = { ...prev };
        delete n[id];
        return n;
      }
      return { ...prev, [id]: cur - 1 };
    });
  };

  const removeAll = (id: string) =>
    setSelected((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });

  const clearAll = () => setSelected({});

  // 목록 아이템 클릭 = 0 ↔ 1 토글 (빠른 선택/해제)
  const toggleFromList = (s: StockEntry) => {
    const cur = selected[s.entity_id] ?? 0;
    if (cur > 0) {
      removeAll(s.entity_id);
    } else {
      addOne(s); // 0 -> 1, 이후 수량 증가는 우측 +
    }
  };

  // 우측 + 버튼 (보유수량, 묶음 용량 한도 내에서 증가)
  const incOne = (id: string) => {
    setSelected((prev) => {
      if (!bundle) {
        toast.info("먼저 5개 또는 10개 묶음을 선택하세요.");
        return prev;
      }

      const cur = prev[id] ?? 0;
      const maxForItem = stockMap.get(id) ?? cur; // 해당 아이템 보유 수량
      if (cur >= maxForItem) {
        toast.info("보유 수량을 초과할 수 없어요.");
        return prev;
      }

      const currentTotal = Object.values(prev).reduce((a, b) => a + b, 0);
      if (currentTotal >= bundle) {
        toast.warning("묶음 용량이 가득 찼어요.");
        return prev;
      }

      return { ...prev, [id]: cur + 1 };
    });
  };

  /* -------- 실제 인벤토리 삭제(재활용 소모) -------- */
  async function deleteAnyTankForEntity(entityId: string, qty: number) {
    const { data: rows, error: selErr } = await supabase
      .from("couple_aquarium_inventory")
      .select("id, entity_id, created_at")
      .eq("entity_id", entityId)
      .order("created_at", { ascending: true })
      .limit(qty);
    if (selErr) throw selErr;

    const ids = (rows ?? []).map((r: InvRow) => r.id);
    if (ids.length === 0) return;

    const { error: delErr } = await supabase
      .from("couple_aquarium_inventory")
      .delete()
      .in("id", ids);
    if (delErr) throw delErr;
  }

  /* -------- 실패 보상 지급 (요리 로직과 동일 RPC 사용) -------- */
  async function giveRandomFailOnce(): Promise<{
    id: number;
    name: string;
    emoji: string;
    price: number;
  }> {
    if (!coupleId) throw new Error("coupleId가 필요합니다.");
    const { data, error } = await supabase.rpc(
      "give_random_fail_to_inventory",
      { p_couple_id: coupleId }
    );
    if (error || !data || data.length === 0) {
      throw new Error(
        `랜덤 실패 아이템 지급 오류: ${error?.message ?? "no data"}`
      );
    }
    const f = data[0] as {
      id: number;
      name: string;
      emoji: string;
      price: number;
    };
    return f;
  }

  /* -------- 실행(재활용) -------- */
  const runRecycle = async () => {
    if (!bundle || selectedCount !== bundle) {
      toast.warning(`${bundle ?? "묶음"}개 정확히 담아주세요.`);
      return;
    }

    const entries = Object.entries(selected).map(([entity_id, qty]) => ({
      entity_id,
      qty,
    }));

    setLoading(true);
    try {
      // 1) 실제 삭제
      const jobs = entries.map((e) =>
        deleteAnyTankForEntity(e.entity_id, e.qty)
      );
      const res = await Promise.allSettled(jobs);
      const fail = res.filter((r) => r.status === "rejected").length;
      if (fail > 0) toast.error(`일부 삭제 실패: ${fail}건`);

      // 2) 실패 결과물 지급: 5개=1개, 10개=2개
      const failCount = bundle === 5 ? 1 : 2;
      const rewardsMap = new Map<number, FailReward>();
      for (let i = 0; i < failCount; i++) {
        const f = await giveRandomFailOnce();
        const prev = rewardsMap.get(f.id);
        if (prev) {
          rewardsMap.set(f.id, { ...prev, qty: prev.qty + 1 });
        } else {
          rewardsMap.set(f.id, {
            id: f.id,
            name: f.name,
            emoji: f.emoji,
            price: f.price,
            qty: 1,
            imageSrc: buildFailImageSrc(f.id),
          });
        }
      }
      const rewardsArr = Array.from(rewardsMap.values()).sort(
        (a, b) => a.id - b.id
      );
      setRewards(rewardsArr);
      setRewardOpen(true);

      clearAll();
      await load();
      toast.success("재활용 완료!");
    } catch (e) {
      console.error(e);
      toast.error(`재활용 중 오류가 발생했어요.`);
    } finally {
      setLoading(false);
    }
  };

  /* -------- 렌더 준비: 우측 선택 목록 -------- */
  const rightItems = useMemo(() => {
    const map = new Map(stock.map((s) => [s.entity_id, s]));
    return Object.entries(selected).map(([id, qty]) => {
      const base = map.get(id);
      return {
        id,
        name: base?.name_ko ?? id,
        rarity: base?.rarity ?? "일반",
        qty,
        max: base?.stock ?? qty,
        available: (base?.stock ?? 0) - qty,
      };
    });
  }, [selected, stock]);

  return (
    <section
      className={cn(
        "rounded-2xl border bg-white/70 backdrop-blur p-4 sm:p-5",
        className
      )}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-zinc-600">{description}</p>
        </div>
        <Badge className="rounded-full bg-zinc-100 text-zinc-700 border">
          {bundle ? `${selectedCount}/${bundle}` : "묶음 선택"}
        </Badge>
      </div>

      {/* 묶음 선택 바 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant={bundle === 5 ? "default" : "outline"}
          className="rounded-full h-9 px-4"
          onClick={() => {
            setBundle(5);
            if (selectedCount > 5) setSelected({});
          }}
          disabled={loading}
        >
          5개 묶음
        </Button>
        <Button
          variant={bundle === 10 ? "default" : "outline"}
          className="rounded-full h-9 px-4"
          onClick={() => {
            setBundle(10);
            if (selectedCount > 10) setSelected({});
          }}
          disabled={loading}
        >
          10개 묶음
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            className="rounded-full h-9 px-3"
            onClick={clearAll}
            disabled={loading || selectedCount === 0}
          >
            비우기
          </Button>
          <Button
            variant="destructive"
            className="rounded-full h-9 px-4"
            onClick={runRecycle}
            disabled={!bundle || selectedCount !== bundle || loading}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            분리수거 하기
          </Button>
        </div>
      </div>

      {/* 용량 진행도 */}
      <div className="mt-2">
        <Progress
          value={bundle ? Math.min(100, (selectedCount / bundle) * 100) : 0}
          className={cn("h-1.5 rounded-full")}
        />
        <div className="mt-1 text-[11px] text-zinc-500">
          {bundle
            ? filled
              ? "꽉 찼어요! 더 넣을 수 없어요."
              : `담을 수 있는 개수: ${capacityLeft.toLocaleString("ko-KR")}개`
            : "묶음을 먼저 선택하세요."}
        </div>
      </div>

      {/* 2-컬럼 레이아웃 */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 왼쪽: 재활용 가능한 인벤토리 (아이템 전체 클릭 = 토글) */}
        <Card className="p-3 sm:p-4 rounded-2xl bg-white/80 border">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-900">
              재활용 가능 목록
            </h3>
            {loading && (
              <span className="inline-flex items-center text-xs text-zinc-500">
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> 불러오는
                중…
              </span>
            )}
          </div>

          {stock.length === 0 ? (
            <div className="py-10 grid place-items-center text-center text-zinc-500 text-sm">
              <Gift className="w-5 h-5 mb-2 opacity-60" />
              재활용 가능한 항목이 없어요.
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {stock.map((s) => {
                const curSelected = selected[s.entity_id] ?? 0;
                const available = s.stock - curSelected; // 가상 남은 수량
                const canSelect = !!bundle && !filled && available > 0;
                const imgSrc = buildEntityImageSrc(s.entity_id, s.rarity);

                return (
                  <li key={s.entity_id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        curSelected > 0
                          ? removeAll(s.entity_id)
                          : toggleFromList(s)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          curSelected > 0
                            ? removeAll(s.entity_id)
                            : toggleFromList(s);
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-3 py-2 select-none",
                        "bg-white hover:bg-zinc-50 transition-colors",
                        "outline-none focus-visible:ring-2 focus-visible:ring-zinc-300",
                        curSelected > 0 &&
                          "ring-2 ring-emerald-300/60 border-emerald-200",
                        !canSelect &&
                          curSelected === 0 &&
                          "opacity-50 cursor-not-allowed",
                        canSelect && "cursor-pointer"
                      )}
                      aria-pressed={curSelected > 0}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={imgSrc}
                          alt={s.name_ko ?? s.entity_id}
                          className="size-9 rounded-md object-contain bg-white"
                          draggable={false}
                          onError={(ev) => {
                            (ev.currentTarget as HTMLImageElement).onerror =
                              null;
                            (ev.currentTarget as HTMLImageElement).src =
                              "/aquarium/placeholder.png";
                          }}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {s.name_ko ?? s.entity_id}
                          </div>
                          <div
                            className="mt-0.5 text-[11px] text-zinc-600"
                            title={`보유: ${s.stock.toLocaleString(
                              "ko-KR"
                            )} · 선택: ${curSelected.toLocaleString("ko-KR")}`}
                          >
                            남은 수량 {fmtQty(Math.max(0, available))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* 오른쪽: 고른 항목 */}
        <Card className="p-3 sm:p-4 rounded-2xl relative bg-white/80 border">
          <div className="absolute right-3 top-3">
            <Badge
              className={cn(
                "rounded-full px-3 py-1 text-xs",
                "bg-zinc-100 text-zinc-700 border"
              )}
            >
              {bundle ? `${selectedCount}/${bundle}` : "-"}
            </Badge>
          </div>

          <h3 className="text-sm font-medium text-zinc-900 mb-2">
            선택한 항목
          </h3>

          {rightItems.length === 0 ? (
            <div className="py-10 grid place-items-center text-center text-zinc-500 text-sm">
              <Gift className="w-5 h-5 mb-2 opacity-60" />
              아직 담은 항목이 없어요.
            </div>
          ) : (
            <ul className="space-y-2">
              {rightItems.map((it) => {
                const imgSrc = buildEntityImageSrc(it.id, it.rarity);
                const maxForItem = stockMap.get(it.id) ?? it.max;

                return (
                  <li
                    key={it.id}
                    className="flex items-center justify-between rounded-xl border bg-white px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={imgSrc}
                        alt={it.name}
                        className="size-9 rounded-md object-contain bg-white"
                        draggable={false}
                        onError={(ev) => {
                          (ev.currentTarget as HTMLImageElement).onerror = null;
                          (ev.currentTarget as HTMLImageElement).src =
                            "/aquarium/placeholder.png";
                        }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {it.name}
                        </div>
                        <div
                          className="text-[11px] text-zinc-600"
                          title={`보유: ${maxForItem.toLocaleString(
                            "ko-KR"
                          )} · 선택: ${it.qty.toLocaleString(
                            "ko-KR"
                          )} · 남음: ${Math.max(
                            0,
                            maxForItem - it.qty
                          ).toLocaleString("ko-KR")}`}
                        >
                          선택 {fmtQty(it.qty)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full h-8 w-8 p-0"
                        onClick={() => subOne(it.id)}
                        title="하나 빼기"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>

                      <Badge className="rounded-full px-3 py-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                        {fmtQty(it.qty)}
                      </Badge>

                      {/* 개수 올리기 (보유 수량 & 묶음 용량 한도) */}
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full h-8 w-8 p-0"
                        onClick={() => incOne(it.id)}
                        disabled={
                          !bundle ||
                          it.qty >= maxForItem || // 아이템 보유 수량 한도
                          selectedCount >= (bundle ?? 0) // 묶음 용량 한도
                        }
                        title="하나 더 담기"
                      >
                        +
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full h-8 px-2"
                        onClick={() => removeAll(it.id)}
                        title="모두 제거"
                      >
                        제거
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* 🎁 보상 다이얼로그 */}
      <Dialog open={rewardOpen} onOpenChange={setRewardOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>재활용 보상</DialogTitle>
          </DialogHeader>

          {rewards.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground text-center">
              지급된 아이템이 없어요.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {rewards.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border p-2.5 bg-white/80"
                >
                  <div className="relative">
                    <img
                      src={r.imageSrc}
                      alt={r.name}
                      className="size-12 rounded-md object-contain bg-white"
                      draggable={false}
                      onError={(ev) => {
                        (ev.currentTarget as HTMLImageElement).style.display =
                          "none";
                        const holder = ev.currentTarget
                          .nextElementSibling as HTMLDivElement;
                        if (holder) holder.style.display = "grid";
                      }}
                    />
                    <div
                      className="hidden place-items-center size-12 rounded-md bg-zinc-50 text-2xl select-none"
                      aria-hidden
                    >
                      {r.emoji}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-[11px] text-zinc-600">
                      {fmtQty(r.qty)} · 🪙 {r.price.toLocaleString("ko-KR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-right">
            <Button onClick={() => setRewardOpen(false)}>확인</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
