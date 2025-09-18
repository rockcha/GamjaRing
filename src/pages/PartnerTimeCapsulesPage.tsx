// src/pages/PartnerTimeCapsulesPage.tsx
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RefreshCcw, ExternalLink } from "lucide-react";

/* ───────── Types ───────── */
type Capsule = {
  id: string;
  couple_id: string;
  author_id: string;
  title: string;
  content: string;
  open_at: string; // timestamptz
  created_at?: string | null;
};
type FilterMode = "all" | "openableOnly" | "lockedOnly";

const KST_TZ = "Asia/Seoul";

/* ───────── Settings ───────── */
const CHAIN_OVERLAY_SRC = "/time-capsule/chains.png"; // 투명 PNG(1:1 추천)
const GRID_CLASSES =
  "grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3  lg:grid-cols-4  2xl:grid-cols-6";

/* ───────── Utils ───────── */
function formatRemaining(ms: number) {
  if (ms <= 0) return "지금 열람 가능";
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d}일 ${h}시간 ${m}분 ${s}초 남음`;
  if (h > 0) return `${h}시간 ${m}분 ${s}초 남음`;
  if (m > 0) return `${m}분 ${s}초 남음`;
  return `${s}초 남음`;
}
function formatDurationShort(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}일 ${h}시간`;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${sec}초`;
}
function fmtKST(ts: string) {
  return new Date(ts).toLocaleString("ko-KR", {
    timeZone: KST_TZ,
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
// /public/time-capsule/time-capsule(1~5).png → 5개 중 해시 기반 고정 랜덤
function pickCapsuleImage(idOrTitle: string) {
  const idx = (hashStr(idOrTitle) % 5) + 1;
  return `/time-capsule/time-capsule${idx}.png`;
}

/* ───────── Page ───────── */
export default function PartnerTimeCapsulesPage() {
  const { user } = useUser();
  const { couple } = useCoupleContext();

  const [items, setItems] = React.useState<Capsule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");

  // 1초 단위 리프레시 (남은시간 표시)
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // 모달
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [openAnim, setOpenAnim] = React.useState(false);

  async function fetchList() {
    if (!user?.id || !couple?.id || !user?.partner_id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("time_capsule")
        .select("id,couple_id,author_id,title,content,open_at,created_at")
        .eq("couple_id", couple.id)
        .eq("author_id", user.partner_id)
        .order("open_at", { ascending: true });
      if (error) throw error;
      setItems((data as Capsule[]) ?? []);
    } catch (e) {
      console.error(e);
      setError("타임캡슐 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void fetchList();
  }, [user?.id, user?.partner_id, couple?.id]);

  // 파생 상태
  const enriched = React.useMemo(() => {
    return items.map((it) => {
      const remainMs = new Date(it.open_at).getTime() - now;
      return { ...it, remainMs, openable: remainMs <= 0 };
    });
  }, [items, now]);

  // 필터 + 정렬 (남은 시간 오름차순)
  const filtered = React.useMemo(() => {
    let list = [...enriched];
    if (filterMode === "openableOnly") list = list.filter((i) => i.openable);
    if (filterMode === "lockedOnly") list = list.filter((i) => !i.openable);
    list.sort((a, b) => {
      const ra = Math.max(0, a.remainMs);
      const rb = Math.max(0, b.remainMs);
      return ra - rb;
    });
    return list;
  }, [enriched, filterMode]);

  const openItem = React.useMemo(
    () => filtered.find((i) => i.id === openId) ?? null,
    [filtered, openId]
  );

  const onCardClick = (it: (typeof enriched)[number]) => {
    if (!it.openable) {
      toast.warning(
        "아직 열 수 없어요. " + formatRemaining(Math.max(0, it.remainMs))
      );
      return;
    }
    setOpenId(it.id);
    setOpenAnim(false);
    setTimeout(() => setOpenAnim(true), 40);
  };

  /* ───────── Guards ───────── */
  if (!user?.id) {
    return (
      <main className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="my-10 rounded-xl border bg-white p-6 text-center">
          로그인 후 이용해 주세요.
        </div>
      </main>
    );
  }
  if (!couple?.id || !user?.partner_id) {
    return (
      <main className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="my-10 rounded-xl border bg-white p-6 text-center">
          커플 연동 후 이용해 주세요.
        </div>
      </main>
    );
  }

  /* ───────── UI ───────── */
  return (
    <TooltipProvider delayDuration={180}>
      <main className="mx-auto px-3 sm:px-4 md:px-6">
        <section
          className={cn(
            "my-6 rounded-3xl border bg-gradient-to-b from-[#FBF8F2] to-[#F6F3EE] overflow-hidden",
            "shadow-sm"
          )}
        >
          {/* Header */}
          <div className="flex flex-col gap-3 p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-base sm:text-lg md:text-xl font-semibold text-[#533b22] tracking-tight">
                타임캡슐
              </h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchList()}
                className="gap-1 shrink-0 rounded-full"
              >
                <RefreshCcw className="h-4 w-4" />
                새로고침
              </Button>
            </div>

            {/* Filter */}
            <div className="flex items-center justify-end">
              <ToggleGroup
                type="single"
                value={filterMode}
                onValueChange={(v) => v && setFilterMode(v as FilterMode)}
                className="ml-auto rounded-full bg-white/70 p-1 ring-1 ring-black/5"
              >
                <ToggleGroupItem
                  value="all"
                  aria-label="전체보기"
                  className="px-3 rounded-full data-[state=on]:bg-neutral-900 data-[state=on]:text-white"
                >
                  전체
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="openableOnly"
                  aria-label="열람 가능만"
                  className="px-3 rounded-full data-[state=on]:bg-emerald-600 data-[state=on]:text-white"
                >
                  열람 가능만
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="lockedOnly"
                  aria-label="잠긴 것만"
                  className="px-3 rounded-full data-[state=on]:bg-stone-700 data-[state=on]:text-white"
                >
                  잠긴 것만
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <Separator />

          {/* Content */}
          {loading ? (
            <div className="p-3 sm:p-4 md:p-5">
              <div className={GRID_CLASSES}>
                {Array.from({ length: 20 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="min-w-[100px] aspect-square rounded-2xl "
                  />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-5 text-sm text-rose-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-center text-neutral-600">
              조건에 맞는 타임캡슐이 없어요.
            </div>
          ) : (
            // 고정 높이 스크롤 영역 (화면의 80%)
            <div className="p-2 sm:p-3 md:p-4 pr-3">
              <ScrollArea className="h-[80vh] rounded-xl">
                <div className={cn(GRID_CLASSES, "pb-2")}>
                  {filtered.map((it) => {
                    const openable = (it as any).openable as boolean;
                    const remain = Math.max(0, (it as any).remainMs as number);
                    const imgSrc = pickCapsuleImage(it.id + it.title);

                    const tooltipText = formatRemaining(remain);

                    return (
                      <Tooltip key={it.id}>
                        <TooltipTrigger asChild>
                          <motion.button
                            type="button"
                            onClick={() => onCardClick(it as any)}
                            whileTap={{ scale: 0.985 }}
                            className={cn(
                              "group relative aspect-square w-full min-w-[100px] overflow-hidden rounded-2xl border bg-white shadow-sm transition",
                              "ring-1 ring-black/5 hover:shadow-md hover:-translate-y-[1px]",
                              openable
                                ? "border-emerald-200"
                                : "border-stone-200"
                            )}
                          >
                            {/* image */}
                            <img
                              src={imgSrc}
                              alt="time capsule"
                              className={cn(
                                "absolute inset-0 h-full w-full object-cover select-none transition",
                                !openable &&
                                  "grayscale contrast-[.9] opacity-85"
                              )}
                              draggable={false}
                              loading="lazy"
                            />

                            {/* 🔗 chains overlay (locked only) */}
                            {!openable && (
                              <img
                                src={CHAIN_OVERLAY_SRC}
                                alt="chains overlay"
                                className={cn(
                                  "pointer-events-none absolute inset-0 h-full w-full object-cover",
                                  "opacity-95"
                                )}
                                draggable={false}
                                loading="eager"
                              />
                            )}

                            {/* center title pill */}
                            <div className="absolute inset-x-0 top-1.5 flex justify-center pointer-events-none">
                              <div
                                className={cn(
                                  "max-w-[92%] truncate rounded-lg px-3 py-1 text-center text-[8px] font-semibold backdrop-blur-[2px]",
                                  "bg-black/35 text-white"
                                )}
                              >
                                {it.title}
                              </div>
                            </div>

                            {/* subtle gradient edge */}
                            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.06),transparent_28%)] opacity-0 group-hover:opacity-100 transition" />
                          </motion.button>
                        </TooltipTrigger>
                        {/* 툴팁: 이미지 호버 시 남은 시간/가능 여부 */}
                        <TooltipContent side="top" className="text-xs">
                          {tooltipText}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </section>

        {/* Open dialog */}
        <Dialog open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
          <DialogContent className="sm:max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>타임캡슐</span>
                <ExternalLink className="h-4 w-4 text-neutral-400" />
              </DialogTitle>
            </DialogHeader>

            <AnimatePresence mode="wait">
              {openItem ? (
                <motion.div
                  key={openItem.id + String(openAnim)}
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{
                    scale: openAnim ? 1.0 : 0.96,
                    opacity: 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 220,
                    damping: 18,
                    mass: 0.7,
                  }}
                  className="relative rounded-2xl border bg-white p-4 shadow-sm overflow-hidden"
                >
                  {/* 🔆 unlock burst */}
                  {openAnim && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                    >
                      <span className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-200/50 blur-2xl animate-[burst_900ms_ease-out_forwards]" />
                      <span className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/30 blur-2xl animate-[burst_1100ms_ease-out_forwards]" />
                      <style>{`
                        @keyframes burst {
                          0% { width:0; height:0; opacity:.9; }
                          70% { width:140%; height:140%; opacity:.12; }
                          100% { width:160%; height:160%; opacity:0; }
                        }
                      `}</style>
                    </div>
                  )}

                  {/* Title block */}
                  <div className="rounded-lg border bg-emerald-50/60 p-3">
                    <div className="text-[11px] font-medium text-emerald-800/80">
                      제목
                    </div>
                    <div className="mt-0.5 text-base font-semibold text-emerald-900">
                      {openItem.title}
                    </div>
                  </div>

                  {/* Content block */}
                  <div className="mt-3 rounded-lg border bg-white/80 p-3">
                    <div className="text-[11px] font-medium text-neutral-500">
                      내용
                    </div>
                    <div className="mt-1 whitespace-pre-wrap leading-relaxed text-[15px] text-neutral-800">
                      {openItem.content}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-500">
                    <span>열람 가능 시각: {fmtKST(openItem.open_at)}</span>
                    {!!openItem.created_at && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span>작성: {fmtKST(openItem.created_at)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="text-emerald-700/80">
                          {(() => {
                            const created = new Date(
                              openItem.created_at!
                            ).getTime();
                            const opened = Math.min(
                              Date.now(),
                              new Date(openItem.open_at).getTime()
                            );
                            const sealedMs = Math.max(0, opened - created);
                            return `${formatDurationShort(
                              sealedMs
                            )} 동안 봉인되어 있었어요`;
                          })()}
                        </span>
                      </>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-28 w-full" />
                </div>
              )}
            </AnimatePresence>

            <DialogFooter className="mt-3">
              <Button variant="ghost" onClick={() => setOpenId(null)}>
                닫기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </TooltipProvider>
  );
}
