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

/* icons */
import {
  Sparkles,
  ShieldCheck,
  Trash2,
  Plus,
  Minus,
  Gift,
  Loader2,
} from "lucide-react";

/* =========================
   타입
========================= */
type InvRow = { id: string; entity_id: string; created_at: string };
type EntityMeta = { id: string; name_ko: string | null; price: number | null };

type StockEntry = {
  entity_id: string;
  name_ko: string | null;
  stock: number; // 내 보유량(=쓰레기 수량)
};

type SelectMap = Record<string, number>; // entity_id -> qty

/* =========================
   유틸
========================= */
const randInt = (a: number, b: number) => (Math.random() * (b - a + 1) + a) | 0;

/* =========================
   메인
========================= */
export default function RecyclingStation({
  className,
  title = "♻️ 분리수거장",
  description = "5개 또는 10개를 담아 재활용하면 감자를 받아요. 아래 묶음을 먼저 고르세요",
}: {
  className?: string;
  title?: string;
  description?: string;
}) {
  const { couple, addPotatoes } = useCoupleContext();
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

  /* -------- 데이터 로드 --------
     1) couple_aquarium_inventory에서 entity_id만 불러와 집계
     2) id 리스트로 aquarium_entities 조회 → price ≤ 10만 필터 (UI에는 가격 미표시)
  -------------------------------- */
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
        counter.set(r.entity_id, (counter.get(r.entity_id) ?? 0) + 1);
      }
      const ids = Array.from(counter.keys());
      if (ids.length === 0) {
        setStock([]);
        return;
      }

      const { data: ents, error: entErr } = await supabase
        .from("aquarium_entities")
        .select("id, name_ko, price")
        .in("id", ids);
      if (entErr) throw entErr;

      const metaMap = new Map<string, EntityMeta>();
      for (const e of ents ?? []) {
        metaMap.set(String(e.id), {
          id: String(e.id),
          name_ko: (e as any).name_ko ?? null,
          price: (e as any).price ?? null,
        });
      }

      const out: StockEntry[] = [];
      for (const id of ids) {
        const meta = metaMap.get(id);
        if (!meta) continue;
        const price = Number(meta.price ?? 0);
        if (!Number.isFinite(price) || price > 10) continue; // 쓰레기 판정
        out.push({
          entity_id: id,
          name_ko: meta.name_ko,
          stock: counter.get(id)!,
        });
      }

      out.sort((a, b) =>
        (a.name_ko ?? a.entity_id).localeCompare(b.name_ko ?? b.entity_id, "ko")
      );
      setStock(out);
    } catch (e: any) {
      console.error(e);
      toast.error("쓰레기 인벤토리를 불러오지 못했어요.");
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

  /* -------- 선택/해제 -------- */
  const addOne = (s: StockEntry) => {
    if (!bundle) {
      toast.info("먼저 5개 또는 10개 묶음을 선택하세요.");
      return;
    }
    if (filled) return;
    setSelected((prev) => {
      const cur = prev[s.entity_id] ?? 0;
      if (cur >= s.stock) return prev;
      if (selectedCount >= capacity) return prev;
      return { ...prev, [s.entity_id]: cur + 1 };
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

  /* -------- 삭제: 엔티티별로 원하는 개수만큼 행을 찾아 삭제 -------- */
  async function deleteAnyTankForEntity(entityId: string, qty: number) {
    // 1) 대상 행 id 조회 (오래된 것부터 우선 제거)
    const { data: rows, error: selErr } = await supabase
      .from("couple_aquarium_inventory")
      .select("id, entity_id, created_at")
      .eq("entity_id", entityId)
      .order("created_at", { ascending: true })
      .limit(qty);
    if (selErr) throw selErr;

    const ids = (rows ?? []).map((r: InvRow) => r.id);
    if (ids.length === 0) return;

    // 2) 해당 id들 삭제
    const { error: delErr } = await supabase
      .from("couple_aquarium_inventory")
      .delete()
      .in("id", ids);
    if (delErr) throw delErr;
  }

  /* -------- 실행 -------- */
  const runRecycle = async () => {
    if (!bundle || selectedCount !== bundle) {
      toast.warning(`${bundle ?? "묶음"}개 정확히 담아주세요.`);
      return;
    }

    // ✅ 총 보상만 랜덤:
    // - 5묶음: 1~5
    // - 10묶음: 6~10
    const totalPotatoes = bundle === 5 ? randInt(1, 5) : randInt(6, 10);

    const entries = Object.entries(selected).map(([entity_id, qty]) => ({
      entity_id,
      qty,
    }));

    setLoading(true);
    try {
      // 1) 실제 삭제 (각 엔티티별로 필요한 개수만큼 행을 찾아 제거)
      const jobs = entries.map((e) =>
        deleteAnyTankForEntity(e.entity_id, e.qty)
      );
      const res = await Promise.allSettled(jobs);
      const fail = res.filter((r) => r.status === "rejected").length;
      if (fail > 0) toast.error(`일부 삭제 실패: ${fail}건`);

      // 2) 감자 지급 (총합 1회 지급)
      const { error } = await addPotatoes(totalPotatoes);
      if (error) toast.error(error.message || "감자 지급 실패");
      else
        toast.success(
          `재활용 완료! 🥔 ${totalPotatoes.toLocaleString("ko-KR")}`
        );

      clearAll();
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(`재활용 중 오류가 발생했어요.`);
    } finally {
      setLoading(false);
    }
  };

  /* -------- 렌더 -------- */
  const rightItems = useMemo(() => {
    const map = new Map(stock.map((s) => [s.entity_id, s]));
    return Object.entries(selected).map(([id, qty]) => ({
      id,
      name: map.get(id)?.name_ko ?? id,
      qty,
      max: map.get(id)?.stock ?? qty,
    }));
  }, [selected, stock]);

  return (
    <section
      className={cn(
        "rounded-2xl border bg-white/90 backdrop-blur shadow-sm p-4 sm:p-5",
        className
      )}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-zinc-600 mt-0.5">{description}</p>
        </div>
      </div>

      {/* 묶음 선택 바 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant={bundle === 5 ? "default" : "outline"}
          className="rounded-full h-9 px-4"
          onClick={() => {
            setBundle(5);
            if (selectedCount > 5) setSelected({}); // 넘쳤다면 초기화
          }}
          disabled={loading}
        >
          5️⃣개 묶음
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
          🔟개 묶음
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
          className={cn(
            "h-2 rounded-full",
            filled && "ring-2 ring-violet-300/60"
          )}
        />
        <div className="mt-1 text-[11px] text-zinc-500">
          {bundle
            ? filled
              ? "꽉 찼어요! 더 넣을 수 없어요."
              : `담을 수 있는 개수: ${capacityLeft}개`
            : "묶음을 먼저 선택하세요."}
        </div>
      </div>

      {/* 2-컬럼 레이아웃 */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 왼쪽: 내 쓰레기 인벤토리 */}
        <Card className="p-3 sm:p-4 rounded-2xl">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">
              내 쓰레기 인벤토리
            </h3>
            {loading && (
              <span className="inline-flex items-center text-xs text-zinc-500">
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> 불러오는
                중…
              </span>
            )}
          </div>

          {stock.length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center">
              분리수거할 쓰레기가 없어요.
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {stock.map((s) => {
                const cur = selected[s.entity_id] ?? 0;
                const disabled = !bundle || filled || cur >= s.stock;
                return (
                  <li
                    key={s.entity_id}
                    className={cn(
                      "flex items-center justify-between rounded-xl border bg-white/70 px-3 py-2",
                      cur > 0 && "ring-2 ring-emerald-300/60"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {s.name_ko ?? s.entity_id}
                      </div>
                      {/* 🔶 보유 수량 강조 배지 */}
                      <Badge className="mt-0.5 rounded-full px-2.5 py-0.5 text-[11px] bg-amber-50 text-amber-800 border-amber-200">
                        보유 {s.stock}개
                      </Badge>
                    </div>
                    {/* ➕ 아이콘만 */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-8 w-8 p-0"
                      onClick={() => addOne(s)}
                      disabled={disabled}
                      title="담기"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* 오른쪽: 고른 쓰레기 */}
        <Card className="p-3 sm:p-4 rounded-2xl relative">
          {/* 상단 우측 카운터 뱃지 */}
          <div className="absolute right-3 top-3">
            <Badge
              className={cn(
                "rounded-full px-3 py-1 text-xs",
                filled
                  ? "bg-violet-600 text-white"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200"
              )}
            >
              {selectedCount} / {bundle ?? "-"}
            </Badge>
          </div>

          <h3 className="text-sm font-semibold text-zinc-900 mb-2">
            고른 쓰레기
          </h3>

          {rightItems.length === 0 ? (
            <div className="py-10 grid place-items-center text-center text-zinc-500 text-sm">
              <Gift className="w-5 h-5 mb-2 opacity-60" />
              아직 고른 쓰레기가 없어요.
            </div>
          ) : (
            <ul className="space-y-2">
              {rightItems.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between rounded-xl border bg-white/70 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {it.name}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      선택 {it.qty}개
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-8 w-8 p-0"
                      onClick={() => subOne(it.id)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Badge className="rounded-full px-3 py-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                      {it.qty}
                    </Badge>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-8 w-8 p-0"
                      onClick={() =>
                        addOne({
                          entity_id: it.id,
                          name_ko: it.name,
                          stock: it.max,
                        })
                      }
                      disabled={!bundle || filled || it.qty >= it.max}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full h-8 px-2"
                      onClick={() => removeAll(it.id)}
                    >
                      제거
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
