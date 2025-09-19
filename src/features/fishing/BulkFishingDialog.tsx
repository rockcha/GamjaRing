"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import {
  rollFishByIngredient,
  type RollResult,
} from "@/features/fishing/rollfish";
import { randomFunnyLine } from "@/features/fishing/funnyLines";
import { Fish as FishIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Rarity = "일반" | "희귀" | "에픽" | "전설";

type BulkCatch = {
  id: string;
  label: string;
  rarity: Rarity;
  image: string;
  count: number;
  isNew?: boolean;
};

const RARITY_ORDER: Rarity[] = ["전설", "에픽", "희귀", "일반"];

function rarityWeight(r: Rarity) {
  return r === "전설" ? 4 : r === "에픽" ? 3 : r === "희귀" ? 2 : 1;
}
function rarityDir(r: Rarity) {
  return r === "일반"
    ? "common"
    : r === "희귀"
    ? "rare"
    : r === "에픽"
    ? "epic"
    : "legend";
}
function rarityEn(r: Rarity) {
  return r === "일반"
    ? "common"
    : r === "희귀"
    ? "rare"
    : r === "에픽"
    ? "epic"
    : "legendary";
}
function buildImageSrc(id: string, rarity: Rarity) {
  return `/aquarium/${rarityDir(rarity)}/${id}.png`;
}
function unwrapRpcRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type TankRow = { tank_no: number; title: string | null };
type Placements = Record<string, number>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId: string | null;
  tanksCount: number;
  baitCount: number;
  setBaitCount: React.Dispatch<React.SetStateAction<number>>;
  fetchCoupleData?: () => Promise<any> | void;
  userId?: string | null;
  partnerId?: string | null;
};

export default function BulkFishingDialog({
  open,
  onOpenChange,
  coupleId,
  tanksCount,
  baitCount,
  setBaitCount,
  fetchCoupleData,
  userId,
  partnerId,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number>(1);

  const [results, setResults] = useState<BulkCatch[] | null>(null);
  const [failCount, setFailCount] = useState<number>(0);

  const [tanks, setTanks] = useState<TankRow[]>([]);
  const [tanksErr, setTanksErr] = useState<string | null>(null);

  const [placements, setPlacements] = useState<Placements>({});
  const defaultTank = useMemo(
    () => (tanks.length > 0 ? tanks[0].tank_no : 1),
    [tanks]
  );

  const [groupTarget, setGroupTarget] = useState<Record<Rarity, number>>({
    전설: 1,
    에픽: 1,
    희귀: 1,
    일반: 1,
  });

  // ✅ 5초 고정 오버레이
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayText, setOverlayText] = useState("바다의 농담을 건지는 중…");
  const [gifIndex, setGifIndex] = useState(1);

  useEffect(() => {
    if (!overlayOpen) return;
    setGifIndex(1 + Math.floor(Math.random() * 6));
    setOverlayText(randomFunnyLine());
    const id = window.setInterval(
      () => setOverlayText(randomFunnyLine()),
      3000
    );
    return () => window.clearInterval(id);
  }, [overlayOpen]);

  useEffect(() => {
    if (!open || !coupleId) {
      setTanks([]);
      setTanksErr(null);
      return;
    }
    (async () => {
      try {
        setTanksErr(null);
        const { data, error } = await supabase
          .from("aquarium_tanks")
          .select("tank_no,title")
          .eq("couple_id", coupleId)
          .order("tank_no", { ascending: true });

        if (error) throw error;
        const rows: TankRow[] = (data ?? []).map((r: any) => ({
          tank_no: Number(r.tank_no),
          title: r.title ?? null,
        }));
        setTanks(rows);
        const first = rows[0]?.tank_no ?? 1;
        setGroupTarget({ 전설: first, 에픽: first, 희귀: first, 일반: first });
      } catch (e: any) {
        setTanksErr(e?.message ?? "어항 목록을 불러오지 못했습니다.");
        setTanks([]);
      }
    })();
  }, [open, coupleId]);

  useEffect(() => {
    if (!results) {
      setPlacements({});
      return;
    }
    const next: Placements = {};
    for (const r of results) next[r.id] = defaultTank || 1;
    setPlacements(next);
  }, [results, defaultTank]);

  const tankOptions: TankRow[] = useMemo(() => {
    if (tanks.length > 0) return tanks;
    return Array.from({ length: Math.max(0, tanksCount) }).map((_, i) => ({
      tank_no: i + 1,
      title: `${i + 1} 번`,
    }));
  }, [tanks, tanksCount]);

  const totalCaught = useMemo(
    () => (results ?? []).reduce((a, b) => a + b.count, 0),
    [results]
  );

  const speciesCount = results?.length ?? 0;
  const successCount = totalCaught;
  const fail = failCount;

  async function savePlacementsIfNeeded({
    auto = false,
  }: { auto?: boolean } = {}): Promise<boolean> {
    if (!coupleId) {
      toast.error("커플 정보를 찾을 수 없어요.");
      return false;
    }
    if (!results || results.length === 0) return true;

    const items = results.map((r) => ({
      entity_id: r.id,
      tank_no: placements[r.id] || defaultTank || 1,
      qty: r.count,
    }));

    try {
      const { data, error } = await supabase.rpc("bulk_add_inventory", {
        p_couple: coupleId,
        p_items: items,
      });
      if (error) throw error;

      const ins = (data as any)?.inserted_count ?? items.length;
      const sk = (data as any)?.skipped_count ?? 0;
      toast.success(
        `${auto ? "자동 " : ""}저장 완료 (+${ins}${sk ? `, 스킵 ${sk}` : ""})`
      );

      await fetchCoupleData?.();
      setResults(null);
      return true;
    } catch (e: any) {
      console.error("[bulk] savePlacementsIfNeeded error:", e);
      toast.error(e?.message ?? "저장에 실패했어요.");
      return false;
    }
  }

  async function handleDialogChange(nextOpen: boolean) {
    if (!nextOpen && results?.length) {
      setBusy(true);
      const ok = await savePlacementsIfNeeded({ auto: true });
      setBusy(false);
      if (!ok) return;
    }
    onOpenChange(nextOpen);
  }

  /* ----------------------- 낚시 실행 ----------------------- */
  async function runBulkFishing() {
    if (!coupleId) return toast.error("커플 정보를 찾을 수 없어요.");
    if (count < 1) return toast.error("1개 이상 입력해 주세요.");
    if (count > baitCount)
      return toast.warning(
        `보유 미끼가 부족합니다. 최대 ${baitCount}개까지 가능합니다.`
      );

    if (results?.length) {
      setBusy(true);
      const ok = await savePlacementsIfNeeded({ auto: true });
      setBusy(false);
      if (!ok) return;
    }

    try {
      setBusy(true);
      setResults(null);
      setFailCount(0);

      setOverlayOpen(true);
      const gate = wait(5000);

      const work = (async () => {
        const { data: cdata, error: cerr } = await supabase.rpc(
          "consume_bait",
          {
            p_couple_id: coupleId,
            p_count: count,
          }
        );
        if (cerr) throw cerr;

        const crow = unwrapRpcRow<{
          ok: boolean;
          error?: string | null;
          bait_count: number | null;
        }>(cdata);
        if (!crow?.ok) {
          if (crow?.error === "not_enough_bait")
            toast.warning("미끼가 부족합니다!");
          else toast.error(`미끼 차감 실패: ${crow?.error ?? "unknown"}`);
          return { success: 0, fails: 0, catches: [] as BulkCatch[] };
        }
        const newCnt = crow.bait_count ?? Math.max(0, baitCount - count);
        setBaitCount(newCnt);
        window.dispatchEvent(
          new CustomEvent("bait-consumed", { detail: { left: newCnt } })
        );

        const rolls: RollResult[] = await Promise.all(
          Array.from({ length: count }).map(() =>
            rollFishByIngredient("bait" as any)
          )
        );

        const successIds = rolls
          .filter((r) => r.ok)
          .map((r) => (r as any).fishId as string);
        const fails = rolls.length - successIds.length;
        setFailCount(fails);

        let catches: BulkCatch[] = [];
        if (successIds.length > 0) {
          const uniq = Array.from(new Set(successIds));

          const { data: existedRows, error: existedErr } = await supabase
            .from("couple_aquarium_collection")
            .select("entity_id")
            .eq("couple_id", coupleId)
            .in("entity_id", uniq);
          if (existedErr) throw existedErr;

          const existed = new Set<string>(
            (existedRows ?? []).map((r) => r.entity_id)
          );
          const newSet = new Set<string>(uniq.filter((id) => !existed.has(id)));

          const { data: rows, error } = await supabase
            .from("aquarium_entities")
            .select("id,name_ko,rarity")
            .in("id", uniq);
          if (error) throw error;

          const infoMap = new Map<string, { label: string; rarity: Rarity }>();
          (rows ?? []).forEach((r: any) => {
            const rar =
              (["일반", "희귀", "에픽", "전설"] as Rarity[])[
                Math.max(
                  0,
                  ["일반", "희귀", "에픽", "전설"].indexOf(r.rarity as Rarity)
                )
              ] ?? "일반";
            infoMap.set(r.id, { label: r.name_ko ?? r.id, rarity: rar });
          });

          const countMap = new Map<string, number>();
          successIds.forEach((id) =>
            countMap.set(id, (countMap.get(id) || 0) + 1)
          );

          try {
            const calls = Array.from(countMap.entries()).map(
              async ([id, qty]) => {
                const meta = infoMap.get(id);
                const rKo: Rarity = meta?.rarity ?? "일반";
                const rEn = rarityEn(rKo);
                const { error: gErr } = await supabase.rpc(
                  "grant_fish_sticker",
                  {
                    p_couple: coupleId,
                    p_fish_id: id,
                    p_rarity: rEn,
                    p_qty: qty,
                  }
                );
                if (gErr) throw gErr;
              }
            );
            const settled = await Promise.allSettled(calls);
            const failed = settled.filter((s) => s.status === "rejected");
            if (failed.length > 0) {
              console.warn(
                "[fishing] grant_fish_sticker partial failures:",
                failed
              );
              toast.warning(
                `스티커 인벤토리 반영 중 일부 실패(${failed.length})`
              );
            }
          } catch (e) {
            console.error("[fishing] grant_fish_sticker error:", e);
            toast.warning("스티커 인벤토리 반영에 실패했어요.");
          }

          catches = Array.from(countMap.entries())
            .map(([id, n]) => {
              const info = infoMap.get(id)!;
              return {
                id,
                label: info.label,
                rarity: info.rarity,
                image: buildImageSrc(id, info.rarity),
                count: n,
                isNew: newSet.has(id),
              };
            })
            .sort((a, b) =>
              a.rarity === b.rarity
                ? b.count - a.count
                : rarityWeight(b.rarity) - rarityWeight(a.rarity)
            );

          try {
            if (userId && partnerId) {
              const rareUnique = catches
                .filter((c) => c.rarity === "에픽" || c.rarity === "전설")
                .reduce((acc, cur) => {
                  if (!acc.some((x) => x.id === cur.id)) acc.push(cur);
                  return acc;
                }, [] as typeof catches);

              if (rareUnique.length > 0) {
                await Promise.allSettled(
                  rareUnique.map((c) =>
                    sendUserNotification({
                      senderId: userId!,
                      receiverId: partnerId!,
                      type: "낚시성공",
                      itemName: c.label,
                    } as any)
                  )
                );
              }
            }
          } catch {
            /* noop */
          }
        }

        return { success: successIds.length, fails, catches };
      })();

      const [{ success, fails, catches }] = await Promise.all([work, gate]);

      setResults(catches);
      setOverlayOpen(false);
      toast.success(`일괄 낚시 완료! 성공 ${success} / 실패 ${fails}`);
    } catch (e: any) {
      await wait(5000).catch(() => {});
      setOverlayOpen(false);
      console.error(e);
      toast.error(e?.message ?? "일괄 낚시 중 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function savePlacementsManual() {
    setBusy(true);
    const ok = await savePlacementsIfNeeded({ auto: false });
    setBusy(false);
    if (ok) onOpenChange(false);
  }

  function setAllTo(tankNo: number) {
    if (!results) return;
    const next: Placements = {};
    for (const r of results) next[r.id] = tankNo;
    setPlacements(next);
  }

  function applyGroup(rarity: Rarity) {
    if (!results) return;
    const tno = groupTarget[rarity] ?? defaultTank ?? 1;
    setPlacements((prev) => {
      const next = { ...prev };
      for (const r of results) {
        if (r.rarity === rarity) next[r.id] = tno;
      }
      return next;
    });
  }

  const grouped = useMemo(() => {
    const g: Record<Rarity, BulkCatch[]> = {
      전설: [],
      에픽: [],
      희귀: [],
      일반: [],
    };
    for (const r of results ?? []) g[r.rarity].push(r);
    return g;
  }, [results]);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="w-full max-w-[980px] p-0 overflow-hidden rounded-2xl">
        {/* ✅ 5초 로딩 오버레이 */}
        {overlayOpen && (
          <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/30 backdrop-blur-[2px]">
            <div className="w-[min(92vw,520px)] max-h-[80vh] overflow-auto rounded-2xl bg-white border p-6 text-center shadow-xl">
              <div className="flex items-center justify-center gap-2 text-amber-700 mb-3">
                <FishIcon className="w-5 h-5" />
                <span className="text-sm font-semibold">낚시 중…</span>
              </div>
              <img
                src={`/fishing/fishing${gifIndex}.gif`}
                alt="낚시 중 애니메이션"
                className="mx-auto w-40 h-40 object-contain rounded-md mb-4"
                draggable={false}
              />
              <div className="mt-1 text-sm text-gray-900 text-center">
                <div className="font-semibold mb-1">🫧 바닷속 이야기</div>
                <div className="text-gray-800">{overlayText}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col max-h-[80vh] bg-white">
          {/* 헤더 */}
          <DialogHeader className="p-6 pb-4 sticky top-0 bg-white/90 backdrop-blur z-20 border-b">
            <DialogTitle>일괄 낚시</DialogTitle>
            <DialogDescription>
              결과가 나온 뒤 어종별로 보관 어항을 선택하세요. 닫거나 다시
              실행하면 현재 선택 상태로 자동 저장됩니다.
            </DialogDescription>
          </DialogHeader>

          {/* 스크롤 영역 */}
          <div className="px-6 py-4 overflow-auto grow">
            {/* 실행 패널 */}
            <Card className="p-4 bg-slate-50">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-[140px] sm:w-[160px]">
                  <label className="text-xs text-muted-foreground">
                    보유 미끼
                  </label>
                  <div className="mt-1 h-9 grid place-items-center rounded-md border bg-white text-sm tabular-nums">
                    🪝x{baitCount}
                  </div>
                </div>

                <div className="w-[140px] sm:w-[160px]">
                  <label className="text-xs text-muted-foreground">
                    사용 개수
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, baitCount)}
                    className="mt-1 w-full h-9 rounded-md border px-3 text-sm bg-white"
                    value={count}
                    onChange={(e) =>
                      setCount(Math.max(1, Number(e.target.value || 1)))
                    }
                    disabled={busy || baitCount <= 0 || overlayOpen}
                  />
                </div>

                <div className="ms-auto">
                  <Button
                    onClick={runBulkFishing}
                    disabled={busy || baitCount <= 0 || overlayOpen}
                    className={cn(
                      "h-9 min-w-[120px]",
                      busy ? "opacity-80 cursor-not-allowed" : ""
                    )}
                  >
                    {busy ? "진행 중…" : "일괄 낚시 시작"}
                  </Button>
                </div>
              </div>
            </Card>

            <Separator className="my-4" />

            {/* 요약/빠른동작 */}
            <div className="flex flex-wrap items-center gap-3 justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
                  성공 {successCount}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  실패 {fail}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs border border-indigo-200">
                  종류 {speciesCount}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">모두</span>
                <Select
                  value={String(defaultTank)}
                  onValueChange={(v) => setAllTo(Number(v))}
                  disabled={busy || overlayOpen}
                >
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tankOptions.map((t) => (
                      <SelectItem key={t.tank_no} value={String(t.tank_no)}>
                        {t.title && t.title.trim().length > 0
                          ? t.title
                          : `${t.tank_no} 번`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  onClick={savePlacementsManual}
                  disabled={busy || !results?.length || overlayOpen}
                >
                  저장하기
                </Button>
              </div>
            </div>

            {tanksErr && (
              <div className="text-[11px] text-amber-600 mb-2">
                어항 제목을 불러오지 못했습니다. 숫자 목록으로 대체했어요.
              </div>
            )}

            {/* 결과 */}
            {results && results.length > 0 ? (
              RARITY_ORDER.map((ra) =>
                (results ?? []).some((r) => r.rarity === ra) ? (
                  <section key={ra} className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">
                        {ra}{" "}
                        <span className="text-xs text-muted-foreground">
                          {
                            (results ?? []).filter((r) => r.rarity === ra)
                              .length
                          }
                          종
                        </span>
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          이 그룹을
                        </span>
                        <Select
                          value={String(groupTarget[ra])}
                          onValueChange={(v) =>
                            setGroupTarget((prev) => ({
                              ...prev,
                              [ra]: Number(v),
                            }))
                          }
                          disabled={busy || overlayOpen}
                        >
                          <SelectTrigger className="h-8 w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {tankOptions.map((t) => (
                              <SelectItem
                                key={`g-${ra}-${t.tank_no}`}
                                value={String(t.tank_no)}
                              >
                                {t.title && t.title.trim().length > 0
                                  ? t.title
                                  : `${t.tank_no} 번`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => applyGroup(ra)}
                          disabled={busy || overlayOpen}
                        >
                          적용
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {(results ?? [])
                        .filter((r) => r.rarity === ra)
                        .map((f) => {
                          const theme =
                            f.rarity === "일반"
                              ? {
                                  card: "bg-neutral-50 border-neutral-200",
                                  imgBorder: "border-neutral-200",
                                  metaText: "text-neutral-700/80",
                                  pill: "border-neutral-200 bg-neutral-50 text-neutral-700",
                                }
                              : f.rarity === "희귀"
                              ? {
                                  card: "bg-sky-50 border-sky-200",
                                  imgBorder: "border-sky-200",
                                  metaText: "text-sky-700/80",
                                  pill: "border-sky-200 bg-sky-50 text-sky-800",
                                }
                              : f.rarity === "에픽"
                              ? {
                                  card: "bg-violet-50 border-violet-200",
                                  imgBorder: "border-violet-200",
                                  metaText: "text-violet-700/80",
                                  pill: "border-violet-200 bg-violet-50 text-violet-800",
                                }
                              : {
                                  card: "bg-amber-50 border-amber-200",
                                  imgBorder: "border-amber-200",
                                  metaText: "text-amber-700/80",
                                  pill: "border-amber-300 bg-amber-50 text-amber-900",
                                };
                          const sel = placements[f.id] ?? defaultTank ?? 1;
                          return (
                            <div
                              key={f.id}
                              className={cn(
                                "rounded-xl border p-2 shadow-sm transition-colors",
                                theme.card
                              )}
                            >
                              <div
                                className={cn(
                                  "relative w-full aspect-square rounded-lg border grid place-items-center overflow-hidden bg-white",
                                  theme.imgBorder
                                )}
                              >
                                {f.isNew && (
                                  <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-red-500 text-white px-1.5 py-0.5 text-[10px] font-bold leading-none shadow">
                                    new
                                  </span>
                                )}
                                <img
                                  src={f.image}
                                  alt={f.label}
                                  className="w-full h-full object-contain"
                                  draggable={false}
                                  loading="lazy"
                                  onError={(ev) => {
                                    (
                                      ev.currentTarget as HTMLImageElement
                                    ).onerror = null;
                                    (ev.currentTarget as HTMLImageElement).src =
                                      "/aquarium/fish_placeholder.png";
                                  }}
                                />
                              </div>

                              <div className="mt-2 flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold truncate">
                                  {f.label}
                                </div>
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                                    theme.pill
                                  )}
                                >
                                  {f.rarity}
                                </span>
                              </div>

                              <div
                                className={cn(
                                  "text-[11px] my-1",
                                  theme.metaText
                                )}
                              >
                                수량 x{f.count}
                              </div>

                              <Select
                                value={String(sel)}
                                onValueChange={(v) =>
                                  setPlacements((prev) => ({
                                    ...prev,
                                    [f.id]: Number(v),
                                  }))
                                }
                                disabled={busy || overlayOpen}
                              >
                                <SelectTrigger className="h-8 w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {tankOptions.map((t) => (
                                    <SelectItem
                                      key={`${f.id}-${t.tank_no}`}
                                      value={String(t.tank_no)}
                                    >
                                      {t.title && t.title.trim().length > 0
                                        ? t.title
                                        : `${t.tank_no} 번`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                    </div>
                  </section>
                ) : null
              )
            ) : (
              <div className="text-sm text-muted-foreground">
                잡힌 물고기가 없어요.
              </div>
            )}
          </div>

          {/* 하단 Save Bar */}
          <div className="sticky bottom-0 z-20 bg-white/95 border-t">
            <div className="px-6 py-3 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {results?.length
                  ? `저장 대기:  총 ${totalCaught}마리 · 창을 닫거나 다시 낚시를 하면 설정대로 자동 저장됩니다.`
                  : `저장할 항목이 없습니다.`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={savePlacementsManual}
                  disabled={busy || !results?.length || overlayOpen}
                >
                  저장하기
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDialogChange(false)}
                  disabled={busy || overlayOpen}
                >
                  닫기
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
