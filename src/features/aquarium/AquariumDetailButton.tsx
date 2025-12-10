// src/features/aquarium/AquariumDetailButton.tsx
"use client";

import { useEffect, useMemo, useState, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Info,
  X,
  BadgeDollarSign,
  MoveRight,
  CheckCircle,
  ArrowUpDown,
  Minus,
  Plus,
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
type SortKey = "가격" | "희귀도" | "이름";
type SortDir = "asc" | "desc";

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
  일반: "bg-neutral-50/80 border-neutral-200",
  희귀: "bg-sky-50/80 border-sky-200",
  에픽: "bg-violet-50/80 border-violet-200",
  전설: "bg-amber-50/80 border-amber-200",
};

const RARITY_IMG_RING: Record<FishRarity, string> = {
  일반: "ring-neutral-200 hover:ring-neutral-300 focus:ring-2 focus:ring-neutral-400/60",
  희귀: "ring-sky-200 hover:ring-sky-300 focus:ring-2 focus:ring-sky-400/60",
  에픽: "ring-violet-200 hover:ring-violet-300 focus:ring-2 focus:ring-violet-400/60",
  전설: "ring-amber-200 hover:ring-amber-300 focus:ring-2 focus:ring-amber-400/60",
};

const RARITY_RANK: Record<FishRarity, number> = {
  전설: 3,
  에픽: 2,
  희귀: 1,
  일반: 0,
};

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

  /** 필터/정렬 */
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("전체");
  const [sortKey, setSortKey] = useState<SortKey>("가격");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const toggleSortDir = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));

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

  // 선택/일괄
  const [selected, setSelected] = useState<Record<string, number>>({});
  const selectedCount = useMemo(() => Object.keys(selected).length, [selected]);

  const selectedItems: BulkSelectEntry[] = useMemo(() => {
    if (!items.length || !selectedCount) return [];
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
  }, [selected, selectedCount, items]);

  function toggleSelect(it: { id: string; count: number }) {
    if (!it.count) return;
    setSelected((prev) => {
      const next = { ...prev };
      if (next[it.id]) delete next[it.id];
      else next[it.id] = 1; // 기본 1개 선택
      return next;
    });
  }

  const updateSelectedQty = (id: string, qty: number, max: number) =>
    setSelected((p) => ({
      ...p,
      [id]: Math.min(max, Math.max(1, Math.floor(qty || 1))),
    }));

  function clearSelection() {
    setSelected({});
  }

  // 일괄 이동용 탱크 목록
  const [tankOptions, setTankOptions] = useState<
    Array<{ tank_no: number; title: string; fish_cnt: number }>
  >([]);

  // 일괄 모달
  const [bulkSellOpen, setBulkSellOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);

  // body scroll lock
  useEffect(() => {
    if (open || bulkSellOpen || bulkMoveOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open, bulkSellOpen, bulkMoveOpen]);

  // 요약 로드
  useEffect(() => {
    if (!open || !coupleId) return;

    (async () => {
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

        setItems(mapped);
        setSelected({});
      } catch (e: any) {
        console.error(e);
        toast.error("어항 정보를 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, coupleId, tankNo]);

  // 필터 + 정렬
  const filtered = useMemo(() => {
    let arr = items.filter(
      (it) => rarityFilter === "전체" || it.rarity === rarityFilter
    );

    arr.sort((a, b) => {
      let res = 0;
      if (sortKey === "가격") res = (a.price ?? 0) - (b.price ?? 0);
      else if (sortKey === "희귀도")
        res = RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity];
      else res = a.label.localeCompare(b.label, "ko");
      return sortDir === "asc" ? res : -res;
    });
    return arr;
  }, [items, rarityFilter, sortKey, sortDir]);

  // 일괄 판매 실행
  const onBulkSell = async (entries: BulkSelectEntry[]) => {
    if (!coupleId || entries.length === 0) return;
    setBulkSellOpen(false);
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
      // 최신 상태로 갱신
      if (open) {
        // 모달 열려 있으면만 재로딩
        const { data, error } = await supabase.rpc("get_tank_entities", {
          p_couple_id: coupleId,
          p_tank_no: tankNo,
        });
        if (!error) {
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
          setItems(mapped);
        }
      }
      emitAquariumUpdated(coupleId, tankNo);
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
    setBulkMoveOpen(false);
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
      if (open) {
        const { data, error } = await supabase.rpc("get_tank_entities", {
          p_couple_id: coupleId,
          p_tank_no: tankNo,
        });
        if (!error) {
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
          setItems(mapped);
        }
      }
      emitAquariumUpdated(coupleId, tankNo);
      clearSelection();
    } catch (e: any) {
      console.error(e);
      toast.error(`이동 실패: ${e.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  // 하단 액션바 예상 판매가
  const estimated = useMemo(
    () =>
      selectedItems.reduce(
        (sum, x) => sum + Math.floor((x.price ?? 0) / 2) * (x.qty ?? 1),
        0
      ),
    [selectedItems]
  );

  // 탱크 옵션 로드 (이동 다이얼로그 열릴 때)
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

  /* ---------- UI ---------- */
  const portalTarget = usePortalTarget();
  const totalCount = items.reduce((a, b) => a + b.count, 0);

  return (
    <>
      {/* 트리거 버튼 */}
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
      {open &&
        portalTarget &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-[80] flex items-center justify-center",
              "bg-black/50"
            )}
            onClick={() => setOpen(false)}
            aria-hidden={!open}
          >
            <div
              className={cn(
                "w-[1100px] max-w-[96vw]",
                // ✅ 높이 고정 느낌: viewport 기준으로 88vh를 넘지 않으면서, 기본 720px 정도
                "h-[min(720px,88vh)]",
                "overflow-hidden rounded-2xl bg-[#FAF7F2] p-5 shadow-xl relative",
                "transition-transform",
                "flex flex-col"
              )}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* ------------ Header (고정 높이, 스크롤 밖) ------------ */}
              <div className="shrink-0 -mx-5 px-5 pt-4 pb-3 mb-2 bg-[#FAF7F2]/95 border-b border-gray-100">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{tankNo}번 아쿠아리움</h3>
                    <span className="text-sm text-slate-600 inline-flex items-center gap-1">
                      🐟 <b>{totalCount}</b>마리
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOpen(false)}
                      className="p-1.5 rounded-md border hover:bg-gray-50"
                      aria-label="닫기"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 컨트롤 바: 희귀도 필터 / 정렬 */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(["전체", "일반", "희귀", "에픽", "전설"] as const).map(
                    (r) => (
                      <button
                        key={r}
                        onClick={() => setRarityFilter(r)}
                        className={cn(
                          "h-8 rounded-full px-3 text-sm border",
                          rarityFilter === r
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white hover:bg-slate-50"
                        )}
                      >
                        {r}
                      </button>
                    )
                  )}

                  {/* 정렬 */}
                  <div className="ml-auto flex items-center gap-1">
                    {(["가격", "희귀도", "이름"] as const).map((k) => (
                      <button
                        key={k}
                        onClick={() => setSortKey(k)}
                        className={cn(
                          "h-8 rounded-full px-3 text-sm border inline-flex items-center gap-1",
                          sortKey === k
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white hover:bg-slate-50"
                        )}
                      >
                        {k}
                        {sortKey === k && (
                          <ArrowUpDown
                            className={cn(
                              "w-4 h-4",
                              sortDir === "desc" && "rotate-180 transition"
                            )}
                          />
                        )}
                      </button>
                    ))}
                    <Button
                      variant="outline"
                      className="h-8 px-3 text-sm inline-flex items-center gap-1"
                      onClick={toggleSortDir}
                      title="정렬 방향 전환"
                    >
                      정렬 {sortDir === "asc" ? "↑" : "↓"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* ------------ Body (여기만 스크롤) ------------ */}
              <div className="flex-1 overflow-y-auto pr-1">
                {loading ? (
                  <div className="py-16 text-center text-slate-600">
                    불러오는 중…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center text-slate-600">
                    표시할 물고기가 없어요.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 pb-3">
                    {filtered.map((it) => {
                      const isSelected = !!selected[it.id];
                      const qty = selected[it.id] ?? 1;
                      return (
                        <div
                          key={it.id}
                          role="listitem"
                          className={cn(
                            "rounded-2xl border p-3",
                            "bg-white/60 backdrop-blur-sm shadow-sm",
                            RARITY_CARD_CLASS[it.rarity],
                            isSelected && "ring-2 ring-emerald-400/60 shadow-md"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {/* Thumb */}
                            <button
                              type="button"
                              className={cn(
                                "group relative w-28 h-24 rounded-xl",
                                "bg-white/85 backdrop-blur-[2px] shadow-sm overflow-hidden ring-1",
                                RARITY_IMG_RING[it.rarity],
                                "cursor-pointer"
                              )}
                              onClick={() => toggleSelect(it)}
                              aria-pressed={isSelected}
                              title={isSelected ? "선택 해제" : "선택"}
                            >
                              {/* 보유 수량 */}
                              <span className="absolute top-1.5 right-1.5 rounded-full bg-black/60 text-white text-[11px] font-semibold px-2 py-[2px] shadow">
                                x {it.count}
                              </span>

                              {/* 선택 체크 */}
                              {isSelected && (
                                <span
                                  className={cn(
                                    "absolute left-1.5 top-1.5 inline-flex items-center justify-center",
                                    "rounded-md bg-emerald-600/95 text-white ring-1 ring-white/80 w-6 h-6 shadow"
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

                              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-black/10 to-transparent" />
                            </button>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 truncate">
                                {it.label}
                              </div>

                              {/* 가격 */}
                              <div className="mt-1.5 text-[12px] text-gray-700 tabular-nums">
                                판매가{" "}
                                <b className="text-amber-700">
                                  {Math.floor(
                                    (it.price ?? 0) / 2
                                  ).toLocaleString("ko-KR")}
                                </b>
                              </div>

                              {/* 선택된 경우에만 스텝퍼 노출 */}
                              <div
                                className={cn(
                                  "mt-2 inline-flex items-center gap-1 rounded-full border bg-white/70 backdrop-blur px-1.5 py-1 shadow-sm",
                                  !isSelected && "opacity-0 pointer-events-none"
                                )}
                              >
                                <button
                                  className="h-7 w-7 grid place-items-center rounded-full border bg-white hover:bg-slate-50"
                                  onClick={() =>
                                    updateSelectedQty(it.id, qty - 1, it.count)
                                  }
                                  aria-label="감소"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="px-2 text-sm font-semibold">
                                  {qty}
                                </span>
                                <button
                                  className="h-7 w-7 grid place-items-center rounded-full border bg-white hover:bg-slate-50"
                                  onClick={() =>
                                    updateSelectedQty(it.id, qty + 1, it.count)
                                  }
                                  aria-label="증가"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ------------ Footer (항상 모달 하단에 고정) ------------ */}
              {selectedCount > 0 && (
                <div className="shrink-0 pt-2 pb-1">
                  <div
                    className={cn(
                      "mx-auto w-fit max-w-[calc(100%-24px)]",
                      "rounded-[28px] border shadow-xl backdrop-blur-xl",
                      "bg-[linear-gradient(180deg,rgba(255,255,255,.88),rgba(255,255,255,.70))]",
                      "px-4 sm:px-6 py-3 sm:py-3.5",
                      "flex flex-wrap items-center gap-2 sm:gap-3"
                    )}
                  >
                    <span className="text-sm sm:text-base font-semibold text-slate-800">
                      ✨ 선택 <b>{selectedCount}</b>개
                    </span>
                    <span className="text-sm sm:text-base text-slate-600">
                      예상 판매가{" "}
                      <b className="text-amber-700 tabular-nums">
                        {estimated.toLocaleString("ko-KR")}G
                      </b>
                    </span>

                    <div className="h-5 w-px bg-slate-200 mx-1 sm:mx-2" />

                    <Button
                      variant="outline"
                      className="h-9 sm:h-10 px-4 sm:px-5 text-sm sm:text-base border-sky-300 text-sky-800 hover:bg-sky-50 rounded-full"
                      disabled={loading}
                      onClick={() => setBulkMoveOpen(true)}
                    >
                      <MoveRight className="w-4 h-4 mr-1.5" />
                      이동
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 sm:h-10 px-4 sm:px-5 text-sm sm:text-base border-rose-300 text-rose-800 hover:bg-rose-50 rounded-full"
                      disabled={loading}
                      onClick={() => setBulkSellOpen(true)}
                    >
                      <BadgeDollarSign className="w-4 h-4 mr-1.5" />
                      판매
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-9 sm:h-10 px-3 sm:px-4 text-sm sm:text-base rounded-full"
                      onClick={clearSelection}
                    >
                      선택 해제
                    </Button>
                  </div>
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

      {/* ✅ 선택 일괄 이동 */}
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
