// src/features/aquarium/MarineDexModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { Anchor, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
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
  swim_y: string | null;
  is_movable: boolean | null;
  rarity: FishRarity;
  description: string | null;
};

/* ─ Helpers ─ */
const RARITY_CAPTURE: Record<FishRarity, number> = {
  일반: 0.33,
  희귀: 0.12,
  에픽: 0.035,
  전설: 0.005,
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
  const m = lit.match(/(-?\d+)\s*[,]\s*(-?\d+)/);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [30, 70];
}
function buildImageSrc(id: string, rarity: FishRarity) {
  return `/aquarium/${rarityDir(rarity)}/${id}.png`;
}
const fmt = (n: number | null | undefined) =>
  typeof n === "number" && isFinite(n) ? n.toLocaleString("ko-KR") : "—";

type RarityFilter = "전체" | FishRarity;

export default function MarineDexModal() {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [rarity, setRarity] = useState<RarityFilter>("전체");
  const [rows, setRows] = useState<DbEntity[]>([]);
  // 포획 횟수 맵 (1 이상이면 포획)
  const [caughtCountMap, setCaughtCountMap] = useState<Map<string, number>>(
    new Map()
  );

  // 1) 도감 전체 목록 (처음 열 때 1회 로드)
  useEffect(() => {
    if (!open || rows.length > 0 || loading) return;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const { data, error } = await supabase
          .from("aquarium_entities")
          .select("id,name_ko,price,size,swim_y,is_movable,rarity,description");
        if (error) throw error;
        setRows((data ?? []) as unknown as DbEntity[]);
      } catch (e: any) {
        setErr(e?.message ?? "도감 데이터를 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 2) 커플별 포획 여부/횟수 (모달 열릴 때마다 새로고침)
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        if (!coupleId) {
          setCaughtCountMap(new Map());
          return;
        }
        const { data, error } = await supabase
          .from("couple_aquarium_collection")
          .select("entity_id, caught_count")
          .eq("couple_id", coupleId);
        if (error) throw error;

        const m = new Map<string, number>();
        for (const row of data ?? []) {
          m.set(String(row.entity_id), Number(row.caught_count ?? 0));
        }
        setCaughtCountMap(m);
      } catch (e) {
        console.warn("포획여부 조회 실패:", e);
        setCaughtCountMap(new Map());
      }
    })();
  }, [open, coupleId]);

  // 정렬/필터
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

  // 하단 우측 통계 (현재 필터 기준)
  const { caughtCount, totalCount, labelForStat } = useMemo(() => {
    const pool =
      rarity === "전체" ? rows : rows.filter((f) => f.rarity === rarity);
    const total = pool.length;
    let caught = 0;
    for (const f of pool) {
      if ((caughtCountMap.get(f.id) ?? 0) > 0) caught++;
    }
    const label = rarity === "전체" ? "전체 포획" : `${rarity} 포획`;
    return { caughtCount: caught, totalCount: total, labelForStat: label };
  }, [rows, rarity, caughtCountMap]);

  const rarityBadgeCls = (r: FishRarity) =>
    r === "일반"
      ? "bg-neutral-100 text-neutral-900 border border-neutral-200"
      : r === "희귀"
      ? "bg-sky-100 text-sky-900 border border-sky-200"
      : r === "에픽"
      ? "bg-violet-100 text-violet-900 border border-violet-200"
      : "bg-amber-100 text-amber-900 border border-amber-200";

  const rarityCardBg = (r: FishRarity) =>
    r === "일반"
      ? "bg-neutral-50 border-neutral-200"
      : r === "희귀"
      ? "bg-sky-50 border-sky-200"
      : r === "에픽"
      ? "bg-violet-50 border-violet-200"
      : "bg-amber-50 border-amber-200";

  const filters: RarityFilter[] = ["전체", "일반", "희귀", "에픽", "전설"];

  const captureHeader =
    rarity === "전체" ? null : (
      <div className="ml-2 flex items-center gap-1 text-[12px] text-sky-700">
        <Info className="w-4 h-4" />
        포획 확률&nbsp;
        <b>
          {Math.round((RARITY_CAPTURE[rarity as FishRarity] ?? 0) * 100)}% 미만
        </b>
      </div>
    );

  return (
    <>
      {/* Trigger */}
      <Button
        variant="outline"
        title="도감 열기"
        onClick={() => setOpen(true)}
        className="transition-transform duration-150 hover:scale-[1.02] active:scale-100"
      >
        <img
          src="/aquarium/marine_dex.gif"
          alt="도감 아이콘"
          className="h-7 w-7"
          draggable={false}
        />
        나의 도감
      </Button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[900px] w-[92vw] p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <DialogTitle className="text-xl">해양생물 도감</DialogTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  모든 어종을 한눈에 보고, 등급별로 탐색해 보세요.
                </p>
              </div>
              {/* 상단 X 버튼 제거 (요청사항) */}
            </div>
          </DialogHeader>

          <Separator className="mt-3" />

          <div className="px-5 pt-3 pb-4">
            {/* Filters (shadcn ToggleGroup) */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <ToggleGroup
                type="single"
                value={rarity}
                onValueChange={(v) => v && setRarity(v as RarityFilter)}
                className="rounded-full bg-background p-1 ring-1 ring-border"
              >
                {filters.map((f) => (
                  <ToggleGroupItem
                    key={f}
                    value={f}
                    className="px-3 rounded-full data-[state=on]:bg-foreground data-[state=on]:text-background"
                    aria-label={`${f} 필터`}
                  >
                    {f}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <div className="flex items-center">{captureHeader}</div>
              {loading && (
                <div className="text-xs text-muted-foreground">
                  불러오는 중…
                </div>
              )}
              {err && (
                <div className="text-xs text-destructive">
                  오류: {String(err)}
                </div>
              )}
            </div>

            {/* List */}
            <ScrollArea className="h-[64vh] rounded-lg border">
              <div className="p-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {list.map((f) => {
                  const imgSrc = buildImageSrc(f.id, f.rarity);
                  const [y1, y2] = parseInt4Range(f.swim_y);
                  const caughtCount = caughtCountMap.get(f.id) ?? 0;
                  const isCaught = caughtCount > 0;

                  const imgDimCls = isCaught
                    ? ""
                    : "grayscale brightness-50 contrast-150 opacity-25";
                  const shortText =
                    f.description && f.description.length > 44
                      ? f.description.slice(0, 44) + "…"
                      : f.description ?? "";

                  return (
                    <Card
                      key={f.id}
                      className={`overflow-hidden border-2 ${rarityCardBg(
                        f.rarity
                      )}`}
                    >
                      <div className="relative">
                        <AspectRatio ratio={1}>
                          <img
                            src={imgSrc}
                            alt={f.name_ko ?? f.id}
                            className={`absolute inset-0 h-full w-full object-contain ${imgDimCls}`}
                            draggable={false}
                            loading="lazy"
                            onError={(ev) => {
                              (ev.currentTarget as HTMLImageElement).onerror =
                                null;
                              (ev.currentTarget as HTMLImageElement).src =
                                "/aquarium/placeholder.png";
                            }}
                            title={`수영 높이: ${y1}~${y2}%`}
                          />
                        </AspectRatio>

                        {/* 좌상단 희귀도 배지 */}
                        <div className="absolute left-2 top-2">
                          <Badge
                            className={`rounded-full text-[11px] font-semibold ${rarityBadgeCls(
                              f.rarity
                            )}`}
                          >
                            {f.rarity}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-white text-zinc-900 border px-2.5 py-1 text-[11px]"
                          >
                            {f.name_ko ?? f.id}
                          </Badge>
                        </div>

                        {/* 가격 */}
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-700">
                          <span role="img" aria-label="gold">
                            🪙
                          </span>
                          <span className="font-semibold">{fmt(f.price)}</span>
                        </div>

                        {/* 설명 (툴팁으로 전체 보기) */}
                        {f.description && (
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="mt-2 flex items-center gap-1 text-xs text-zinc-700 hover:text-zinc-900"
                                >
                                  <span className="line-clamp-2 text-left">
                                    {shortText || "설명 보기"}
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                align="start"
                                sideOffset={8}
                                className="max-w-80 whitespace-pre-wrap break-words leading-relaxed text-[12px]"
                              >
                                {f.description}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            {/* 하단 안내(좌) + 포획 통계(우) */}
            <div className="mt-3 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Anchor className="w-3.5 h-3.5" />
                밝은 카드는 포획 경험이 있는 개체입니다.
              </div>
              <div className="ml-auto text-right">
                <span className="mr-2 font-medium">{labelForStat}</span>
                <span className="tabular-nums">
                  {caughtCount}/{totalCount}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
