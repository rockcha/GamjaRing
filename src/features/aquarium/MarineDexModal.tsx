// src/features/aquarium/MarineDexModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Anchor, X, Info } from "lucide-react";
import supabase from "@/lib/supabase";
import {
  INGREDIENT_EMOJI,
  type IngredientTitle,
} from "@/features/kitchen/type";
import { Button } from "@/components/ui/button";

// ✅ shadcn tooltip 임포트
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

/* ─ Types ─ */
type FishRarity = "일반" | "희귀" | "에픽" | "전설";

type DbEntity = {
  id: string;
  name_ko: string | null;
  price: number | null;
  size: number | null;
  food: string | null;
  swim_y: string | null;
  is_movable: boolean | null;
  rarity: FishRarity;
  description: string | null;
};

/* ─ Helpers ─ */
const RARITY_CAPTURE: Record<FishRarity, number> = {
  일반: 0.4,
  희귀: 0.15,
  에픽: 0.04,
  전설: 0.01,
};
const rarityOrder: Record<FishRarity, number> = {
  일반: 0,
  희귀: 1,
  에픽: 2,
  전설: 3,
};

function rarityDir(r: FishRarity) {
  return r === "일반"
    ? "common"
    : r === "희귀"
    ? "rare"
    : r === "에픽"
    ? "epic"
    : "legend";
}
function parseInt4Range(lit: string | null | undefined): [number, number] {
  if (!lit) return [30, 70];
  const m = lit?.match(/(-?\d+)\s*[,]\s*(-?\d+)/);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [30, 70];
}
function buildImageSrc(id: string, rarity: FishRarity) {
  return `/aquarium/${rarityDir(rarity)}/${id}.png`;
}
const fmt = (n: number | null | undefined) =>
  typeof n === "number" && isFinite(n) ? n.toLocaleString("ko-KR") : "—";

/* ─ Component ─ */
type RarityFilter = "전체" | FishRarity;

export default function MarineDexModal() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [rarity, setRarity] = useState<RarityFilter>("전체");
  const [rows, setRows] = useState<DbEntity[]>([]);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || rows.length > 0 || loading) return;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const { data, error } = await supabase
          .from("aquarium_entities")
          .select(
            "id,name_ko,price,size,food,swim_y,is_movable,rarity,description"
          );
        if (error) throw error;
        setRows((data ?? []) as unknown as DbEntity[]);
      } catch (e: any) {
        setErr(e?.message ?? "도감 데이터를 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, rows.length, loading]);

  const list = useMemo(() => {
    const filtered =
      rarity === "전체" ? rows : rows.filter((f) => f.rarity === rarity);

    const rarityRank: Record<FishRarity, number> = {
      일반: 0,
      희귀: 1,
      에픽: 2,
      전설: 3,
    };
    const priceNum = (n: number | null | undefined) =>
      typeof n === "number" && isFinite(n) ? n : Number.POSITIVE_INFINITY;

    return [...filtered].sort((a, b) => {
      const pa = priceNum(a.price);
      const pb = priceNum(b.price);
      if (pa !== pb) return pa - pb;

      const ra = rarityRank[a.rarity],
        rb = rarityRank[b.rarity];
      if (ra !== rb) return ra - rb;

      const an = a.name_ko ?? a.id;
      const bn = b.name_ko ?? b.id;
      return an.localeCompare(bn, "ko");
    });
  }, [rows, rarity]);

  const rarityChipCls = (r: FishRarity) =>
    r === "일반"
      ? "bg-neutral-100 text-neutral-900 border-neutral-200"
      : r === "희귀"
      ? "bg-sky-100 text-sky-900 border-sky-200"
      : r === "에픽"
      ? "bg-violet-100 text-violet-900 border-violet-200"
      : "bg-amber-100 text-amber-900 border-amber-200";

  const rarityCardBg = (r: FishRarity) =>
    r === "일반"
      ? "bg-neutral-50 border-neutral-200"
      : r === "희귀"
      ? "bg-sky-50 border-sky-200"
      : r === "에픽"
      ? "bg-violet-50 border-violet-200"
      : "bg-amber-50 border-amber-200";

  const filterBtnCls = (f: RarityFilter, active: boolean) => {
    if (f === "전체")
      return active
        ? "bg-slate-700 text-white border-slate-800"
        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50";
    const map = {
      일반: {
        on: "bg-neutral-700 text-white border-neutral-800",
        off: "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50",
      },
      희귀: {
        on: "bg-sky-600 text-white border-sky-700",
        off: "bg-white text-sky-700 border-sky-300 hover:bg-sky-50",
      },
      에픽: {
        on: "bg-violet-600 text-white border-violet-700",
        off: "bg-white text-violet-700 border-violet-300 hover:bg-violet-50",
      },
      전설: {
        on: "bg-amber-600 text-white border-amber-700",
        off: "bg-white text-amber-700 border-amber-300 hover:bg-amber-50",
      },
    } as const;
    return active ? map[f as FishRarity].on : map[f as FishRarity].off;
  };

  const filters: RarityFilter[] = ["전체", "일반", "희귀", "에픽", "전설"];

  const captureHeader =
    rarity === "전체" ? null : (
      <div className="mb-3 flex items-center gap-2 text-[12px]">
        <Info className="w-4 h-4 text-sky-600" />
        <span className="text-gray-700">
          포획 확률 :{" "}
          <b>{Math.round(RARITY_CAPTURE[rarity as FishRarity] * 100)}% 미만</b>
        </span>
      </div>
    );

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            aria-modal="true"
            role="dialog"
            onClick={() => setOpen(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
            <div
              className="relative z-10 flex items-center justify-center w-full h-full p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ✅ TooltipProvider를 모달 내부 전체를 감싸도록 배치 */}
              <TooltipProvider
                delayDuration={150}
                disableHoverableContent={false}
              >
                <div className="relative bg-[#FAF7F2] rounded-2xl shadow-2xl w-[860px] max-w-[92vw] max-h-[82vh] p-5 flex flex-col">
                  {/* header */}
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold">해양생물 도감</h2>
                      <p className="text-xs text-gray-500 mt-1">
                        모든 어종을 한눈에 보고, 등급별로 탐색해 보세요.
                      </p>
                    </div>
                    <button
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100"
                      aria-label="닫기"
                      title="닫기"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {captureHeader}

                  {/* filters */}
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {filters.map((f) => {
                        const active = rarity === f;
                        return (
                          <button
                            key={f}
                            onClick={() => setRarity(f)}
                            className={`px-3 py-1 rounded-full border text-sm transition ${filterBtnCls(
                              f,
                              active
                            )}`}
                          >
                            {f}
                          </button>
                        );
                      })}
                    </div>
                    {loading && (
                      <div className="text-xs text-gray-500">불러오는 중…</div>
                    )}
                    {err && (
                      <div className="text-xs text-red-600">
                        오류: {String(err)}
                      </div>
                    )}
                  </div>

                  {/* list */}
                  <div className="flex-1 overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                      {list.map((f) => {
                        const imgSrc = buildImageSrc(f.id, f.rarity);
                        const [y1, y2] = parseInt4Range(f.swim_y);
                        const ing = (f.food ?? "") as IngredientTitle;
                        const ingEmoji = INGREDIENT_EMOJI[ing] ?? "🫧";

                        const shortText =
                          f.description && f.description.length > 44
                            ? f.description.slice(0, 44) + "…"
                            : f.description ?? "";

                        return (
                          <div
                            key={f.id}
                            className={`rounded-xl border-2 p-3 text-left ${rarityCardBg(
                              f.rarity
                            )}`}
                          >
                            <div className="relative rounded-lg overflow-hidden border">
                              <img
                                src={imgSrc}
                                alt={f.name_ko ?? f.id}
                                className="w-full aspect-square object-contain "
                                draggable={false}
                                loading="lazy"
                                onError={(ev) => {
                                  ev.currentTarget.onerror = null;
                                  ev.currentTarget.src =
                                    "/aquarium/placeholder.png";
                                }}
                                title={`수영 높이: ${y1}~${y2}%`}
                              />
                              {/* 좌상단: 희귀도 */}
                              <div className="absolute left-2 top-2">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${rarityChipCls(
                                    f.rarity
                                  )}`}
                                >
                                  {f.rarity}
                                </span>
                              </div>
                              {/* 우상단: 필요 재료 이모지 */}
                              <div
                                className="absolute right-2 top-2 w-9 h-9 rounded-full bg-white/95 border border-gray-200 shadow-sm flex items-center justify-center text-lg"
                                title={`필요 재료: ${f.food ?? "미정"}`}
                                aria-label={`필요 재료: ${f.food ?? "미정"}`}
                              >
                                <span className="translate-y-[1px]">
                                  {ingEmoji}
                                </span>
                              </div>
                            </div>

                            {/* 이름 + 가격 + 설명 */}
                            <div className="mt-3">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-bold bg-white text-zinc-900">
                                  {f.name_ko ?? f.id}
                                </span>
                              </div>

                              {/* 🪙 가격 */}
                              <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-700">
                                <span role="img" aria-label="gold">
                                  🪙
                                </span>
                                <span className="font-semibold">
                                  {fmt(f.price)}
                                </span>
                              </div>

                              {/* ✅ 설명: 줄임표 + 툴팁(풀 텍스트) */}
                              {f.description && (
                                <Tooltip>
                                  {/* Trigger는 asChild로 줄임 설명/아이콘 래핑 */}
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="mt-2 flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900"
                                      // 버튼이 포커스 가능해야 키보드 접근성 + Tooltip 유지가 쉬움
                                    >
                                      <span className="line-clamp-2 text-left">
                                        {shortText || "설명 보기"}
                                      </span>
                                      <Info className="w-3.5 h-3.5 shrink-0" />
                                    </button>
                                  </TooltipTrigger>

                                  {/* Portal로 body에 렌더 + 높은 z-index로 모달 위에 */}
                                  <TooltipContent
                                    side="top"
                                    align="start"
                                    sideOffset={8}
                                    // 모달 z-[9999] 보다 큰 값
                                    className="z-[10050] max-w-80 whitespace-pre-wrap break-words leading-relaxed text-[12px]"
                                  >
                                    {f.description}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-gray-500 flex items-center gap-1">
                    <Anchor className="w-3.5 h-3.5" />
                    도감은 정보 제공용입니다. 야생(포획 대상) 어종은 바다
                    탐험에서 만날 수 있어요.
                  </div>
                </div>
              </TooltipProvider>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <Button
        variant="outline"
        title="도감 열기"
        onClick={() => setOpen(true)}
        className="transition-transform duration-150 hover:scale-[1.02] active:scale-100 hover:shadow-sm"
      >
        <img
          src="/aquarium/marine_dex.gif"
          alt="도감 아이콘"
          className="h-7 w-7"
          draggable={false}
        />
        도감
      </Button>
      {modal}
    </>
  );
}
