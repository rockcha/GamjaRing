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
  holdDuration?: number;
  idleGap?: number;
  /** 배경 감성 옵션 */
  showParticles?: boolean;
  className?: string;
};

export default function StartEndPixelShow({
  first,
  last,
  pixelFadeInDuration = 900,
  pixelMaxDelay = 1100,
  colorRevealDelay = 1200,
  holdDuration = 5000,
  idleGap = 400,
  showParticles = true,
  className,
}: Props) {
  const nav = useNavigate();
  const { couple } = useCoupleContext();

  const [loading, setLoading] = useState(false);
  const [oldest, setOldest] = useState<Frag | null>(first ?? null);
  const [latest, setLatest] = useState<Frag | null>(last ?? null);

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

        // 날짜 오름차순 정렬(오래된 → 최신)
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

    // 순서 고정: [oldest, latest]
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

  // slides가 바뀌면 항상 oldest부터 다시 시작 (순서 보장)
  useEffect(() => {
    setIdx(0);
    setPlayToken((n) => n + 1);
    // 진행바도 리셋
    if (progressRef.current) {
      progressRef.current.style.animation = "none";
      void progressRef.current.offsetHeight;
      progressRef.current.style.removeProperty("animation");
      progressRef.current.style.width = "0%";
    }
  }, [slides.map((s) => s.id).join("|")]);

  // 타임라인 (pixel → hold → swap → gap → pixel …)
  useEffect(() => {
    if (slides.length < 2) return;

    let t1: number | null = null;
    let t2: number | null = null;
    let t3: number | null = null;

    const isReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const pxDur = isReduced ? 0 : pixelFadeInDuration + pixelMaxDelay + 50;
    const hold = isReduced ? 1200 : holdDuration;
    const gap = isReduced ? 200 : idleGap;

    // 1) 픽셀 생성 끝 → 진행바 시작 & hold
    t1 = window.setTimeout(() => {
      if (progressRef.current) {
        progressRef.current.style.animation = "none";
        void progressRef.current.offsetHeight;
        progressRef.current.style.animation = `bar ${hold}ms linear 1 forwards`;
      }
      // 2) hold 끝 → 다음 인덱스
      t2 = window.setTimeout(() => {
        setIdx((v) => (v + 1) % slides.length);
        // 3) 약간의 갭 후 재생 토큰 증가 (다음 컷 조각 애니 재생)
        t3 = window.setTimeout(() => setPlayToken((n) => n + 1), gap);
      }, hold);
    }, pxDur);

    return () => {
      if (t1) window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
      if (t3) window.clearTimeout(t3);
    };
  }, [
    slides.length,
    idx, // 현재 인덱스가 바뀔 때마다 새로운 사이클
    pixelFadeInDuration,
    pixelMaxDelay,
    holdDuration,
    idleGap,
  ]);

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

  /** ----- 헤더 텍스트 구성 ----- */
  const headlineLabel = idx === 0 ? "우리의 첫 기억" : "우리의 최근 기억";

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-3xl ring-1 ring-border",
        "bg-gradient-to-br from-rose-50/70 via-white/85 to-sky-50/70",
        "dark:from-neutral-900/80 dark:via-neutral-900/70 dark:to-neutral-900/85",
        "p-3 sm:p-5",
        className
      )}
    >
      {showParticles && <SoftParticles />}

      {/* 헤더: 날짜(은은 칩) + 손글씨 제목(크게) / 진행바는 우측 */}
      <header className="relative z-10 mb-3 grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_auto] px-1">
        {/* 제목 블록 (날짜 앞 + 손글씨 타이틀 크게) */}
        <div className="flex flex-wrap items-baseline gap-2">
          {/* 날짜 칩: 은은하게 */}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] sm:text-xs",
              "bg-white/60 ring-1 ring-border text-muted-foreground/80",
              "backdrop-blur-sm"
            )}
            aria-label="기억 날짜"
          >
            {cur.date}
          </span>

          {/* 손글씨 제목: 잘 보이게 크게 */}
          <h2
            className={cn(
              "font-hand text-[18px] sm:text-[20px] md:text-[22px] lg:text-[24px]",
              "tracking-[-0.01em] leading-tight",
              // 살짝 그라데이션 잉크 + 드롭섀도우로 가독성
              "bg-gradient-to-br from-neutral-800 to-neutral-700 dark:from-neutral-200 dark:to-neutral-50",
              "bg-clip-text text-transparent",
              "drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] dark:drop-shadow-[0_1px_0_rgba(0,0,0,0.45)]"
            )}
          >
            {headlineLabel}
          </h2>
        </div>

        {/* 진행바: 데스크탑 우측 정렬, 모바일에선 아래로 내려옴 */}
        <div className="relative h-1 w-40 sm:w-48 overflow-hidden rounded-full bg-muted justify-self-start sm:justify-self-end">
          <div
            ref={progressRef}
            className="h-full w-0 bg-primary"
            style={{ animationFillMode: "forwards" }}
            aria-hidden
          />
        </div>
      </header>

      {/* 슬라이드: 한 번에 하나만 렌더링 (깜빡임 제거) */}
      <div className="relative z-10 mx-auto max-w-[880px]">
        <PixelImage
          key={`${cur.id}-${playToken}`} // 확실한 remount → 조각 애니 재생
          src={cur.src}
          grid="8x8"
          pixelFadeInDuration={pixelFadeInDuration}
          maxAnimationDelay={pixelMaxDelay}
          colorRevealDelay={colorRevealDelay}
          grayscaleAnimation
          playToken={playToken}
        />
      </div>

      {/* 푸터: 타이틀 + 이동 버튼 */}
      <footer className="relative z-10 mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="mx-auto max-w-[50ch] px-2 text-center text-balance text-sm sm:text-base font-medium sm:text-left">
          {cur.title}
        </div>
        <Button variant="outline" onClick={() => nav("/memories")}>
          기억 조각 추가하러가기
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
