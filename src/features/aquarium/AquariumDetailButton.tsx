"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Info,
  X,
  BadgeDollarSign,
  AlertTriangle,
  Search,
  MoveRight,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { emitAquariumUpdated } from "./aquarium";
import {
  BulkMoveDialog,
  BulkSellDialog,
  type BulkSelectEntry,
} from "./Bulk-actions";
import { usePortalTarget } from "./usePortalTarget";

/* ---------- Types / helpers ---------- */
export type FishRarity = "일반" | "희귀" | "에픽" | "전설";
type RarityFilter = "전체" | FishRarity;

const rarityDir = (r: FishRarity) =>
  r === "일반"
    ? "common"
    : r === "희귀"
    ? "rare"
    : r === "에픽"
    ? "epic"
    : "legend";

const buildImageSrc = (id: string, rarity: FishRarity) =>
  `/aquarium/${rarityDir(rarity)}/${id}.png`;

const RARITY_CARD_CLASS: Record<FishRarity, string> = {
  일반: "bg-neutral-50/80 border-neutral-200 text-slate-800",
  희귀: "bg-sky-50/80 border-sky-200 text-slate-800",
  에픽: "bg-violet-50/80 border-violet-200 text-slate-800",
  전설: "bg-amber-50/80 border-amber-200 text-slate-800",
};
const RARITY_IMG_RING: Record<FishRarity, string> = {
  일반: "ring-neutral-200 hover:ring-neutral-300 focus:ring-2 focus:ring-neutral-400/60",
  희귀: "ring-sky-200 hover:ring-sky-300 focus:ring-2 focus:ring-sky-400/60",
  에픽: "ring-violet-200 hover:ring-violet-300 focus:ring-2 focus:ring-violet-400/60",
  전설: "ring-amber-200 hover:ring-amber-300 focus:ring-2 focus:ring-amber-400/60",
};
function RarityBadge({ r }: { r: FishRarity }) {
  const cls =
    r === "일반"
      ? "bg-neutral-100 text-neutral-800 border-neutral-200"
      : r === "희귀"
      ? "bg-sky-100 text-sky-900 border-sky-200"
      : r === "에픽"
      ? "bg-violet-100 text-violet-900 border-violet-200"
      : "bg-amber-100 text-amber-900 border-amber-200";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl border px-2 py-0.5 text-[11px] font-semibold",
        cls
      )}
    >
      {r}
    </span>
  );
}

/* ---------- Component ---------- */
export default function AquariumDetailButton({
  tankNo,
  className,
  buttonLabel = "아쿠아리움 관리하기",
}: {
  tankNo: number;
  className?: string;
  buttonLabel?: string;
}) {
  const { couple } = useCoupleContext();
  const { user } = useUser();
  const coupleId = couple?.id ?? null;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("전체");
  const [searchText, setSearchText] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<
    Array<{
      id: string;
      label: string;
      rarity: FishRarity;
      price: number;
      count: number;
      image: string;
    }>
  >([]);

  // 개별 판매 모달
  const [confirm, setConfirm] = useState<{
    entityId: string;
    label: string;
    image: string;
    rarity: FishRarity;
    unitSell: number;
    countBefore: number;
    qty: number;
  } | null>(null);

  // 개별 이동 모달
  const [moveDlg, setMoveDlg] = useState<{
    entityId: string;
    label: string;
    image: string;
    countBefore: number;
    toTank?: number;
    qty: number;
    tanks: Array<{ tank_no: number; title: string; fish_cnt: number }>;
  } | null>(null);

  // 미리보기
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(
    null
  );

  // ✅ 선택모드 & 선택 목록

  const [selected, setSelected] = useState<Record<string, number>>({});
  const selectedCount = useMemo(() => Object.keys(selected).length, [selected]);
  const selectedItems: BulkSelectEntry[] = useMemo(() => {
    const map = new Map(items.map((i) => [i.id, i]));
    return Object.keys(selected)
      .map((id) => {
        const it = map.get(id);
        if (!it) return null;
        return {
          id,
          label: it.label,
          image: it.image,
          count: it.count,
          price: it.price,
          qty: Math.min(selected[id] ?? 1, it.count),
        } as BulkSelectEntry;
      })
      .filter(Boolean) as BulkSelectEntry[];
  }, [selected, items]);
  function toggleSelect(it: { id: string; count: number }) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[it.id]) delete next[it.id];
      else next[it.id] = Math.min(1, it.count);
      return next;
    });
  }
  function clearSelection() {
    setSelected({});
  }
  const [tankOptions, setTankOptions] = useState<
    Array<{ tank_no: number; title: string; fish_cnt: number }>
  >([]);

  // 일괄 모달
  const [bulkSellOpen, setBulkSellOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);

  useEffect(() => {
    if (!bulkMoveOpen || !coupleId) return;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_couple_tanks", {
          p_couple_id: coupleId,
        });
        if (error) throw error;
        setTankOptions(
          (data ?? []) as Array<{
            tank_no: number;
            title: string;
            fish_cnt: number;
          }>
        );
      } catch (e) {
        console.warn("get_couple_tanks 실패:", e);
        setTankOptions([]);
      }
    })();
  }, [bulkMoveOpen, coupleId]);

  // body scroll lock
  useEffect(() => {
    if (open || confirm || preview || moveDlg || bulkSellOpen || bulkMoveOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open, confirm, preview, moveDlg, bulkSellOpen, bulkMoveOpen]);

  useEffect(() => {
    if (open) {
      void loadSummary();
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearchText("");
    }
  }, [open]);

  async function loadSummary() {
    if (!coupleId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_tank_entities", {
        p_couple_id: coupleId,
        p_tank_no: tankNo,
      });
      if (error) throw error;

      const rows = (data ?? []) as Array<{
        entity_id: string;
        name_ko: string | null;
        rarity: string;
        price: number;
        cnt: number;
      }>;

      const mapped = rows.map((r) => {
        const rarity = (r.rarity as FishRarity) ?? "일반";
        const price = Number(r.price ?? 0);
        return {
          id: r.entity_id,
          label: r.name_ko ?? r.entity_id,
          rarity,
          price,
          count: Number(r.cnt ?? 0),
          image: buildImageSrc(r.entity_id, rarity),
        };
      });

      const rarityRank: Record<FishRarity, number> = {
        일반: 3,
        희귀: 2,
        에픽: 1,
        전설: 0,
      };
      const priceNum = (n: number) =>
        typeof n === "number" && isFinite(n) ? n : Number.POSITIVE_INFINITY;

      mapped.sort((a, b) => {
        const pa = priceNum(a.price);
        const pb = priceNum(b.price);
        if (pa !== pb) return pa - pb;
        const rr = rarityRank[a.rarity] - rarityRank[b.rarity];
        if (rr !== 0) return rr;
        return a.label.localeCompare(b.label, "ko");
      });

      setItems(mapped);
    } catch (e: any) {
      console.error(e);
      toast.error("어항 정보를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  // 필터 + 검색
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return items.filter((it) => {
      const okR = rarityFilter === "전체" || it.rarity === rarityFilter;
      const okS = !q || it.label.toLowerCase().includes(q);
      return okR && okS;
    });
  }, [items, rarityFilter, searchText]);

  // 일괄 판매 실행
  const onBulkSell = async (entries: BulkSelectEntry[]) => {
    if (!coupleId || entries.length === 0) return;
    try {
      setLoading(true);
      const jobs = entries.map((it) =>
        supabase
          .rpc("sell_fish_from_tank", {
            p_couple_id: coupleId,
            p_tank_no: tankNo,
            p_entity_id: it.id,
            p_qty: Math.min(it.qty, it.count),
          })
          .then(({ error }) => {
            if (error) throw error;
          })
      );
      const results = await Promise.allSettled(jobs);
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      toast.success(`판매 완료: 성공 ${ok} / 실패 ${fail}`);
      await loadSummary();
      emitAquariumUpdated(coupleId, tankNo);
      setBulkSellOpen(false);

      clearSelection();
    } catch (e: any) {
      console.error(e);
      toast.error(`판매 실패: ${e.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  // 일괄 이동 실행
  const onBulkMove = async (entries: BulkSelectEntry[], toTank: number) => {
    if (!coupleId || entries.length === 0) return;
    try {
      setLoading(true);
      const jobs = entries.map((it) =>
        supabase
          .rpc("move_fish_between_tanks", {
            p_couple_id: coupleId,
            p_entity_id: it.id,
            p_from_tank: tankNo,
            p_qty: Math.min(it.qty, it.count),
            p_to_tank: toTank,
          })
          .then(({ error }) => {
            if (error) throw error;
          })
      );
      const results = await Promise.allSettled(jobs);
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      toast.success(`이동 완료: 성공 ${ok} / 실패 ${fail}`);
      await loadSummary();
      emitAquariumUpdated(coupleId, tankNo);
      setBulkMoveOpen(false);

      clearSelection();
    } catch (e: any) {
      console.error(e);
      toast.error(`이동 실패: ${e.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */
  const portalTarget = usePortalTarget();
  const totalCount = items.reduce((a, b) => a + b.count, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "rounded-full bg-[#FAF7F2] backdrop-blur px-3 py-1.5",
          "text-sm font-semibold text-slate-800 shadow border hover:bg-white",
          "inline-flex items-center gap-1",
          className
        )}
        title={`${tankNo}번 아쿠아리움 상세보기`}
      >
        <Info className="w-4 h-4" />
        {buttonLabel}
      </button>

      {/* 상세 모달 */}
      {portalTarget &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-[80] flex items-center justify-center bg-black/50 transition-opacity",
              open
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            )}
            onClick={() => setOpen(false)}
            aria-hidden={!open}
          >
            <div
              className={cn(
                "w-[1000px] max-w-[95vw] max-h-[85vh] overflow-auto rounded-2xl bg-[#FAF7F2] p-5 shadow-xl relative transition-transform",
                open ? "scale-100" : "scale-95"
              )}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 -mx-5 px-5 pt-4 pb-3 mb-4 bg-[#FAF7F2] backdrop-blur border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{tankNo}번 아쿠아리움</h3>
                    <span className="text-sm text-slate-600 inline-flex items-center gap-1">
                      <span role="img" aria-label="물고기">
                        🐟
                      </span>
                      <b>{totalCount}</b>마리
                    </span>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-md border hover:bg-gray-50"
                    aria-label="닫기"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 검색 & 희귀도 & 선택모드/일괄액션 */}
                <div className="mt-3 flex items-center  gap-3">
                  {/* 검색 */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchRef}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="어종 이름 검색 ( / )"
                      className="pl-7 pr-2 py-1.5 text-sm border rounded-md bg-white w-[220px]"
                    />
                  </div>

                  {/* 희귀도 */}
                  <div className=" flex items-center gap-2">
                    <select
                      id="rarityFilter"
                      value={rarityFilter}
                      onChange={(e) =>
                        setRarityFilter(e.target.value as RarityFilter)
                      }
                      className="text-sm border rounded-md px-2 py-1 bg-white"
                    >
                      <option value="전체">전체</option>
                      <option value="일반">일반</option>
                      <option value="희귀">희귀</option>
                      <option value="에픽">에픽</option>
                      <option value="전설">전설</option>
                    </select>
                  </div>
                  {/* 일괄 버튼(상시 표시) */}
                  <div className="mt-2 flex items-center gap-2 ml-auto">
                    <div className="ms-auto flex items-center gap-2">
                      <span className="text-sm text-slate-600">
                        선택: <b>{selectedCount}</b>개
                      </span>
                      <Button
                        variant="outline"
                        className="h-8 px-3 text-sm border-rose-300 text-rose-800 hover:bg-rose-50"
                        disabled={selectedCount === 0 || loading}
                        onClick={() => setBulkSellOpen(true)}
                      >
                        <BadgeDollarSign className="w-4 h-4 mr-1" />
                        판매
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 px-3 text-sm border-sky-300 text-sky-800 hover:bg-sky-50"
                        disabled={selectedCount === 0 || loading}
                        onClick={() => setBulkMoveOpen(true)}
                      >
                        <MoveRight className="w-4 h-4 mr-1" />
                        이동
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              {loading ? (
                <div className="py-16 text-center text-slate-600">
                  불러오는 중…
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-slate-600">
                  표시할 물고기가 없어요.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {filtered.map((it) => (
                    <div
                      key={it.id}
                      className={cn(
                        "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border p-3",
                        RARITY_CARD_CLASS[it.rarity]
                      )}
                    >
                      {/* thumb */}
                      <button
                        type="button"
                        className={cn(
                          "group relative w-24 h-20 sm:w-28 sm:h-24 rounded-xl",
                          "bg-white/85 backdrop-blur-[2px] shadow-sm overflow-hidden ring-1",
                          RARITY_IMG_RING[it.rarity],
                          "cursor-pointer"
                        )}
                        onClick={() => toggleSelect(it)}
                      >
                        <span className="absolute top-1 right-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold px-1.5 py-0.5 shadow ring-1 ring-white/80">
                          x{it.count}
                        </span>

                        {selected[it.id] && (
                          <span
                            className={cn(
                              "absolute left-1 top-1 inline-flex items-center justify-center",
                              "rounded-md bg-emerald-600/95 text-white ring-1 ring-white/80",
                              "w-6 h-6"
                            )}
                            title="선택됨"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        )}
                        <img
                          src={it.image}
                          alt={it.label}
                          className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.06]"
                          draggable={false}
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/5 to-transparent" />
                      </button>

                      {/* text */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold truncate">
                            {it.label}
                          </div>
                          <RarityBadge r={it.rarity} />
                        </div>
                        <div className="mt-1.5 flex items-center gap-3 text-[12px] text-gray-700">
                          <span className="inline-flex items-center gap-1">
                            <BadgeDollarSign className="w-3.5 h-3.5" />
                            판매가{" "}
                            <b className="text-amber-700 ml-0.5">
                              {Math.floor(it.price / 2).toLocaleString("ko-KR")}
                            </b>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>,
          portalTarget
        )}

      {/* ✅ 선택 일괄 판매 */}
      <BulkSellDialog
        open={bulkSellOpen}
        onOpenChange={setBulkSellOpen}
        entries={selectedItems}
        onChangeQty={(id, qty) =>
          setSelected((prev) => ({ ...prev, [id]: qty }))
        }
        onConfirm={onBulkSell}
      />

      {/* ✅ 선택 일괄 이동 (확정 버튼 비올렛톤 포함) */}
      <BulkMoveDialog
        open={bulkMoveOpen}
        onOpenChange={setBulkMoveOpen}
        entries={selectedItems}
        onChangeQty={(id, qty) =>
          setSelected((prev) => ({ ...prev, [id]: qty }))
        }
        tankOptions={tankOptions}
        currentTankNo={tankNo}
        onConfirm={onBulkMove}
      />
    </>
  );
}
