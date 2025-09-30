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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { listFragments } from "./api";
import type { Fragment } from "./types";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { publicUrl } from "./storage";
import { Plus } from "lucide-react";

/** ---- Views ---- */
type ViewKey = "timeline" | "list";

/* =========================
 * Page
 * =======================*/
export default function FragmentListPage() {
  const nav = useNavigate();
  const { couple } = useCoupleContext();

  const [items, setItems] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewKey>(
    () => (localStorage.getItem("mem:view") as ViewKey) || "timeline"
  );

  // 헤더 축소(스크롤) - 스타일 변경은 최소화
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 초기 로드
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

  // 오래된 날짜순 정렬(과거→현재)
  const filtered = useMemo(() => {
    return [...items].sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }, [items]);

  const months = useMemo(() => monthsFromItems(filtered), [filtered]);

  useEffect(() => {
    localStorage.setItem("mem:view", view);
  }, [view]);

  const isTimeline = view === "timeline";

  return (
    <div className="w-full sm:w-2/3 mx-auto max-w-7xl p-4 space-y-6">
      {/* Sticky Toolbar (크기/여백 유지) */}
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
          {/* 좌: Switch 토글 (리스트 ↔ 타임라인) */}
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

          {/* 우: 추가 버튼 (같은 row, 오른쪽 끝) */}
          <Button onClick={() => nav("/memories/new")} className="gap-2">
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
              />
              {/* 월 네비게이션: 데스크톱 패널 + 모바일 시트 */}
              <MonthNavigator months={months} />
              <MonthNavigatorMobile months={months} />
            </div>
          </TabsContent>

          <TabsContent value="list" className="m-0">
            <ListView
              items={filtered}
              onOpen={(id) => nav(`/memories/${id}`)}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* =========================
 * ImageBox — 기존 이미지 카드 (그대로)
 * =======================*/
function ImageBox({
  src,
  alt,
  hearts = 0,
  aspect = "aspect-[4/3]",
}: {
  src?: string | null;
  alt?: string | null;
  hearts?: number;
  aspect?: string;
}) {
  return (
    <div
      className={`relative w-full ${aspect} bg-muted rounded-t-lg overflow-hidden`}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? ""}
          className="absolute inset-0 w-full h-full object-contain will-change-transform transition-[filter,transform] duration-300"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      ) : (
        <div className="absolute inset-0" />
      )}

      {/* 하트 오버레이: 좌상단 고정 */}
      <div
        className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/85 backdrop-blur px-2 py-1 text-[11px] shadow"
        title={`하트 ${hearts}개`}
        aria-label="하트 수"
      >
        <span aria-hidden>❤️</span>
        <span className="tabular-nums">{hearts}</span>
      </div>
    </div>
  );
}

/* =========================
 * List View — 기존 그리드 느낌
 * =======================*/
function ListView({
  items,
  onOpen,
}: {
  items: Fragment[];
  onOpen: (id: string | number) => void;
}) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
      {items.map((f) => (
        <Card
          key={f.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(f.id)}
          onKeyDown={(e) => e.key === "Enter" && onOpen(f.id)}
          className="group overflow-hidden transition hover:-translate-y-[1px] hover:shadow-lg hover:ring-1 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`${f.title ?? "무제"} — ${formatDate(f.event_date)}`}
        >
          <ImageBox
            src={f.cover_photo_path ? publicUrl(f.cover_photo_path) : undefined}
            alt={f.title}
            hearts={f.hearts ?? 0}
            aspect="aspect-[4/3]"
          />
          <div className="border-t border-border/60" />
          <div className="px-3 pt-2 pb-3">
            <div className="text-[12px] text-muted-foreground/90 tabular-nums tracking-wide">
              {formatDate(f.event_date)}
            </div>
            <div
              className="mt-1 text-[15px] font-semibold leading-snug line-clamp-2 tracking-tight"
              title={f.title ?? ""}
            >
              {f.title}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* =========================
 * Timeline Large — 중앙 점선 레일 + 좌/우 교차
 *  - 모바일에도 중앙 레일 보이도록 'hidden md:block' 제거
 * =======================*/
function TimelineLarge({
  items,
  onOpen,
}: {
  items: Fragment[];
  onOpen: (id: string | number) => void;
}) {
  const groups = useMemo(() => groupByYearMonth(items), [items]);

  return (
    <div className="relative">
      {groups.map(({ ym, rows }) => (
        <section key={ym} id={ymToId(ym)} className="relative py-10">
          {/* 중앙 점선 레일 - 모바일에서도 표시 */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-full -translate-x-1/2 border-l-2 border-dashed border-muted-foreground/40"
            aria-hidden
          />

          {/* 월 헤더칩 (sticky) */}
          <div className="sticky top-24 z-10 mb-8 text-center">
            <div className="inline-flex rounded-full bg-gradient-to-r from-amber-50/90 to-white/90 backdrop-blur px-4 py-1.5 text-[12px] tabular-nums font-semibold shadow ring-1 ring-border">
              {ym}
            </div>
          </div>

          {/* 아래로 진행하는 지그재그 (모바일은 자연스럽게 1열) */}
          <div className="space-y-12">
            {rows.map((f, i) => {
              const left = i % 2 === 0;
              const mt = left ? 0 : 8; // 오른쪽 카드 오프셋
              return (
                <article key={f.id} className="relative">
                  <div
                    className={[
                      "md:w-[calc(50%-2rem)]",
                      left
                        ? "md:pr-10 md:ml-0 md:mr-auto"
                        : "md:pl-10 md:ml-auto md:mr-0",
                    ].join(" ")}
                    style={{ marginTop: mt }}
                  >
                    <Card
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpen(f.id)}
                      onKeyDown={(e) => e.key === "Enter" && onOpen(f.id)}
                      className="group overflow-hidden transition hover:-translate-y-[1px] hover:shadow-lg hover:ring-1 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`${f.title ?? "무제"} — ${formatDate(
                        f.event_date
                      )}`}
                    >
                      <ImageBox
                        src={
                          f.cover_photo_path
                            ? publicUrl(f.cover_photo_path)
                            : undefined
                        }
                        alt={f.title}
                        hearts={f.hearts ?? 0}
                        aspect="aspect-[16/9]"
                      />
                      <div className="border-t border-border/60" />
                      <div className="px-3 pt-2 pb-3">
                        <div className="text-[12px] text-muted-foreground/90 tabular-nums tracking-wide">
                          {formatDate(f.event_date)}
                        </div>
                        <div
                          className="mt-1 text-[16px] md:text-[17px] font-semibold leading-snug line-clamp-2 tracking-tight"
                          title={f.title ?? ""}
                        >
                          {f.title}
                        </div>
                      </div>
                    </Card>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* =========================
 * Month Navigator — 데스크톱(오른쪽 중앙 카드 패널)
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

  // 스크롤 스파이
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

  // 키보드 네비
  const wrapperRef = useRef<HTMLDivElement | null>(null);
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
        ref={wrapperRef}
        className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-20 max-h-[70vh] flex-col items-center gap-2 overflow-y-auto rounded-2xl bg-white/80 px-2 py-3 shadow-md ring-1 ring-border backdrop-blur"
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
                    onClick={() =>
                      document
                        .getElementById(p.id)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className={[
                      "min-w-[52px] rounded-full px-3 py-1 text-xs tabular-nums ring-1 transition",
                      "hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isActive
                        ? "bg-primary text-primary-foreground ring-primary"
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

        {/* 현재 달로 */}
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
 * Month Navigator (Mobile) — 하단 Sheet + FAB
 * =======================*/
function MonthNavigatorMobile({ months }: { months: string[] }) {
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

  const [open, setOpen] = useState(false);

  if (parsed.length === 0) return null;

  // 연도->월 묶음
  const byYear = parsed.reduce<Record<string, typeof parsed>>((acc, p) => {
    acc[p.year] = acc[p.year] ? [...acc[p.year], p] : [p];
    return acc;
  }, {});

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* FAB */}
      <SheetTrigger asChild>
        <button
          className="lg:hidden fixed right-4 bottom-5 z-20 rounded-full bg-white/90 backdrop-blur px-4 py-2 text-sm font-semibold shadow-md ring-1 ring-border"
          aria-label="월 이동 열기"
        >
          월 이동
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[55vh] p-4">
        <SheetHeader>
          <SheetTitle>월로 빠르게 이동</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6 overflow-y-auto max-h-[calc(55vh-64px)] pr-1">
          {Object.keys(byYear)
            .sort()
            .map((y) => (
              <section key={y} className="space-y-2">
                <div className="text-sm font-semibold text-muted-foreground tabular-nums">
                  {y}년
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {byYear[y].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        document
                          .getElementById(p.id)
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        setOpen(false);
                      }}
                      className="rounded-xl px-3 py-2 text-sm ring-1 ring-border bg-background hover:ring-primary/50 active:scale-[0.99] transition"
                    >
                      {Number(p.month)}월
                    </button>
                  ))}
                </div>
              </section>
            ))}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const last = ids[ids.length - 1];
              document
                .getElementById(last)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
              setOpen(false);
            }}
          >
            현재 달
          </Button>
        </div>
      </SheetContent>
    </Sheet>
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

// "2025년 09월" → "sec-2025-09"
function ymToId(ym: string) {
  const m = ym.match(/(\d+)\s*년\s*(\d+)\s*월/);
  if (!m) return `sec-${ym.replace(/\s+/g, "-")}`;
  const y = m[1];
  const mm = m[2].padStart(2, "0");
  return `sec-${y}-${mm}`;
}

/* =========================
 * Empty & Skeleton
 * =======================*/
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto mb-3 size-14 rounded-full bg-muted" />
      <h2 className="text-lg font-semibold">아직 등록된 추억 조각이 없어요</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        대표 사진과 제목을 넣어 두 분의 기억을 모아보세요.
      </p>
      <Button onClick={onCreate} className="mt-4">
        첫 추억 조각 만들기
      </Button>
    </Card>
  );
}

function SkeletonTimeline() {
  return (
    <div className="relative">
      {/* 중앙 레일 힌트 */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-full -translate-x-1/2 border-l-2 border-dashed border-muted-foreground/30" />

      <div className="space-y-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="w-full aspect-[4/3] animate-pulse bg-muted rounded-t-lg" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
