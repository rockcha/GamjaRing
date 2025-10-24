// src/components/memories/StartEndMemoriesSlider.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { listFragments } from "@/features/memories/api";
import { publicUrl } from "@/features/memories/storage";
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";

type Frag = {
  id: string | number;
  title?: string | null;
  event_date: string | number | Date;
  cover_photo_path?: string | null;
};

type Slide = {
  id: string | number;
  src: string;
  title: string;
  date: string;
  kind: "first" | "last";
};

export default function StartEndMemoriesSlider() {
  const nav = useNavigate();
  const { couple } = useCoupleContext();

  const [loading, setLoading] = useState(true);
  const [oldest, setOldest] = useState<Frag | null>(null);
  const [latest, setLatest] = useState<Frag | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!couple?.id) return;
        setLoading(true);
        const rows = await listFragments(couple.id, 1000, 0);
        if (!alive) return;
        if (!rows?.length) {
          setOldest(null);
          setLatest(null);
          return;
        }
        const sorted = [...rows].sort(
          (a: Frag, b: Frag) =>
            new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        );
        setOldest(sorted[0] ?? null);
        setLatest(sorted[sorted.length - 1] ?? null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [couple?.id]);

  const slides = useMemo<Slide[]>(() => {
    const toSlide = (f: Frag | null | undefined, kind: "first" | "last") =>
      f
        ? {
            id: f.id,
            src: f.cover_photo_path ? publicUrl(f.cover_photo_path) : "",
            title: f.title || "무제",
            date: fmtDate(f.event_date),
            kind,
          }
        : null;

    return [toSlide(oldest, "first"), toSlide(latest, "last")].filter(
      Boolean
    ) as Slide[];
  }, [oldest, latest]);

  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [slides.map((s) => s.id).join("|")]);

  const hasSlides = slides.length > 0;
  const cur = hasSlides ? slides[idx] : null;

  // 키보드 네비
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!hasSlides) return;
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, hasSlides, slides.length]);

  // 터치 스와이프
  const dragRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = dragRef.current;
    if (!el) return;
    let startX = 0;
    let dragging = false;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      dragging = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging) return;
      const dx = e.touches[0].clientX - startX;
      if (Math.abs(dx) > 40) {
        dragging = false;
        dx > 0 ? prev() : next();
      }
    };
    const onTouchEnd = () => {
      dragging = false;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [idx, slides.length]);

  const prev = () => setIdx((v) => (v - 1 + slides.length) % slides.length);
  const next = () => setIdx((v) => (v + 1) % slides.length);

  if (loading) {
    return (
      <Card className="relative overflow-hidden rounded-3xl p-6 ring-1 ring-border">
        <div className="h-[360px] animate-pulse rounded-2xl bg-muted" />
      </Card>
    );
  }

  if (!hasSlides) {
    return (
      <Card className="rounded-3xl p-6 ring-1 ring-border text-center">
        <p className="text-sm text-muted-foreground">
          아직 보여줄 기억이 없어요.
        </p>
        <Button className="mt-4" size="sm" onClick={() => nav("/memories")}>
          <Plus className="mr-1.5 h-4 w-4" />
          기억 조각 추가하러 가기
        </Button>
      </Card>
    );
  }

  // ---- 헤더 타이틀 (최근에는 아이콘) ----
  const titleNode =
    cur?.kind === "first" ? (
      <span>우리의 첫 기억</span>
    ) : (
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-[18px] w-[18px]" />
        우리의 최근 기억
      </span>
    );

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-3xl border-none shadow-lg",
        "bg-gradient-to-br from-rose-50/70 via-white/85 to-sky-50/70",
        "dark:from-neutral-900/80 dark:via-neutral-900/70 dark:to-neutral-900/85",
        "p-3 sm:p-5"
      )}
    >
      <SoftGlows />

      {/* 헤더 */}
      <header className="relative z-10 mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="px-1">
          <h2
            className={cn(
              "font-hand font-extrabold text-[18px] sm:text-[20px] md:text-[22px] lg:text-[24px]",
              "tracking-[-0.01em] leading-tight",
              "bg-gradient-to-br from-neutral-800 to-neutral-700 dark:from-neutral-200 dark:to-neutral-50",
              "bg-clip-text text-transparent"
            )}
          >
            {titleNode}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{cur?.date}</p>
        </div>

        {/* 세그먼트 전환 */}
        <div className="inline-flex w-full sm:w-auto items-center rounded-xl bg-muted/60 p-1 backdrop-blur">
          {slides.map((s, i) => (
            <button
              key={s.kind}
              className={cn(
                "flex-1 sm:flex-none rounded-lg px-3 py-2 text-xs font-medium transition",
                i === idx
                  ? "bg-background shadow-sm"
                  : "opacity-70 hover:opacity-100"
              )}
              onClick={() => setIdx(i)}
              aria-pressed={i === idx}
            >
              {s.kind === "first" ? "첫 기억" : "최근 기억"}
            </button>
          ))}
        </div>
      </header>

      {/* 바디: 이미지 전체 표시 (✔ 액자 테두리만) */}
      <div className="relative z-10">
        <div ref={dragRef} className="mx-auto max-w-[900px]">
          <div
            className={cn(
              "relative w-full overflow-hidden rounded-2xl",
              // ✅ 액자 느낌: 얇은 테두리 + 안쪽 여백
              "border border-border/80 bg-transparent p-2 sm:p-3 shadow-sm"
            )}
            style={{ aspectRatio: "16 / 9" }}
          >
            {cur?.src ? (
              <img
                src={cur.src}
                alt={cur.title}
                className="absolute inset-0 m-auto h-full w-full object-contain"
                draggable={false}
              />
            ) : (
              <EmptyCover />
            )}
          </div>

          {/* 컨트롤 (이미지 아래) */}
          {slides.length > 1 && (
            <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={prev}
                  aria-label="이전"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={next}
                  aria-label="다음"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* 점 네비 */}
              <div className="flex items-center justify-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    aria-label={`슬라이드 ${i + 1}`}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full transition",
                      i === idx
                        ? "bg-foreground"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/70"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 하단 텍스트 */}
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="mx-auto max-w-[60ch] px-2 text-center text-balance text-sm sm:text-base font-medium sm:text-left">
            {cur?.title}
          </div>
          <Button variant="outline" onClick={() => nav("/memories")}>
            기억 추가하기
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ---------- 부품 ---------- */

function EmptyCover() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="rounded-xl border border-dashed border-muted-foreground/30 px-4 py-3 text-xs text-muted-foreground">
        커버 이미지가 없어요
      </div>
    </div>
  );
}

function SoftGlows() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute -top-28 -left-28 h-64 w-64 rounded-full bg-rose-200/25 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-sky-200/25 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22 x=%220%22 y=%220%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.4%22/></svg>')",
        }}
      />
    </div>
  );
}

/* ---------- 유틸 ---------- */
function fmtDate(d: string | number | Date) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
