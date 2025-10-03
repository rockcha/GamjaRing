// src/features/memories/FragmentListPage.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { listFragments, updateFragment } from "./api";
import type { Fragment } from "./types";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { publicUrl } from "./storage";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** ---- Views ---- */
type ViewKey = "timeline" | "list";

export default function FragmentListPage() {
  const nav = useNavigate();
  const { couple } = useCoupleContext();

  const [items, setItems] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewKey>(
    () =>
      (typeof window !== "undefined"
        ? (localStorage.getItem("mem:view") as ViewKey)
        : null) || "timeline"
  );

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!couple?.id) return;
      try {
        setLoading(true);
        const res = await listFragments(couple.id, 1000, 0);
        if (alive) setItems(res);
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [couple?.id]);

  const filtered = useMemo(() => {
    return [...items].sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }, [items]);

  const months = useMemo(() => monthsFromItems(filtered), [filtered]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mem:view", view);
    }
  }, [view]);

  const isTimeline = view === "timeline";

  return (
    <>
      {/* 배경 질감 */}
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(1400px 800px at 30% 10%, rgba(245,232,206,0.85), transparent 60%), radial-gradient(1200px 900px at 70% 30%, rgba(248,242,230,0.85), transparent 60%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.07]"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22 viewBox=%220 0 160 160%22><filter id=%22n%22 x=%220%22 y=%220%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22160%22 height=%22160%22 filter=%22url(%23n)%22 opacity=%220.35%22/></svg>')",
          backgroundRepeat: "repeat",
        }}
        aria-hidden
      />

      {/* 종이 래퍼 */}
      <div
        className={cn(
          "relative z-[2] w-full sm:w-[88%] lg:w-[82%] mx-auto max-w-7xl p-4 sm:p-6 space-y-6",
          "rounded-3xl bg-[rgba(250,247,242,0.95)] ring-1 ring-amber-200/40",
          "shadow-[0_24px_60px_-24px_rgba(120,85,40,0.35)]",
          "before:absolute before:inset-0 before:rounded-3xl before:opacity-25",
          "before:bg-[radial-gradient(rgba(0,0,0,0.045)_1px,transparent_1px)] before:bg-[length:12px_12px]"
        )}
      >
        {/* Sticky Toolbar */}
        <div
          data-scrolled={scrolled ? "y" : "n"}
          className={[
            "sticky top-40 z-20 transition-all",
            "backdrop-blur supports-[backdrop-filter]:bg-white/55",
            "data-[scrolled=y]:shadow-md data-[scrolled=y]:ring-1 data-[scrolled=y]:ring-border",
            "rounded-2xl",
          ].join(" ")}
        >
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-3 sm:px-4">
            <div className="flex items-center gap-3">
              <span
                className={[
                  "text-[13px] font-semibold",
                  !isTimeline ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                리스트
              </span>
              <Switch
                checked={isTimeline}
                onCheckedChange={(v) => setView(v ? "timeline" : "list")}
                aria-label="리스트/타임라인 전환"
              />
              <span
                className={[
                  "text-[13px] font-semibold",
                  isTimeline ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                타임라인
              </span>
            </div>

            <Button
              onClick={() => nav("/memories/new")}
              className="gap-2 rounded-full"
            >
              <Plus className="size-4" />
              추억 조각 추가
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <SkeletonTimeline />
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={() => nav("/memories/new")} />
        ) : (
          <Tabs value={view}>
            <TabsContent value="timeline" className="m-0">
              <div className="relative">
                <TimelineLarge
                  items={filtered}
                  onOpen={(id) => nav(`/memories/${id}`)}
                  onSaveMemo={(id, memo) => {
                    setItems((prev) =>
                      prev.map((it) => (it.id === id ? { ...it, memo } : it))
                    );
                  }}
                />
                <MonthNavigator months={months} />
              </div>
            </TabsContent>

            <TabsContent value="list" className="m-0">
              <ListViewMasonry
                items={filtered}
                onOpen={(id) => nav(`/memories/${id}`)}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}

/* -------------------------------
   ✅ 메모 패드 (기본 읽기모드)
-------------------------------- */
function MemoPad({
  fragment,
  outerSide,
  onSaved,
}: {
  fragment: Fragment & { memo?: string | null };
  outerSide: "left" | "right";
  onSaved?: (memo: string) => void;
}) {
  // 기본값: 읽기모드
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(fragment.memo ?? "");
  const [saving, setSaving] = useState(false);

  const placeClass =
    outerSide === "left"
      ? "left-0 pl-0 md:pl-4 justify-start text-left"
      : "right-0 pr-0 md:pr-4 justify-end text-right";

  const dateStr = formatDate(fragment.event_date);

  return (
    <div
      className={cn(
        "absolute top-1/2 -translate-y-1/2 w-[min(58ch,42vw)] md:w-[min(64ch,40vw)]",
        "flex flex-col gap-3 "
      )}
      style={{
        ...(outerSide === "left" ? { left: 0 } : { right: 0 }),
      }}
    >
      <div
        className={cn(
          "relative rounded-2xl p-5 md:p-6",
          "bg-[rgba(255,252,246,0.96)] ring-1 ring-amber-200/40",
          "shadow-[0_8px_28px_-16px_rgba(120,85,40,0.28)]"
        )}
      >
        {/* 날짜 & 제목 — 강한 구분 */}
        <div className={cn("mb-3", placeClass)}>
          <div className="text-[13px] md:text-[14px] tabular-nums text-stone-500 tracking-[0.03em]">
            {dateStr}
          </div>
          <div
            className={cn(
              "mt-1 font-extrabold text-stone-900 font-hand",
              "text-[26px] sm:text-[28px] md:text-[32px] leading-tight"
            )}
            style={{ textShadow: "0 0 1px rgba(0,0,0,0.06)" }}
          >
            {fragment.title || "제목 없음"}
          </div>

          {/* 감성 구분선 */}
          <div className="mt-2 h-[10px] w-full bg-[radial-gradient(closest-side,rgba(120,85,40,0.25),transparent_70%)] opacity-35 rounded-full" />
        </div>

        {/* 메모 본문 */}
        {editing ? (
          <>
            <textarea
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="그날의 감정, 소소한 메모를 남겨보자…"
              className={cn(
                "w-full min-h-[160px] md:min-h-[190px] resize-y rounded-xl border",
                "bg-white/90 focus:bg-white focus:outline-none",
                "p-3 text-[14.5px] md:text-[16px] leading-relaxed",
                "font-hand"
              )}
            />
            <div className={cn("mt-2 flex gap-2", placeClass)}>
              <Button
                size="sm"
                className="rounded-full"
                onClick={async () => {
                  setSaving(true);
                  try {
                    await updateFragment(fragment.id, { memo: val });
                    onSaved?.(val);
                    setEditing(false);
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
              >
                {saving ? "저장 중…" : "메모 저장"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                취소
              </Button>
            </div>
          </>
        ) : (
          <>
            <div
              className={cn(
                "whitespace-pre-wrap text-[14.5px] md:text-[16px] leading-relaxed",
                "text-stone-800/95 font-hand"
              )}
            >
              {val || "아직 메모가 없어요. ‘메모 수정’으로 기록해볼까요?"}
            </div>
            <div className={cn("mt-2 flex gap-2", placeClass)}>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => setEditing(true)}
              >
                메모 수정
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* =========================
 * 비율 측정 훅
 * =======================*/
function useImageAspect(src?: string | null) {
  const [ratio, setRatio] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src) {
      setRatio(null);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = src;
    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth || 4;
      const h = img.naturalHeight || 3;
      setRatio(w / h);
      setLoaded(true);
    };
    img.onerror = () => {
      if (cancelled) return;
      setRatio(4 / 3);
      setLoaded(true);
    };
    return () => {
      cancelled = true;
    };
  }, [src]);

  return { ratio, loaded };
}

/* =========================
 * PolaroidFrame
 * =======================*/
function PolaroidFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative w-full bg-[linear-gradient(180deg,#3a3a3a_0%,#2f2f2f_55%,#252525_100%)] rounded-[14px] p-2 ",
        "ring-1 ring-stone-200/40 shadow-[0_6px_20px_-12px_rgba(0,0,0,0.22)]"
      )}
    >
      <div className="relative rounded-[10px] overflow-hidden bg-neutral-200">
        {children}
      </div>
    </div>
  );
}

function ImageBox({
  src,
  alt,
  minHeight = 180,
  maxHeight = 640,
  onOpen,
  hearts = 0,
}: {
  src?: string | null;
  alt?: string | null;
  minHeight?: number;
  maxHeight?: number;
  onOpen: () => void;
  hearts?: number;
}) {
  const { ratio, loaded } = useImageAspect(src ?? undefined);
  const aspectRatio = ratio ?? 4 / 3;
  const clampStyle: React.CSSProperties = {
    aspectRatio: String(aspectRatio),
    minHeight,
    maxHeight,
  };

  return (
    <div className="scale-[0.82] origin-top">
      <PolaroidFrame>
        {/* ✅ button이 최상위 클릭 레이어가 되도록 */}
        <button
          type="button"
          onClick={onOpen}
          aria-label={alt ?? "사진 보기"}
          className={cn(
            "group relative block w-full h-full rounded-[10px]",
            "p-0 m-0 border-0 overflow-hidden",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "leading-none align-top"
          )}
          style={clampStyle}
        >
          {/* 이미지 (포인터 이벤트 차단) */}
          {src ? (
            <>
              {!loaded && (
                <div className="absolute inset-0 animate-pulse bg-neutral-200/60 dark:bg-neutral-700/40 pointer-events-none" />
              )}
              <img
                src={src}
                alt={alt ?? ""}
                className={cn(
                  "absolute inset-0 h-full w-full object-contain pointer-events-none",
                  "transition-transform duration-500 will-change-transform",
                  "group-hover:scale-[1.015]"
                )}
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </>
          ) : (
            <div className="absolute inset-0 pointer-events-none" />
          )}

          {/* ❤️ 하트 배지 (버튼 내부, 클릭 방해 X) */}
          <div
            className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-background/85 backdrop-blur px-2.5 py-1 text-[12px] shadow-sm ring-1 ring-border pointer-events-none"
            title={`하트 ${hearts}개`}
            aria-label="하트 수"
          >
            <span aria-hidden>❤️</span>
            <span className="tabular-nums">{hearts}</span>
          </div>
        </button>
      </PolaroidFrame>
    </div>
  );
}

/* =========================
 * 📚 리스트 (Masonry)
 * =======================*/
function ListViewMasonry({
  items,
  onOpen,
}: {
  items: Fragment[];
  onOpen: (id: string | number) => void;
}) {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:balance] ">
      {items.map((f) => {
        return (
          <div key={f.id} className="mb-5 break-inside-avoid">
            <ImageBox
              src={
                f.cover_photo_path ? publicUrl(f.cover_photo_path) : undefined
              }
              alt={f.title ?? ""}
              onOpen={() => onOpen(f.id)}
              hearts={f.hearts ?? 0}
            />
          </div>
        );
      })}
    </div>
  );
}

/* =========================
 * 🗓 타임라인: 가로 배너 + 이모지 1개 포함 멘트
 * =======================*/
function TimelineLarge({
  items,
  onOpen,
  onSaveMemo,
}: {
  items: Fragment[];
  onOpen: (id: string | number) => void;
  onSaveMemo: (id: Fragment["id"], memo: string) => void;
}) {
  const groups = useMemo(() => groupByYearMonth(items), [items]);
  return (
    <div className="relative">
      {groups.map(({ ym, rows }) => {
        return (
          <MonthSection
            key={ym}
            ym={ym}
            rows={rows}
            onOpen={onOpen}
            onSaveMemo={onSaveMemo}
          />
        );
      })}
    </div>
  );
}

function MonthSection({
  ym,
  rows,
  onOpen,
  onSaveMemo,
}: {
  ym: string;
  rows: (Fragment & { memo?: string | null })[];
  onOpen: (id: string | number) => void;
  onSaveMemo: (id: Fragment["id"], memo: string) => void;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const monthNum = parseMonthFromYm(ym);
  const theme = monthTheme(monthNum);
  const emoji = monthEmoji(monthNum);

  return (
    <section
      ref={sectionRef}
      id={ymToId(ym)}
      className={cn("relative py-12", theme.sectionBg ?? "")}
    >
      {/* 월 가로 배너 */}
      <div className="mx-auto mb-8 w-[min(1100px,96%)]">
        <div
          className={cn(
            "relative rounded-2xl px-6 py-5",
            "bg-white/92 ring-1 ring-amber-200/50",
            "shadow-[0_18px_36px_-22px_rgba(120,85,40,0.28)]"
          )}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="text-[20px] md:text-[24px] font-extrabold font-hand text-stone-900">
                {monthNum}월
              </div>
              <div className="text-[12.5px] md:text-[13.5px] tabular-nums text-stone-500">
                {ym}
              </div>
            </div>
            <div className="text-[13.5px] md:text-[15px] text-stone-800/95 font-hand">
              <span className="mr-1" aria-hidden>
                {emoji}
              </span>
              {monthMessage(monthNum)}
            </div>
          </div>
        </div>
      </div>

      {/* 카드 + 메모 (양옆 배치) */}
      <div className="space-y-14">
        {rows.map((f, i) => {
          const isLeftCard = i % 2 === 0;
          const outerSide: "left" | "right" = isLeftCard ? "right" : "left";

          return (
            <article key={f.id} className="relative">
              <div
                className={cn(
                  "md:w-[calc(50%-1.25rem)]",
                  isLeftCard
                    ? "md:pr-10 md:ml-0 md:mr-auto"
                    : "md:pl-10 md:ml-auto md:mr-0"
                )}
              >
                <ImageBox
                  src={
                    f.cover_photo_path
                      ? publicUrl(f.cover_photo_path)
                      : undefined
                  }
                  alt={f.title ?? ""}
                  onOpen={() => onOpen(f.id)}
                  hearts={f.hearts ?? 0}
                />
              </div>

              <MemoPad
                fragment={f}
                outerSide={outerSide}
                onSaved={(memo) => onSaveMemo(f.id, memo)}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* =========================
 * 월 내비게이터
 * =======================*/
function MonthNavigator({ months }: { months: string[] }) {
  const parsed = useMemo(
    () =>
      months.map((ym) => {
        const m = ym.match(/(\d+)\s*년\s*(\d+)\s*월/);
        return {
          ym,
          year: m ? m[1] : "",
          month: m ? m[2].padStart(2, "0") : ym,
          id: ymToId(ym),
        };
      }),
    [months]
  );
  const ids = parsed.map((p) => p.id);

  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top?.target?.id) setActive(top.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ids]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = ids.findIndex((id) => id === active);
    if (e.key === "ArrowDown" && idx < ids.length - 1) {
      document
        .getElementById(ids[idx + 1])
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (e.key === "ArrowUp" && idx > 0) {
      document
        .getElementById(ids[idx - 1])
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (parsed.length === 0) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-20 max-h[70vh] flex-col items-center gap-2 overflow-y-auto rounded-2xl bg-white/80 px-2 py-3 shadow-md ring-1 ring-border backdrop-blur"
        tabIndex={0}
        role="navigation"
        aria-label="월 타임라인 내비게이션"
        onKeyDown={onKeyDown}
      >
        {parsed.map((p, idx) => {
          const prev = parsed[idx - 1];
          const yearChanged = !prev || prev.year !== p.year;
          const isActive = active === p.id;
          return (
            <div key={p.id} className="w-full flex flex-col items-center">
              {yearChanged && (
                <div className="my-1 text-[11px] font-semibold text-muted-foreground tabular-nums">
                  {p.year}
                </div>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label={`${p.ym}로 이동`}
                    aria-current={isActive ? "date" : undefined}
                    onClick={() =>
                      document
                        .getElementById(p.id)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className={[
                      "min-w[52px] rounded-full px-3 py-1 text-xs tabular-nums ring-1 transition",
                      "hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isActive
                        ? "bg-rose-100 text-rose-700 ring-rose-200"
                        : "bg-background text-muted-foreground ring-border",
                    ].join(" ")}
                  >
                    {Number(p.month)}월
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="left"
                  className="px-2 py-1 text-xs font-medium tabular-nums"
                >
                  {p.ym}
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}

        <button
          onClick={() => {
            const last = ids[ids.length - 1];
            document
              .getElementById(last)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="mt-1 rounded-full px-3 py-1 text-xs bg-background ring-1 ring-border hover:ring-primary/50 shadow-sm"
        >
          현재 달
        </button>
      </div>
    </TooltipProvider>
  );
}

/* =========================
 * Helpers
 * =======================*/
function formatDate(d: string | number | Date) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function groupByYearMonth(rows: Fragment[]) {
  const fmt = (d: string | number | Date) => {
    const dd = new Date(d);
    const y = dd.getFullYear();
    const m = dd.getMonth() + 1;
    return `${y}년 ${m.toString().padStart(2, "0")}월`;
  };
  const map = new Map<string, Fragment[]>();
  rows.forEach((r) => {
    const key = fmt(r.event_date);
    map.set(key, [...(map.get(key) ?? []), r]);
  });
  return Array.from(map.entries()).map(([ym, rows]) => ({ ym, rows }));
}

function monthsFromItems(items: Fragment[]) {
  return groupByYearMonth(items).map((g) => g.ym);
}

function ymToId(ym: string) {
  const m = ym.match(/(\d+)\s*년\s*(\d+)\s*월/);
  if (!m) return `sec-${ym.replace(/\s+/g, "-")}`;
  const y = m[1];
  const mm = m[2].padStart(2, "0");
  return `sec-${y}-${mm}`;
}

function parseMonthFromYm(ym: string) {
  const m = ym.match(/(\d+)\s*년\s*(\d+)\s*월/);
  if (!m) return NaN;
  return Number(m[2]);
}

/** 월별 보조 배경 */
function monthTheme(m: number) {
  switch (m) {
    case 3:
      return {
        sectionBg:
          "bg-[radial-gradient(200px_140px_at_20%_30%,rgba(255,182,193,0.08),transparent_65%)]",
      };
    case 5:
      return {
        sectionBg:
          "bg-[radial-gradient(220px_140px_at_80%_30%,rgba(255,214,150,0.08),transparent_65%)]",
      };
    case 7:
      return {
        sectionBg:
          "bg-[radial-gradient(220px_140px_at_20%_70%,rgba(255,230,120,0.08),transparent_65%)]",
      };
    case 9:
      return {
        sectionBg:
          "bg-[radial-gradient(200px_140px_at_75%_35%,rgba(120,85,40,0.08),transparent_65%)]",
      };
    case 10:
      return {
        sectionBg:
          "bg-[radial-gradient(220px_160px_at_30%_60%,rgba(255,160,80,0.09),transparent_70%)]",
      };
    case 12:
      return {
        sectionBg:
          "bg-[radial-gradient(220px_140px_at_70%_65%,rgba(80,180,140,0.08),transparent_65%)]",
      };
    default:
      return { sectionBg: "" };
  }
}

/** 월별 이모지(1개 고정) */
function monthEmoji(m: number) {
  switch (m) {
    case 1:
      return "❄️";
    case 2:
      return "💐";
    case 3:
      return "🌷";
    case 4:
      return "🌸";
    case 5:
      return "🧸";
    case 6:
      return "☔️";
    case 7:
      return "🌻";
    case 8:
      return "🏖️";
    case 9:
      return "☕";
    case 10:
      return "🍁";
    case 11:
      return "🌬️";
    case 12:
      return "🎄";
    default:
      return "🗓️";
  }
}

/** 월별 멘트 (이모지는 배너에서 앞에 1개만 붙임) */
function monthMessage(m: number) {
  const map: Record<number, string> = {
    1: "새해의 첫 페이지, 우리 이야기도 새로 또렷해져요.",
    2: "잔잔한 바람처럼, 둘의 마음도 포근하게.",
    3: "꽃 피는 계절, 우리 기억도 톡톡 싹이 나요.",
    4: "햇살이 스며드는 오후, 함께라 더 맑은 하루.",
    5: "초록이 짙어질수록 마음도 무르익는 달.",
    6: "빗소리 사이사이, 둘만의 속삭임이 퍼져요.",
    7: "한여름 햇살만큼 선명한 웃음이 가득.",
    8: "느릿한 오후, 우리 리듬에 맞춰 쉬어가기.",
    9: "따뜻한 한 잔처럼, 오늘도 다정한 마음.",
    10: "바스락거리는 낙엽처럼, 단단해진 우리.",
    11: "차가운 공기 속, 더 가까워지는 거리.",
    12: "차분한 겨울밤, 너와라면 늘 포근해.",
  };
  return map[m] ?? "오늘의 우리를 담아두는 시간.";
}

/* =========================
 * 빈/로딩 상태
 * =======================*/
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="mx-auto max-w-xl p-8 text-center rounded-3xl bg-[rgba(250,247,242,0.98)] ring-1 ring-amber-200/40 relative overflow-hidden">
      <div className="mx-auto mb-3 size-14 rounded-full bg-muted" />
      <h2 className="text-lg font-semibold text-amber-900/90">
        아직 등록된 추억 조각이 없어요
      </h2>
      <p className="mt-1 text-sm text-amber-900/70">
        대표 사진과 제목을 넣어 두 분의 기억을 모아보세요.
      </p>
      <Button onClick={onCreate} className="mt-4 rounded-full">
        첫 추억 조각 만들기
      </Button>
    </Card>
  );
}

function SkeletonTimeline() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card
          key={i}
          className="overflow-hidden rounded-3xl bg-[rgba(250,247,242,0.9)] ring-1 ring-amber-200/40"
        >
          <div className="w-full min-h={[180] as unknown as number} animate-pulse rounded-2xl bg-gradient-to-br from-neutral-200/60 to-neutral-100/60" />
        </Card>
      ))}
    </div>
  );
}
