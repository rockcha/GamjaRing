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

  // 헤더 축소(스크롤)
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

  // 과거→현재 정렬
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
    <>
      {/* 전역 필름 그레인 */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.035]"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22 viewBox=%220 0 160 160%22><filter id=%22n%22 x=%220%22 y=%220%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22160%22 height=%22160%22 filter=%22url(%23n)%22 opacity=%220.35%22/></svg>')",
          backgroundRepeat: "repeat",
        }}
        aria-hidden
      />

      <div className="relative z-[2] w-full sm:w-2/3 mx-auto max-w-7xl p-4 space-y-6">
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
    </>
  );
}

/* =========================
 * 중앙 🐾 레일 (걷는 느낌 버전)
 * - 좌우 번갈아가며 한 발씩 찍힘
 * - 각 스텝마다 가로 jitter/회전 랜덤
 * - step으로 촘촘도 조절
 * =======================*/
type PawRailWalkingProps = {
  /** 세로 간격(px). 기본 44. (촘촘: 32~40 권장) */
  step?: number;
  /** 좌우 흔들림 최대치(px) */
  jitterX?: number;
  /** 회전 최대치(deg) */
  angleRange?: number;
  /** 이모지 시퀀스(기본 🐾). 사람발은 ["👣","👣"] */
  footprints?: string[];
  /** 좌우 오프셋(px). 기본 22 (중앙선에서 좌/우 거리) */
  sideOffset?: number;
  /** 패럴랙스 강도(스크롤 반응). 0~0.4 추천 */
  parallax?: number;
  /** 투명도(0~1) */
  opacity?: number;
};

function PawRailWalking({
  step = 36,
  jitterX = 7,
  angleRange = 12,
  footprints = ["🐾"],
  sideOffset = 18,
  parallax = 0.12,
  opacity = 0.7,
}: PawRailWalkingProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [h, setH] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // 섹션 높이 측정 + 스크롤 패럴랙스
  useEffect(() => {
    if (!wrapRef.current) return;
    const sec = wrapRef.current.parentElement; // section 상대
    if (!sec) return;

    const ro = new ResizeObserver(() => setH(sec.clientHeight));
    ro.observe(sec);
    setH(sec.clientHeight);

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollY(window.scrollY || 0));
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // 필요한 발자국 개수
  const count = Math.max(0, Math.ceil(h / step) + 2);

  // 랜덤값(고정 시드)
  const seeds = useMemo(() => {
    const rnd = (i: number) => {
      const x = Math.sin(i * 9301 + 49297) * 233280;
      return x - Math.floor(x);
    };
    return Array.from({ length: count }).map((_, i) => {
      const r = rnd(i);
      const signed = r * 2 - 1; // -1~1
      return {
        jitter: Math.round(signed * jitterX),
        rot: signed * angleRange,
        emo: footprints[i % footprints.length],
      };
    });
  }, [count, jitterX, angleRange, footprints]);

  const py = (idx: number) => scrollY * parallax * (idx % 2 === 0 ? 1 : -1);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-full w-16"
      style={{ opacity }}
      aria-hidden
    >
      {/* 중앙 점선 가이드 — 필요 없으면 제거 */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full border-l border-dashed border-muted-foreground/30" />
      {Array.from({ length: count }).map((_, i) => {
        const y = i * step;
        const side = i % 2 === 0 ? -1 : 1; // 좌/우 교차
        const dx = side * sideOffset + seeds[i]?.jitter;
        const rot = seeds[i]?.rot ?? 0;
        const emo = seeds[i]?.emo ?? "🐾";
        return (
          <div
            key={i}
            className="absolute top-0 left-1/2 select-none"
            style={{
              transform: `translate(calc(-50% + ${dx}px), ${
                y + py(i)
              }px) rotate(${rot}deg)`,
              filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.06))",
              willChange: "transform",
            }}
          >
            <span
              className="block leading-none"
              style={{ fontSize: "16px" }}
              aria-hidden
            >
              {emo}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* =========================
 * ImageBox — 액자 스타일 (프레임 + 매트 + 사진)
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
      className={`group relative w-full ${aspect} bg-transparent rounded-[22px]`}
    >
      {/* 프레임 */}
      <div
        className={[
          "absolute inset-0 ",
          "bg-gradient-to-b from-stone-500/90 to-stone-400/90",
          "ring-1 ring-stone-300/80 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.5)]",
          "p-2 md:p-3 transition-transform group-hover:[transform:rotate(-0.2deg)]",
        ].join(" ")}
      >
        {/* 매트(여백) */}
        <div
          className={[
            "h-full w-full rounded-[18px] ",
            "ring-1 ring-stone-200/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]",
            "p-1.5 md:p-2",
          ].join(" ")}
        >
          {/* 사진 */}
          <div className="relative h-full w-full rounded-[14px] overflow-hidden bg-neutral-100">
            {src ? (
              <img
                src={src}
                alt={alt ?? ""}
                className={[
                  "absolute inset-0 h-full w-full object-contain",
                  "transition-transform duration-500 will-change-transform",
                  "group-hover:scale-[1.01]",
                ].join(" ")}
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="absolute inset-0" />
            )}

            {/* 얕은 비네트 */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 120% at 50% 45%, transparent 60%, rgba(0,0,0,0.06) 100%)",
              }}
              aria-hidden
            />
          </div>
        </div>
      </div>

      {/* 하트 오버레이 */}
      <div
        className="absolute left-6 top-6 inline-flex items-center gap-1 rounded-full bg-background/80 backdrop-blur px-2.5 py-1.5 text-[11px] shadow-sm ring-1 ring-border"
        title={`하트 ${hearts}개`}
        aria-label="하트 수"
      >
        <span aria-hidden>❤️</span>
        <span className="tabular-nums">{hearts}</span>
      </div>

      {/* 바닥 그림자 */}
      <div
        className="pointer-events-none absolute inset-x-4 -bottom-1 h-2 rounded-full"
        style={{ boxShadow: "0 16px 20px -16px rgba(0,0,0,0.18)" }}
        aria-hidden
      />
    </div>
  );
}

/* =========================
 * List View — 이미지 전용 카드
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
        </Card>
      ))}
    </div>
  );
}

/* =========================
 * Rail Caption (Outer) — 카드 반대편 측면 캡션
 * =======================*/
function RailCaptionOuter({
  outerSide, // "left" | "right"
  date,
  title,
}: {
  outerSide: "left" | "right";
  date: string;
  title?: string | null;
}) {
  const place =
    outerSide === "left"
      ? "left-0 pl-3 sm:pl-4 md:pl-6 items-start text-left"
      : "right-0 pr-3 sm:pr-4 md:pr-6 items-end text-right";

  return (
    <div
      className={[
        "pointer-events-none absolute top-1/2 -translate-y-1/2",
        "w-[min(46ch,38vw)] md:w-[min(54ch,34vw)]",
        "flex flex-col gap-1",
        place,
      ].join(" ")}
      style={{ lineHeight: 1.12 }}
    >
      {/* 날짜 */}
      <div className="text-[15px] md:text-[16px] tracking-[0.08em] tabular-nums text-muted-foreground/90 blur-[0.1px]">
        {date}
      </div>

      {/* 제목 */}
      <div
        className={[
          "mt-0.5 font-semibold text-foreground/90",
          "text-[22px] sm:text-[24px] md:text-[28px] lg:text-[30px]",
          "tracking-[-0.012em] [text-wrap:balance] opacity-95",
        ].join(" ")}
        style={{
          letterSpacing: "-0.012em",
          transform: "rotate(-0.2deg)",
          textShadow: "0 0 1px rgba(0,0,0,0.10), 0 1px 1.5px rgba(0,0,0,0.06)",
        }}
      >
        📌 {title}
      </div>
    </div>
  );
}

/* =========================
 * Timeline Large — 중앙 레일 + 좌/우 교차
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
      {groups.map(({ ym, rows }) => {
        const monthNum = parseMonthFromYm(ym);
        const emoji = monthEmoji(monthNum);
        return (
          <section key={ym} id={ymToId(ym)} className="relative py-10">
            {/* 중앙 🐾 레일 (랜덤 걷기) */}
            <PawRailWalking
              step={40}
              sideOffset={20}
              jitterX={7}
              angleRange={12}
              parallax={0.12}
              footprints={["🎀"]} // 사람발: ["👣","👣"]
              opacity={0.9}
            />

            {/* 월 헤더칩 (sticky) */}
            <div className="sticky top-24 z-10 mb-8 text-center">
              <div
                className={[
                  "inline-flex items-center gap-1 rounded-full",
                  "bg-gradient-to-r from-amber-50/85 to-white/85",
                  "px-4 py-1.5 text-[12px] tabular-nums font-semibold",
                  "shadow ring-1 ring-border backdrop-blur-md",
                ].join(" ")}
              >
                <span className="opacity-95">{emoji}</span>
                <span className="opacity-95">{ym}</span>
              </div>
            </div>

            {/* 지그재그 */}
            <div className="space-y-12">
              {rows.map((f, i) => {
                const isLeftCard = i % 2 === 0;
                const mt = isLeftCard ? 0 : 8;
                const dateStr = formatDate(f.event_date);
                const outerSide: "left" | "right" = isLeftCard
                  ? "right"
                  : "left";

                return (
                  <article key={f.id} className="relative">
                    {/* 카드 */}
                    <div
                      className={[
                        "md:w-[calc(50%-2rem)]",
                        isLeftCard
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
                        aria-label={`${f.title ?? "무제"} — ${dateStr}`}
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
                      </Card>
                    </div>

                    {/* 측면 큰 캡션 */}
                    <RailCaptionOuter
                      outerSide={outerSide}
                      date={dateStr}
                      title={f.title}
                    />
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* =========================
 * Month Navigator — 데스크톱
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
          const monthNum = Number(p.month);
          const emoji = monthEmoji(monthNum);
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
                  <span className="mr-1">{emoji}</span>
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

  const byYear = parsed.reduce<Record<string, typeof parsed>>((acc, p) => {
    acc[p.year] = acc[p.year] ? [...acc[p.year], p] : [p];
    return acc;
  }, {});

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
                <div className="text-lg font-semibold text-muted-foreground tabular-nums">
                  {y}년
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {byYear[y].map((p) => {
                    const monthNum = Number(p.month);
                    const emoji = monthEmoji(monthNum);
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          document.getElementById(p.id)?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                          setOpen(false);
                        }}
                        className="rounded-xl px-3 py-2 text-sm ring-1 ring-border bg-background hover:ring-primary/50 active:scale-[0.99] transition"
                        title={p.ym}
                      >
                        <span className="mr-1">{emoji}</span>
                        {Number(p.month)}월
                      </button>
                    );
                  })}
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

// "2025년 09월" → 9
function parseMonthFromYm(ym: string) {
  const m = ym.match(/(\d+)\s*년\s*(\d+)\s*월/);
  if (!m) return NaN;
  return Number(m[2]);
}

// 월 이모지 매핑
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
      return "🍀";
    case 7:
      return "🌻";
    case 8:
      return "☔️";
    case 9:
      return "🍃";
    case 10:
      return "🍂";
    case 11:
      return "🍁";
    case 12:
      return "🎄";
    default:
      return "🗓️";
  }
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
      {/* 로딩 중에도 중앙 레일 느낌 유지 */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-full w-16 opacity-50">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full border-l border-dashed border-muted-foreground/30" />
      </div>
      <div className="space-y-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="w-full aspect-[4/3] animate-pulse bg-muted rounded-lg" />
          </Card>
        ))}
      </div>
    </div>
  );
}
