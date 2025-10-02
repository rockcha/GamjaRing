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
import { Plus, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

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
    () =>
      (typeof window !== "undefined"
        ? (localStorage.getItem("mem:view") as ViewKey)
        : null) || "timeline"
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
    if (typeof window !== "undefined") {
      localStorage.setItem("mem:view", view);
    }
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

      {/* 종이 질감 래퍼 + 말랑 그림자 (아이디어 #1) */}
      <div
        className={cn(
          "relative z-[2] w-full sm:w-[85%] lg:w-[78%] mx-auto max-w-7xl p-4 sm:p-5 space-y-6",
          "rounded-3xl bg-[rgba(250,247,242,0.98)] ring-1 ring-amber-200/40",
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
 * 중앙 레일 — 앵커-앵커 구간 고정 이모지
 * (아이디어 #3: 스티치 느낌/간격 조정)
 * =======================*/
type FixedRailProps = {
  emoji: string;
  step?: number; // 세로 간격(px)
  sideOffset?: number; // 좌우 번갈아 오프셋(px)
  opacity?: number;
  startPx?: number; // 섹션 기준 시작 Y
  endPx?: number; // 섹션 기준 끝 Y
};

function FixedRail({
  emoji,
  step = 44,
  sideOffset = 18,
  opacity = 0.95,
  startPx = 0,
  endPx,
}: FixedRailProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [h, setH] = useState(0);

  // 섹션 높이 측정(리사이즈/콘텐츠 로드 반영)
  useEffect(() => {
    if (!wrapRef.current) return;
    const sec = wrapRef.current.parentElement;
    if (!sec) return;

    const measure = () => setH(sec.clientHeight);
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(sec);

    // 이미지 로딩 후 변경 대응
    const imgs = Array.from(sec.querySelectorAll("img"));
    imgs.forEach((img) =>
      img.addEventListener("load", measure, { once: true })
    );

    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
    };
  }, []);

  const limitStart = Math.max(0, Math.min(h, startPx));
  const limitEnd = Math.max(limitStart, Math.min(h, endPx ?? h));
  const usableHeight = Math.max(0, limitEnd - limitStart);
  const count = Math.max(0, Math.floor(usableHeight / step) + 1);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-full w-16"
      style={{ opacity }}
      aria-hidden
    >
      {/* 중앙 스티치 가이드 */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full border-l border-dashed border-amber-300/40" />

      {/* 고정 배치된 이모지 (스탬프 톤) */}
      {Array.from({ length: count }).map((_, i) => {
        const y = limitStart + i * step;
        const side = i % 2 === 0 ? -1 : 1; // 좌우 교차
        const tx = `calc(-50% + ${side * sideOffset}px)`;
        return (
          <div
            key={i}
            className="absolute left-1/2 select-none"
            style={{
              top: `${y}px`,
              transform: `translateX(${tx})`,
              opacity: 1,
              filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.05))",
            }}
          >
            <span className="block leading-none" style={{ fontSize: 20 }}>
              {emoji}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* =========================
 * useImageAspect — naturalWidth/Height로 비율 측정
 * =======================*/
function useImageAspect(src?: string | null) {
  const [ratio, setRatio] = useState<number | null>(null); // width / height
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
 * ImageBox — 폴라로이드/스탬프 디테일 (아이디어 #4,5)
 * - 와시테이프
 * - 폴라로이드 하단 캡션
 * - 포토 넘버링 스티커
 * =======================*/
function ImageBox({
  src,
  alt,
  hearts = 0,
  minHeight = 220,
  maxHeight = 720,
  caption,
  indexSticker, // # 01, # 02...
}: {
  src?: string | null;
  alt?: string | null;
  hearts?: number;
  minHeight?: number;
  maxHeight?: number;
  caption?: string;
  indexSticker?: number | null;
}) {
  const { ratio, loaded } = useImageAspect(src ?? undefined);
  const aspectRatio = ratio ?? 4 / 3;
  const clampStyle: React.CSSProperties = {
    aspectRatio: String(aspectRatio),
    minHeight,
    maxHeight,
  };

  return (
    <div className="group relative w-full rounded-[24px]">
      {/* 와시테이프 (아이디어 #4a) */}
      <div className="pointer-events-none absolute -top-2 left-6 rotate-[-4deg] h-5 w-20 bg-amber-200/70 rounded-[4px] shadow-sm" />
      <div className="pointer-events-none absolute -top-1 right-8 rotate-[6deg] h-5 w-16 bg-pink-200/60 rounded-[4px] shadow-sm" />

      {/* 포토 넘버링 스티커 (아이디어 #4c) */}
      {typeof indexSticker === "number" && (
        <div className="absolute -left-2 -top-2 rounded-full bg-rose-100 text-rose-700 ring-1 ring-rose-200 text-[10px] px-2 py-0.5 shadow-sm">
          #{String(indexSticker + 1).padStart(2, "0")}
        </div>
      )}

      {/* 프레임 + 매트 + 사진 */}
      <div
        className={[
          "relative w-full",
          "bg-gradient-to-b from-stone-500/90 to-stone-400/90",
          "dark:from-stone-700/90 dark:to-stone-600/90",
          "ring-1 ring-stone-300/80 dark:ring-stone-500/70",
          "shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.5)]",
          "p-2.5 sm:p-3.5",
          "rounded-[24px]",
        ].join(" ")}
        style={clampStyle}
      >
        <div
          className={[
            "h-full w-full rounded-[18px]",
            "ring-1 ring-stone-200/80 dark:ring-stone-400/50",
            "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]",
            "p-1.5 sm:p-2",
          ].join(" ")}
        >
          <div className="relative h-full w-full rounded-[14px] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
            {src ? (
              <>
                {!loaded && (
                  <div className="absolute inset-0 animate-pulse bg-neutral-200/60 dark:bg-neutral-700/40" />
                )}
                <img
                  src={src}
                  alt={alt ?? ""}
                  className={[
                    "absolute inset-0 h-full w-full object-contain",
                    "transition-transform duration-500 will-change-transform",
                    "group-hover:scale-[1.015]",
                  ].join(" ")}
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </>
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

            {/* 폴라로이드 하단 캡션 (아이디어 #4b) */}
            {caption && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-white/85 backdrop-blur ring-1 ring-amber-100/60 rounded-b-[14px] flex items-center justify-center">
                <span className="text-[11px] text-amber-900/70 truncate px-3">
                  {caption}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하트 오버레이 (조금 키움, 아이디어 #5) */}
      <div
        className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-background/85 backdrop-blur px-3 py-1.5 text-[12px] shadow-sm ring-1 ring-border"
        title={`하트 ${hearts}개`}
        aria-label="하트 수"
      >
        <span aria-hidden>❤️</span>
        <span className="tabular-nums">{hearts}</span>
      </div>

      {/* 바닥 그림자 강화 */}
      <div
        className="pointer-events-none absolute inset-x-6 -bottom-1.5 h-2 rounded-full"
        style={{ boxShadow: "0 18px 22px -18px rgba(0,0,0,0.22)" }}
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
    <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
      {items.map((f, idx) => (
        <Card
          key={f.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(f.id)}
          onKeyDown={(e) => e.key === "Enter" && onOpen(f.id)}
          className="group overflow-hidden transition hover:-translate-y-[1px] hover:shadow-lg hover:ring-1 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-3xl"
          aria-label={`${f.title ?? "무제"} — ${formatDate(f.event_date)}`}
        >
          <ImageBox
            src={f.cover_photo_path ? publicUrl(f.cover_photo_path) : undefined}
            alt={f.title}
            hearts={f.hearts ?? 0}
            caption={f.title ?? formatDate(f.event_date)}
            indexSticker={idx}
          />
        </Card>
      ))}
    </div>
  );
}

/* =========================
 * Rail Caption (Outer) — 손글씨 톤 (아이디어 #5)
 * =======================*/
function RailCaptionOuter({
  outerSide, // "left" | "right"
  date,
  title,
  emoji,
}: {
  outerSide: "left" | "right";
  date: string;
  title?: string | null;
  emoji: string;
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
      <div className="text-[15px] md:text-[16px] tracking-[0.08em] tabular-nums text-muted-foreground/90 blur-[0.1px]">
        {date}
      </div>
      <div
        className={[
          "mt-0.5 font-semibold text-foreground/90",
          "text-[28px] sm:text-[30px] md:text-[34px] lg:text-[36px]",
          "tracking-[-0.012em] [text-wrap:balance] opacity-95 line-clamp-2 font-hand",
        ].join(" ")}
        style={{
          letterSpacing: "-0.012em",
          transform: "rotate(-0.2deg)",
          textShadow: "0 0 1px rgba(0,0,0,0.10), 0 1px 1.5px rgba(0,0,0,0.06)",
        }}
      >
        <span aria-hidden className="mr-1 ">
          {emoji}
        </span>
        {title}
      </div>
    </div>
  );
}

/* =========================
 * Timeline Large — 섹션 컴포넌트
 * (아이디어 #2, #8, #9, #10 반영)
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
        const sectionEmoji = monthEmoji(monthNum);
        return (
          <MonthSection
            key={ym}
            ym={ym}
            emoji={sectionEmoji}
            rows={rows}
            onOpen={onOpen}
          />
        );
      })}
    </div>
  );
}

function MonthSection({
  ym,
  emoji,
  rows,
  onOpen,
}: {
  ym: string;
  emoji: string;
  rows: Fragment[];
  onOpen: (id: string | number) => void;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const startRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState<{ startPx: number; endPx: number }>({
    startPx: 0,
    endPx: 0,
  });

  // 월별 테마 (아이디어 #9)
  const monthNum = parseMonthFromYm(ym);
  const theme = monthTheme(monthNum);

  // 섹션 내부에서 start/end 앵커의 오프셋 측정(섹션 기준)
  useEffect(() => {
    const measure = () => {
      const sec = sectionRef.current;
      if (!sec) return;
      const secTop = sec.getBoundingClientRect().top + window.scrollY;
      const s = startRef.current?.getBoundingClientRect().top ?? 0;
      const e = endRef.current?.getBoundingClientRect().top ?? 0;
      const sPx = Math.max(0, s + window.scrollY - secTop);
      const ePx = Math.max(sPx, e + window.scrollY - secTop);
      setBounds({ startPx: sPx, endPx: ePx });
    };
    measure();

    const ro = new ResizeObserver(measure);
    if (sectionRef.current) ro.observe(sectionRef.current);

    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);

    const imgs = Array.from(sectionRef.current?.querySelectorAll("img") ?? []);
    imgs.forEach((img) =>
      img.addEventListener("load", measure, { once: true })
    );

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id={ymToId(ym)}
      className={cn("relative py-12 overflow-hidden", theme.sectionBg ?? "")}
    >
      {/* 중앙 레일: 고정 이모지 (아이디어 #3) */}
      <FixedRail
        emoji={emoji}
        step={44}
        sideOffset={18}
        opacity={0.95}
        startPx={bounds.startPx}
        endPx={bounds.endPx}
      />

      {/* 월 헤더칩 (아이디어 #2) */}
      <div className="sticky top-24 z-10 mb-8 text-center">
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-5 py-2 text-[12px] tabular-nums font-semibold",
            "backdrop-blur-md shadow-[0_10px_24px_-16px_rgba(120,85,40,0.35)] ring-1",
            theme.chipBg ?? "bg-white/85",
            theme.chipRing ?? "ring-amber-200/60",
            theme.chipText ?? "text-amber-900/90"
          )}
        >
          <span className="opacity-95">{emoji}</span>
          <span className="opacity-95">{ym}</span>
        </div>
      </div>

      {/* ⭐ 월 칩 아래부터 이모지 시작 */}
      <div ref={startRef} className="h-2" />

      {/* 카드들 */}
      <div className="space-y-14">
        {rows.map((f, i) => {
          const isLeftCard = i % 2 === 0;
          const mt = isLeftCard ? 0 : 10;
          const dateStr = formatDate(f.event_date);
          const outerSide: "left" | "right" = isLeftCard ? "right" : "left";
          const m = new Date(f.event_date).getMonth() + 1;
          const titleEmoji = monthEmoji(m);

          return (
            <article key={f.id} className="relative">
              <div
                className={cn(
                  "md:w-[calc(50%-1.25rem)]",
                  isLeftCard
                    ? "md:pr-10 md:ml-0 md:mr-auto"
                    : "md:pl-10 md:ml-auto md:mr-0"
                )}
                style={{ marginTop: mt }}
              >
                <Card
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(f.id)}
                  onKeyDown={(e) => e.key === "Enter" && onOpen(f.id)}
                  className={cn(
                    "group overflow-hidden transition rounded-3xl",
                    "hover:-translate-y-[1px] hover:shadow-lg hover:ring-1 hover:ring-primary/30",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  )}
                  aria-label={`${titleEmoji} ${f.title ?? "무제"} — ${dateStr}`}
                >
                  <ImageBox
                    src={
                      f.cover_photo_path
                        ? publicUrl(f.cover_photo_path)
                        : undefined
                    }
                    alt={f.title ?? dateStr}
                    hearts={f.hearts ?? 0}
                    caption={f.title ?? dateStr}
                    indexSticker={i}
                  />
                </Card>
              </div>

              <RailCaptionOuter
                outerSide={outerSide}
                date={dateStr}
                title={f.title}
                emoji={titleEmoji}
              />
            </article>
          );
        })}
      </div>

      {/* ⭐ 다음 달 섹션 시작 직전까지 이모지 */}
      <div ref={endRef} className="h-6" />

      {/* 월 경계 스캘럽 라인 (아이디어 #8) */}
      <div
        className="mx-auto my-10 h-6 w-[min(680px,92%)] opacity-[0.12]
        bg-[radial-gradient(circle_at_12px_-6px,rgba(0,0,0,0.12)_12px,transparent_13px)]
        [background-size:24px_24px] [mask-image:linear-gradient(black,transparent_30%)]"
      />
    </section>
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
 * Month Navigator (Mobile)
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

        <div className="mt-4 space-y-6 overflow-y-auto max-h[calc(55vh-64px)] pr-1">
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
            className="rounded-full"
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

// 월 이모지 매핑 (월별 고정)
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
      return "☕";
    case 10:
      return "🍁";
    case 11:
      return "☃️";
    case 12:
      return "🎄";
    default:
      return "🗓️";
  }
}

// 월별 테마 컬러 (아이디어 #9)
function monthTheme(m: number) {
  switch (m) {
    case 3: // 봄꽃
      return {
        chipBg: "bg-rose-50/85",
        chipRing: "ring-rose-200/60",
        chipText: "text-rose-800/90",
        sectionBg: "",
      };
    case 5: // 귀여운 인형톤
      return {
        chipBg: "bg-amber-50/85",
        chipRing: "ring-amber-200/60",
        chipText: "text-amber-900/90",
        sectionBg: "",
      };
    case 7: // 여름 해바라기
      return {
        chipBg: "bg-yellow-50/85",
        chipRing: "ring-yellow-200/60",
        chipText: "text-yellow-900/90",
        sectionBg: "",
      };
    case 9: // 커피톤 가을 초입
      return {
        chipBg: "bg-amber-50/85",
        chipRing: "ring-amber-300/60",
        chipText: "text-amber-900/90",
        sectionBg: "",
      };
    case 10: // 단풍
      return {
        chipBg: "bg-orange-50/85",
        chipRing: "ring-orange-200/60",
        chipText: "text-orange-900/90",
        sectionBg: "",
      };
    case 12: // 겨울초록
      return {
        chipBg: "bg-emerald-50/85",
        chipRing: "ring-emerald-200/60",
        chipText: "text-emerald-900/90",
        sectionBg: "",
      };
    default:
      return {
        chipBg: "bg-white/85",
        chipRing: "ring-amber-200/60",
        chipText: "text-amber-900/90",
        sectionBg: "",
      };
  }
}

/* =========================
 * Empty & Skeleton (아이디어 #7)
 * =======================*/
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="mx-auto max-w-xl p-8 text-center rounded-3xl bg-[rgba(250,247,242,0.98)] ring-1 ring-amber-200/40 relative overflow-hidden">
      {/* 와시테이프 살짝 */}
      <div className="pointer-events-none absolute -top-2 left-8 rotate-[-5deg] h-5 w-24 bg-amber-200/70 rounded-[4px] shadow-sm" />
      <div className="pointer-events-none absolute -top-1 right-8 rotate-[6deg] h-5 w-20 bg-pink-200/60 rounded-[4px] shadow-sm" />

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
    <div className="relative">
      {/* 로딩 중에도 중앙 레일 느낌 유지 */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-full w-16 opacity-50">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full border-l border-dashed border-amber-300/30" />
      </div>
      <div className="space-y-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card
            key={i}
            className="overflow-hidden rounded-3xl bg-[rgba(250,247,242,0.9)] ring-1 ring-amber-200/40"
          >
            <div className="w-full min-h-[220px] animate-pulse rounded-2xl bg-gradient-to-br from-neutral-200/60 to-neutral-100/60" />
          </Card>
        ))}
      </div>
    </div>
  );
}
