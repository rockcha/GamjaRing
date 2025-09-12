// src/features/aquarium/AquariumDetailButton.tsx
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
  Minus,
  Plus,
  MoveRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { emitAquariumUpdated } from "./aquarium";

/* ---------- Types / helpers ---------- */
type FishRarity = "일반" | "희귀" | "에픽" | "전설";
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

/* ---------- Portal util ---------- */
function usePortalTarget() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? document.body : null;
}

/* ---------- Component ---------- */
export default function AquariumDetailButton({
  tankNo,
  className,
  buttonLabel = "상세보기",
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

  const [confirm, setConfirm] = useState<{
    entityId: string;
    label: string;
    image: string;
    rarity: FishRarity;
    unitSell: number;
    countBefore: number;
    qty: number;
  } | null>(null);

  const [moveDlg, setMoveDlg] = useState<{
    entityId: string;
    label: string;
    image: string;
    countBefore: number;
    toTank?: number;
    qty: number;
    tanks: Array<{ tank_no: number; title: string; fish_cnt: number }>;
  } | null>(null);

  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(
    null
  );

  useEffect(() => {
    if (open || confirm || preview || moveDlg) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => (document.body.style.overflow = prev);
    }
  }, [open, confirm, preview, moveDlg]);

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

      // ✅ 정렬: 가격(오름차순) → 희귀도 → 이름
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

  // 판매 시작
  const askSell = (it: (typeof items)[number]) => {
    if (it.count <= 0) return;
    setConfirm({
      entityId: it.id,
      label: it.label,
      image: it.image,
      rarity: it.rarity,
      unitSell: Math.floor(it.price / 2),
      countBefore: it.count,
      qty: 1,
    });
  };

  // 이동 시작
  const askMove = async (it: (typeof items)[number]) => {
    if (!coupleId) return;
    try {
      const { data, error } = await supabase.rpc("get_couple_tanks", {
        p_couple_id: coupleId,
      });
      if (error) throw error;

      const tanks = (data ?? []).filter((t: any) => t.tank_no !== tankNo);
      setMoveDlg({
        entityId: it.id,
        label: it.label,
        image: it.image,
        countBefore: it.count,
        qty: 1,
        tanks: tanks as any,
        toTank: tanks[0]?.tank_no,
      });
    } catch (e: any) {
      console.error(e);
      toast.error("보유한 어항 목록을 불러오지 못했어요.");
    }
  };

  // 실제 판매
  const doSell = async () => {
    if (!confirm || !coupleId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("sell_fish_from_tank", {
        p_couple_id: coupleId,
        p_tank_no: tankNo,
        p_entity_id: confirm.entityId,
        p_qty: confirm.qty,
      });
      if (error) throw error;

      const sold = Number(data?.[0]?.sold_cnt ?? 0);
      const gold = Number(data?.[0]?.gained_gold ?? 0);

      toast.success(
        `${confirm.label} ${sold + 1} 마리 판매 (+${gold.toLocaleString(
          "ko-KR"
        )} 골드)`
      );
      emitAquariumUpdated(coupleId, tankNo);

      try {
        if (user?.id && (user as any)?.partner_id) {
          await sendUserNotification({
            senderId: user.id,
            receiverId: (user as any).partner_id,
            type: "물품판매",
            itemName: `${confirm.label} ${sold + 1}마리`,
          });
        }
      } catch {}
      await loadSummary();
      setConfirm(null);
    } catch (e: any) {
      console.error(e);
      toast.error(`판매 실패: ${e.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  // 실제 이동
  const doMove = async () => {
    if (!moveDlg || !coupleId || !moveDlg.toTank) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("move_fish_between_tanks", {
        p_couple_id: coupleId,
        p_entity_id: moveDlg.entityId,
        p_from_tank: tankNo,
        p_qty: moveDlg.qty,
        p_to_tank: moveDlg.toTank,
      });
      if (error) throw error;
      const moved = Number(data ?? 0);
      if (moved <= 0) {
        toast.warning("이동할 수량이 없어요.");
      } else {
        toast.success(`${moveDlg.label} ${moved}마리 이동 완료`);
        await loadSummary();
        emitAquariumUpdated(coupleId, tankNo);
      }
      setMoveDlg(null);
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
          "rounded-full bg-white/90 backdrop-blur px-3 py-1.5",
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
                "w-[1000px] max-w-[95vw] max-h-[85vh] overflow-auto rounded-2xl bg-white p-5 shadow-xl relative transition-transform",
                open ? "scale-100" : "scale-95"
              )}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 -mx-5 px-5 pt-4 pb-3 mb-4 bg-white/90 backdrop-blur border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* 제목 변경: 1번 아쿠아리움 */}
                    <h3 className="text-lg font-bold">{tankNo}번 아쿠아리움</h3>
                    {/* 총 마리 수: 🐟 n마리 */}
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

                {/* 검색(좌) ─ 희귀도 선택(우) 같은 행 */}
                <div className="mt-3 flex items-center gap-3">
                  {/* 좌측: 검색 */}
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

                  {/* 우측으로 밀기 */}
                  <div className="ml-auto flex items-center gap-2">
                    <label
                      htmlFor="rarityFilter"
                      className="text-sm text-slate-600"
                    >
                      희귀도
                    </label>
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
                <div className="grid grid-cols-2 gap-4 sm:gap-5">
                  {filtered.map((it) => (
                    <div
                      key={it.id}
                      className={cn(
                        "grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border p-4",
                        RARITY_CARD_CLASS[it.rarity]
                      )}
                    >
                      {/* thumb */}
                      <button
                        type="button"
                        className={cn(
                          "group relative w-28 h-24 sm:w-32 sm:h-28 rounded-xl",
                          "bg-white/85 backdrop-blur-[2px] shadow-sm overflow-hidden ring-1",
                          RARITY_IMG_RING[it.rarity]
                        )}
                        onClick={() =>
                          setPreview({ src: it.image, alt: it.label })
                        }
                        title={`${it.label} 확대 보기`}
                      >
                        <span className="absolute top-1 right-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold px-1.5 py-0.5 shadow ring-1 ring-white/80">
                          x{it.count}
                        </span>
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

                      {/* actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={() => askSell(it)}
                          disabled={it.count <= 0 || loading}
                        >
                          판매
                        </Button>
                        <Button
                          variant="outline"
                          className="border-sky-300 text-sky-800 hover:bg-sky-50"
                          onClick={() => askMove(it)}
                          disabled={it.count <= 0 || loading}
                        >
                          <MoveRight className="w-4 h-4 mr-1" /> 이동
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>,
          portalTarget
        )}

      {/* 판매 모달 */}
      {portalTarget &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-[90] flex items-center justify-center bg-black/50 transition-opacity",
              confirm
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            )}
            onClick={() => setConfirm(null)}
            aria-hidden={!confirm}
          >
            <div
              className="w-[460px] max-w-[90vw] rounded-2xl bg-white p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {confirm && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-bold">판매 확인</h4>
                    <button
                      onClick={() => setConfirm(null)}
                      className="p-1.5 rounded-md border hover:bg-gray-50"
                      aria-label="닫기"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <img
                      src={confirm.image}
                      alt={confirm.label}
                      className="w-20 h-20 object-contain rounded-md bg-white ring-1 ring-gray-200"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{confirm.label}</div>
                      <div className="mt-1 text-sm text-gray-700">
                        1마리 판매가{" "}
                        <b className="text-amber-700">
                          {confirm.unitSell.toLocaleString("ko-KR")}
                        </b>{" "}
                        골드
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm text-slate-600">수량</span>
                        <div className="inline-flex items-stretch rounded-md border">
                          <button
                            className="px-2 py-1 hover:bg-gray-50 disabled:opacity-40"
                            onClick={() =>
                              setConfirm((c) =>
                                !c ? c : { ...c, qty: Math.max(1, c.qty - 1) }
                              )
                            }
                            disabled={confirm.qty <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            className="w-16 text-center border-l border-r outline-none"
                            value={confirm.qty}
                            min={1}
                            max={confirm.countBefore}
                            onChange={(e) => {
                              const v = Math.max(
                                1,
                                Math.min(
                                  confirm.countBefore,
                                  Math.floor(Number(e.target.value || 1))
                                )
                              );
                              setConfirm((c) => (!c ? c : { ...c, qty: v }));
                            }}
                          />
                          <button
                            className="px-2 py-1 hover:bg-gray-50 disabled:opacity-40"
                            onClick={() =>
                              setConfirm((c) =>
                                !c
                                  ? c
                                  : {
                                      ...c,
                                      qty: Math.min(c.countBefore, c.qty + 1),
                                    }
                              )
                            }
                            disabled={confirm.qty >= confirm.countBefore}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-xs text-slate-500">
                          보유 {confirm.countBefore}마리
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-700 inline-flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        수량: {confirm.countBefore} →{" "}
                        <b className="text-rose-700">
                          {Math.max(0, confirm.countBefore - confirm.qty)}
                        </b>
                      </div>
                      <div className="mt-1 text-sm">
                        총액{" "}
                        <b className="text-amber-700">
                          {(confirm.unitSell * confirm.qty).toLocaleString(
                            "ko-KR"
                          )}
                        </b>{" "}
                        골드
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setConfirm(null)}
                      className="border-gray-200"
                    >
                      취소
                    </Button>
                    <Button
                      onClick={doSell}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      disabled={loading || confirm.qty < 1}
                    >
                      판매
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>,
          portalTarget
        )}

      {/* 이동 모달 */}
      {portalTarget &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-[90] flex items-center justify-center bg-black/50 transition-opacity",
              moveDlg
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            )}
            onClick={() => setMoveDlg(null)}
            aria-hidden={!moveDlg}
          >
            <div
              className="w-[480px] max-w-[90vw] rounded-2xl bg-white p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {moveDlg && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-bold">다른 어항으로 이동</h4>
                    <button
                      onClick={() => setMoveDlg(null)}
                      className="p-1.5 rounded-md border hover:bg-gray-50"
                      aria-label="닫기"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <img
                      src={moveDlg.image}
                      alt={moveDlg.label}
                      className="w-20 h-20 object-contain rounded-md bg-white ring-1 ring-gray-200"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{moveDlg.label}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-slate-600">
                          목적지 어항
                        </span>
                        <select
                          className="text-sm border rounded-md px-2 py-1 bg-white"
                          value={moveDlg.toTank}
                          onChange={(e) =>
                            setMoveDlg((d) =>
                              !d ? d : { ...d, toTank: Number(e.target.value) }
                            )
                          }
                        >
                          {moveDlg.tanks.map((t) => (
                            <option key={t.tank_no} value={t.tank_no}>
                              #{t.tank_no} {t.title ?? ""} ({t.fish_cnt}마리)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm text-slate-600">수량</span>
                        <div className="inline-flex items-stretch rounded-md border">
                          <button
                            className="px-2 py-1 hover:bg-gray-50 disabled:opacity-40"
                            onClick={() =>
                              setMoveDlg((d) =>
                                !d ? d : { ...d, qty: Math.max(1, d.qty - 1) }
                              )
                            }
                            disabled={moveDlg.qty <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            className="w-16 text-center border-l border-r outline-none"
                            value={moveDlg.qty}
                            min={1}
                            max={moveDlg.countBefore}
                            onChange={(e) => {
                              const v = Math.max(
                                1,
                                Math.min(
                                  moveDlg.countBefore,
                                  Math.floor(Number(e.target.value || 1))
                                )
                              );
                              setMoveDlg((d) => (!d ? d : { ...d, qty: v }));
                            }}
                          />
                          <button
                            className="px-2 py-1 hover:bg-gray-50 disabled:opacity-40"
                            onClick={() =>
                              setMoveDlg((d) =>
                                !d
                                  ? d
                                  : {
                                      ...d,
                                      qty: Math.min(d.countBefore, d.qty + 1),
                                    }
                              )
                            }
                            disabled={moveDlg.qty >= moveDlg.countBefore}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-xs text-slate-500">
                          보유 {moveDlg.countBefore}마리
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setMoveDlg(null)}
                      className="border-gray-200"
                    >
                      취소
                    </Button>
                    <Button
                      onClick={doMove}
                      className="border-sky-300 text-sky-800 hover:bg-sky-50"
                      disabled={loading || moveDlg.qty < 1 || !moveDlg.toTank}
                    >
                      {moveDlg.toTank ? `#${moveDlg.toTank}로 이동` : "이동"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>,
          portalTarget
        )}

      {/* 이미지 미리보기 */}
      {portalTarget &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-[95] flex items-center justify-center bg-black/70 transition-opacity",
              preview
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            )}
            onClick={() => setPreview(null)}
            aria-hidden={!preview}
          >
            {preview && (
              <div
                className="relative max-w-[90vw] max-h-[80vh] p-2"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={preview.src}
                  alt={preview.alt}
                  className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/20 bg-white/5"
                  draggable={false}
                />
                <button
                  onClick={() => setPreview(null)}
                  className="absolute -top-3 -right-3 p-2 rounded-full bg-white text-slate-800 shadow ring-1 ring-black/10"
                  aria-label="미리보기 닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>,
          portalTarget
        )}
    </>
  );
}
