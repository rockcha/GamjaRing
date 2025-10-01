// src/components/memories/StartEndMemoriesCard.tsx
"use client";

import React, { useEffect, useMemo, useState, useId } from "react";
import { useNavigate } from "react-router-dom";

/* shadcn/ui */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfinity } from "@fortawesome/free-solid-svg-icons";

/* 외부 의존 */
import { useCoupleContext } from "@/contexts/CoupleContext";
import { listFragments } from "@/features/memories/api";
import { publicUrl } from "@/features/memories/storage";

/* 타입 */
export type FragmentLite = {
  id: string | number;
  title?: string | null;
  event_date: string | number | Date;
  hearts?: number | null;
  cover_photo_path?: string | null;
};

type Props = {
  fragments?: FragmentLite[];
  className?: string;
  fetchLimit?: number;
  orbitDurationSec?: number; // 기본 14
  runners?: number; // 기본 3
};

export default function StartEndMemoriesCard({
  fragments,
  className = "",
  fetchLimit = 1000,
  orbitDurationSec = 14,
  runners = 3,
}: Props) {
  const nav = useNavigate();
  const { couple } = useCoupleContext();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FragmentLite[]>([]);
  const provided = Array.isArray(fragments) && fragments.length > 0;

  useEffect(() => {
    let alive = true;
    async function run() {
      if (provided) return;
      if (!couple?.id) return;
      try {
        setLoading(true);
        const res = await listFragments(couple.id, fetchLimit, 0);
        if (alive) setRows(res as FragmentLite[]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [couple?.id, fetchLimit, provided]);

  const items = provided ? (fragments as FragmentLite[]) : rows;

  const sorted = useMemo(() => {
    return [...items].sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }, [items]);

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (!first || !last) {
    return (
      <Card
        className={[
          "relative rounded-3xl p-6", // overflow-hidden 제거
          "bg-gradient-to-br from-rose-50/70 via-white/80 to-sky-50/70",
          "dark:from-neutral-900/80 dark:via-neutral-900/70 dark:to-neutral-900/80",
          "ring-1 ring-border backdrop-blur",
          className,
        ].join(" ")}
      >
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center">
              <FontAwesomeIcon icon={faInfinity} className="text-primary" />
            </span>
            <h3 className="text-xl font-semibold tracking-[-0.01em]">
              우리의 시작과 끝
            </h3>
          </div>
          <Button onClick={() => nav("/memories")} size="sm">
            조각 추가하러 가기
          </Button>
        </header>

        <div className="mt-6 text-sm text-muted-foreground">
          {loading
            ? "추억을 불러오는 중..."
            : "아직 보여줄 추억이 충분하지 않아요."}
        </div>
      </Card>
    );
  }

  const firstDate = formatDate(first.event_date);
  const lastDate = formatDate(last.event_date);

  return (
    <Card
      className={[
        "relative rounded-3xl", // overflow-hidden 제거
        "bg-gradient-to-br from-rose-50/70 via-white/80 to-sky-50/70",
        "dark:from-neutral-900/80 dark:via-neutral-900/70 dark:to-neutral-900/80",
        "ring-1 ring-border backdrop-blur p-4 sm:p-6",
        className,
      ].join(" ")}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center">
            <FontAwesomeIcon icon={faInfinity} className="text-primary" />
          </span>
          <h3 className="text-lg sm:text-xl font-semibold tracking-[-0.01em]">
            우리의 시작과 끝
          </h3>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={() => nav("/memories")}
          className="shrink-0"
        >
          조각 추가하러 가기
        </Button>
      </div>

      {/* 본문 */}
      <div className="mt-5">
        <PerimeterOrbit
          dash="4 8"
          radius={16}
          inset={10} // 콘텐츠 안쪽 여백
          outset={18} // 바깥 확장(오른쪽 카드까지 넉넉히)
          clipMargin={14} // 하트 클리핑 방지
          durationSec={orbitDurationSec}
          runners={runners}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
            {/* 처음 */}
            <MemoryCell
              label="첫 추억"
              date={firstDate}
              title={first.title}
              imgSrc={
                first.cover_photo_path
                  ? publicUrl(first.cover_photo_path)
                  : undefined
              }
              hearts={first.hearts ?? 0}
              onOpen={() => nav(`/memories/${first.id}`)}
            />
            {/* 최근 */}
            <MemoryCell
              label="최근 추억"
              date={lastDate}
              title={last.title}
              imgSrc={
                last.cover_photo_path
                  ? publicUrl(last.cover_photo_path)
                  : undefined
              }
              hearts={last.hearts ?? 0}
              onOpen={() => nav(`/memories/${last.id}`)}
            />
          </div>
        </PerimeterOrbit>
      </div>

      {/* 장식 오라 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(52% 52% at 50% 50%, rgba(255,182,193,0.35) 0%, rgba(255,255,255,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(52% 52% at 50% 50%, rgba(173,216,230,0.35) 0%, rgba(255,255,255,0) 70%)",
        }}
      />
    </Card>
  );
}

/* ===============================
 * PerimeterOrbit v3.1
 * - path 바깥 확장(outset)으로 오른쪽 카드까지 확실히 감쌈
 * - clipMargin으로 하트 클리핑 방지
 * - 하트가 path 정중앙을 정확히 따르도록 중앙정렬 기준
 * ============================= */
function PerimeterOrbit({
  children,
  dash = "4 8",
  durationSec = 14,
  radius = 16,
  inset = 10, // 콘텐츠 안쪽 여백
  outset = 14, // 콘텐츠 바깥 확장
  clipMargin = 10, // 외곽 오픈 마진
  runners = 3,
}: {
  children: React.ReactNode;
  dash?: string;
  durationSec?: number;
  radius?: number;
  inset?: number;
  outset?: number;
  clipMargin?: number;
  runners?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const pathId = useId();

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setBox({ w: cr.width, h: cr.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  // 실제 px 기반 라운드 사각형 path (inset은 안쪽, outset은 바깥 확장)
  const innerPad = Math.max(0, inset - outset);
  const x = Math.max(0, innerPad);
  const y = Math.max(0, innerPad);
  const w = Math.max(0, box.w - innerPad * 2 + outset * 2);
  const h = Math.max(0, box.h - innerPad * 2 + outset * 2);

  const rrPath = useMemo(
    () => (w > 0 && h > 0 ? roundRectPath(x, y, w, h, radius) : ""),
    [x, y, w, h, radius]
  );

  return (
    <div ref={ref} className="relative">
      {/* 콘텐츠 */}
      <div className="relative z-10">{children}</div>

      {/* 오버레이 */}
      <div
        className="pointer-events-none absolute inset-0 z-[100] overflow-visible"
        style={{ isolation: "isolate" }}
        aria-hidden
      >
        {/* 외곽 오픈: 하트가 상하좌우로 나가도 안 잘리게 */}
        <div
          className="absolute"
          style={{
            top: -clipMargin,
            left: -clipMargin,
            right: -clipMargin,
            bottom: -clipMargin,
          }}
        >
          <svg width="100%" height="100%">
            <defs>
              <filter
                id={`${pathId}-softGlow`}
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="1.6" result="b" />
                <feColorMatrix
                  in="b"
                  type="matrix"
                  values="
                    1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 0.7 0
                  "
                  result="soft"
                />
                <feMerge>
                  <feMergeNode in="soft" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <path id={pathId} d={rrPath || "M0 0"} />
            </defs>

            {/* 점선 테두리 */}
            <use
              href={`#${pathId}`}
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeDasharray={dash}
              strokeWidth={1.5}
              strokeLinecap="round"
              style={{ vectorEffect: "non-scaling-stroke" }}
            />

            {/* 러너들: 하트가 path 중앙을 정확히 따르게 그룹 이동 */}
            <g filter={`url(#${pathId}-softGlow)`} className="select-none">
              {Array.from({ length: runners }).map((_, i) => {
                const offset = (i / Math.max(1, runners)) * durationSec;
                return (
                  <g key={i}>
                    <g>
                      <animateMotion
                        dur={`${durationSec}s`}
                        repeatCount="indefinite"
                        rotate="0" // 기울임 제거
                        keySplines="0.42 0 0.58 1"
                        calcMode="spline"
                        begin={`${-offset}s`}
                      >
                        <mpath href={`#${pathId}`} />
                      </animateMotion>

                      {/* 중앙 정렬: 세로 구간에서도 정확히 점선 중앙 */}
                      <text
                        x={0}
                        y={0}
                        fontSize={20}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan>❤️</tspan>
                        {/* 호흡감(위치에 영향 X) */}
                        <animateTransform
                          attributeName="transform"
                          type="scale"
                          values="1;1.06;1"
                          dur="3s"
                          repeatCount="indefinite"
                        />
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

/** 라운드 사각형 Path */
function roundRectPath(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  const x2 = x + w;
  const y2 = y + h;
  return [
    `M ${x + rr} ${y}`,
    `H ${x2 - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x2} ${y + rr}`,
    `V ${y2 - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x2 - rr} ${y2}`,
    `H ${x + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x} ${y2 - rr}`,
    `V ${y + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x + rr} ${y}`,
    "Z",
  ].join(" ");
}

/* ===== 액자 사진 ===== */
function FramePhoto({
  src,
  alt,
  hearts = 0,
  aspect = "aspect-[16/9]",
  onClick,
  ariaLabel,
}: {
  src?: string;
  alt?: string | null;
  hearts?: number;
  aspect?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[22px]"
    >
      <div
        className={`relative w-full ${aspect} bg-transparent rounded-[22px]`}
      >
        {/* 프레임 */}
        <div
          className={[
            "absolute inset-0",
            "bg-gradient-to-b from-stone-500/90 to-stone-400/90",
            "ring-1 ring-stone-300/80 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.5)]",
            "p-2 md:p-3 transition-transform",
            "rounded-[22px]",
          ].join(" ")}
        >
          {/* 매트 */}
          <div
            className={[
              "h-full w-full rounded-[18px]",
              "ring-1 ring-stone-200/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]",
              "p-1.5 md:p-2",
              "bg-white/90 dark:bg-neutral-900/80",
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
              {/* 비네트 */}
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

        {/* 하트 카운트 */}
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
    </button>
  );
}

/* ===== 캡션 포함 카드 ===== */
function MemoryCell({
  label,
  date,
  title,
  imgSrc,
  hearts = 0,
  onOpen,
}: {
  label: string;
  date: string;
  title?: string | null;
  imgSrc?: string;
  hearts?: number;
  onOpen: () => void;
}) {
  const aria = `${title ?? "무제"} — ${date}`;
  return (
    <article className="group relative">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <time className="text-xs tabular-nums text-muted-foreground/80">
          {date}
        </time>
      </div>

      <FramePhoto
        src={imgSrc}
        alt={title ?? ""}
        hearts={hearts}
        aspect="aspect-[16/9]"
        onClick={onOpen}
        ariaLabel={aria}
      />

      <div className="mt-2">
        <div className="text-base sm:text-lg font-semibold leading-tight [text-wrap:balance]">
          {title ?? "무제"}
        </div>
      </div>
    </article>
  );
}

/* ===== 유틸 ===== */
function formatDate(d: string | number | Date) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
