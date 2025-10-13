// src/components/memories/StartEndPixelShow.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { listFragments } from "@/features/memories/api";
import { publicUrl } from "@/features/memories/storage";
import { cn } from "@/lib/utils";
import { PixelImage } from "@/components/ui/pixel-image";
import { useNavigate } from "react-router-dom";

type Frag = {
  id: string | number;
  title?: string | null;
  event_date: string | number | Date;
  cover_photo_path?: string | null;
};

type Props = {
  first?: Frag;
  last?: Frag;
  /** 타이밍(ms) */
  pixelFadeInDuration?: number;
  pixelMaxDelay?: number;
  colorRevealDelay?: number;
  holdDuration?: number; // <- 이 시간이 '유지시간' (진행바 길이와 동일)
  idleGap?: number; // <- 교체 직전 살짝 쉬는 시간(선택)
  /** 배경 감성 옵션 */
  showParticles?: boolean;
  className?: string;
  /** 접근성: OS의 reduce-motion 존중 여부 */
  respectReducedMotion?: boolean;
};

export default function StartEndPixelShow({
  first,
  last,
  // 합리적인 기본값으로 조정
  pixelFadeInDuration = 1200, // 기존 9000 → 1200 (너무 길었던 초기 픽셀 연출 축소)
  pixelMaxDelay = 900,
  colorRevealDelay = 800,
  holdDuration = 8000, // 요청: 8초 유지
  idleGap = 0, // “8초 후 바뀌기 시작” 느낌 살리려면 0~200ms 권장
  showParticles = true,
  className,
  respectReducedMotion = false, // 기본적으로 8초 유지 강제 (원하면 true로 바꿔줘)
}: Props) {
  const nav = useNavigate();
  const { couple } = useCoupleContext();

  const [loading, setLoading] = useState(false);
  const [oldest, setOldest] = useState<Frag | null>(first ?? null);
  const [latest, setLatest] = useState<Frag | null>(last ?? null);

  // reduce-motion 감지
  const [mediaReduced, setMediaReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setMediaReduced(e.matches);
    setMediaReduced(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  const isReduced = respectReducedMotion ? mediaReduced : false;

  // 자동 로드
  useEffect(() => {
    let alive = true;
    if (first && last) return;
    (async () => {
      if (!couple?.id) return;
      try {
        setLoading(true);
        const rows = await listFragments(couple.id, 1000, 0);
        if (!alive) return;

        if (!rows?.length) {
          setOldest(null);
          setLatest(null);
          return;
        }

        const sorted = [...rows].sort(
          (x: Frag, y: Frag) =>
            new Date(x.event_date).getTime() - new Date(y.event_date).getTime()
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
  }, [couple?.id, first, last]);

  const slides = useMemo(() => {
    const toSlide = (f?: Frag | null) =>
      f
        ? {
            id: f.id,
            src: f.cover_photo_path ? publicUrl(f.cover_photo_path) : "",
            title: f.title ?? "무제",
            date: fmtDate(f.event_date),
          }
        : null;

    const sA = toSlide(oldest);
    const sB = toSlide(latest);
    return [sA, sB].filter(Boolean) as {
      id: string | number;
      src: string;
      title: string;
      date: string;
    }[];
  }, [oldest, latest]);

  // 0: oldest, 1: latest
  const [idx, setIdx] = useState(0);
  const [playToken, setPlayToken] = useState(0);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // slides 변경 시 첫 슬라이드부터
  useEffect(() => {
    setIdx(0);
    setPlayToken((n) => n + 1);
    if (progressRef.current) {
      progressRef.current.style.animation = "none";
      void progressRef.current.offsetHeight;
      progressRef.current.style.removeProperty("animation");
      progressRef.current.style.width = "0%";
    }
  }, [slides.map((s) => s.id).join("|")]);

  /**
   * ✅ 타임라인을 간단히:
   * - 슬라이드가 보이는 즉시(= idx가 바뀌는 즉시) 진행바 시작
   * - holdMs(기본 8000ms) 경과 후 다음 슬라이드로 전환
   * - 필요하면 idleGap만큼 아주 짧게 쉬고 다음 Pixel 애니 재생
   */
  useEffect(() => {
    if (slides.length < 1) return;

    const holdMs = isReduced ? 1200 : holdDuration;
    const gapMs = isReduced ? 200 : idleGap;

    // 진행바 즉시 시작
    if (progressRef.current) {
      progressRef.current.style.animation = "none";
      void progressRef.current.offsetHeight; // reflow
      progressRef.current.style.animation = `bar ${holdMs}ms linear 1 forwards`;
    }

    // hold 후 전환
    const t = window.setTimeout(() => {
      setIdx((v) => (v + 1) % slides.length);
      // 전환 직후 다음 컷의 Pixel 조각 애니 재생을 위해 playToken bump
      // (gap이 0이어도 자연스럽게 remount)
      if (gapMs > 0) {
        window.setTimeout(() => setPlayToken((n) => n + 1), gapMs);
      } else {
        setPlayToken((n) => n + 1);
      }
    }, holdMs + gapMs);

    return () => window.clearTimeout(t);
  }, [idx, slides.length, holdDuration, idleGap, isReduced]);

  if (loading) {
    return (
      <Card className="relative overflow-hidden rounded-3xl p-6 ring-1 ring-border">
        <div className="h-[360px] animate-pulse rounded-2xl bg-muted" />
      </Card>
    );
  }

  if (slides.length < 1) {
    return (
      <Card className="rounded-3xl p-6 ring-1 ring-border">
        아직 보여줄 이미지가 없어요.
        <div className="mt-4">
          <Button onClick={() => nav("/memories")} size="sm">
            기억 조각 추가하러가기
          </Button>
        </div>
      </Card>
    );
  }

  const cur = slides[idx];
  const headlineLabel = idx === 0 ? "우리의 첫 기억" : "우리의 최근 기억";

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-3xl border-none shadow-lg",
        "bg-gradient-to-br from-rose-50/70 via-white/85 to-sky-50/70",
        "dark:from-neutral-900/80 dark:via-neutral-900/70 dark:to-neutral-900/85",
        "p-3 sm:p-5",
        className
      )}
    >
      {showParticles && <SoftParticles />}

      {/* 헤더 */}
      <header className="relative z-10 mb-3 grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_auto] px-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2
            className={cn(
              "font-hand font-extrabold text-[18px] sm:text-[20px] md:text-[22px] lg:text-[24px]",
              "tracking-[-0.01em] leading-tight",
              "bg-gradient-to-br from-neutral-800 to-neutral-700 dark:from-neutral-200 dark:to-neutral-50",
              "bg-clip-text text-transparent",
              "drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] dark:drop-shadow-[0_1px_0_rgba(0,0,0,0.45)]"
            )}
          >
            {headlineLabel}
          </h2>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] sm:text-xs",
              " text-muted-foreground/80",
              "backdrop-blur-sm"
            )}
            aria-label="기억 날짜"
          >
            {cur.date}
          </span>
        </div>

        {/* 진행바: idx 바뀌는 즉시 시작 */}
        <div className="relative h-1 w-40 sm:w-48 overflow-hidden rounded-full bg-muted justify-self-start sm:justify-self-end">
          <div
            ref={progressRef}
            className="h-full w-0 bg-primary"
            style={{ animationFillMode: "forwards" }}
            aria-hidden
          />
        </div>
      </header>

      {/* 이미지 */}
      <div className="relative z-10 mx-auto max-w-[880px]">
        <PixelImage
          key={`${cur.id}-${playToken}`} // remount → 픽셀 애니 재생
          src={cur.src}
          grid="8x8"
          pixelFadeInDuration={pixelFadeInDuration}
          maxAnimationDelay={pixelMaxDelay}
          colorRevealDelay={colorRevealDelay}
          grayscaleAnimation
          playToken={playToken}
        />
      </div>

      {/* 푸터 */}
      <footer className="relative z-10 mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="mx-auto max-w-[50ch] px-2 text-center text-balance text-sm sm:text-base font-medium sm:text-left">
          {cur.title}
        </div>
        <Button variant="outline" onClick={() => nav("/memories")}>
          기억 추가하기
        </Button>
      </footer>

      <style jsx>{`
        @keyframes bar {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </Card>
  );
}

/* ---------------------- 감성 파티클 ---------------------- */
function SoftParticles() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22 x=%220%22 y=%220%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.4%22/></svg>')",
        }}
      />
      <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-rose-200/25 blur-3xl" />
      <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-sky-200/25 blur-3xl" />
    </div>
  );
}

/* ---------------------- 유틸 ---------------------- */
function fmtDate(d: string | number | Date) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
