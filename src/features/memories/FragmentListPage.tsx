// src/features/memories/FragmentListPage.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

/* =========================
 * 공용: 시드 고정 랜덤(핀/회전 각도 등)
 * =======================*/
function seededRandom(seed: string) {
  // xorshift32
  let x = 0;
  for (let i = 0; i < seed.length; i++) x ^= seed.charCodeAt(i) << i % 24;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    // 0 ~ 1
    return Math.abs((x >>> 0) / 0xffffffff);
  };
}
function seededTiltDeg(seed: string, max = 2.6) {
  const rnd = seededRandom(seed)();
  const sign = rnd > 0.5 ? 1 : -1;
  // 0.4° ~ max°
  const mag = 0.4 + rnd * (max - 0.4);
  return sign * mag;
}

/* =========================
 * 마스킹 테이프 / 핀
 * =======================*/
function MaskingTape({
  variant = "beige",
  width = "62%",
  rotate = 0,
  top = "-12px",
  left = "10%",
  zIndex = 5,
}: {
  variant?: "beige" | "mint" | "pink";
  width?: string;
  rotate?: number;
  top?: string;
  left?: string;
  zIndex?: number;
}) {
  const colors: Record<string, string> = {
    beige:
      "linear-gradient(180deg, rgba(240,230,210,0.9) 0%, rgba(236,226,205,0.85) 100%)",
    mint: "linear-gradient(180deg, rgba(212,238,230,0.9) 0%, rgba(202,232,222,0.85) 100%)",
    pink: "linear-gradient(180deg, rgba(245,222,230,0.9) 0%, rgba(238,208,220,0.85) 100%)",
  };
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0"
      style={{
        width,
        transform: `translateX(${left}) translateY(${top}) rotate(${rotate}deg)`,
        zIndex,
      }}
    >
      <div
        className="h-4 rounded-[2px] shadow-sm"
        style={
          {
            background: colors[variant],
            filter:
              "drop-shadow(0 2px 2px rgba(0,0,0,0.08)) drop-shadow(0 6px 10px rgba(0,0,0,0.04))",
            maskImage:
              "radial-gradient(circle at 3px 50%, transparent 2px, black 2px), radial-gradient(circle at calc(100% - 3px) 50%, transparent 2px, black 2px)",
            WebkitMaskImage:
              "radial-gradient(circle at 3px 50%, transparent 2px, black 2px), radial-gradient(circle at calc(100% - 3px) 50%, transparent 2px, black 2px)",
            maskComposite: "exclude",
          } as any
        }
      />
    </div>
  );
}

/** =========================
 * 새 PushPin: 정면 비스듬 + 3D 느낌, 내부그림자(클리핑 없음)
 * needleTip 기준으로 배치되도록 오프셋 처리
 * ========================*/
function PushPin({
  color = "#d43c3c",
  top = "-6px",
  left = "50%",
  rotate = 0,
  zIndex = 8,
  size = 40, // 헤드가 또렷하도록 조금 키움
}: {
  color?: string;
  top?: string;
  left?: string;
  rotate?: number;
  zIndex?: number;
  size?: number;
}) {
  // SVG 크기와 바늘팁 기준점
  const W = 40; // viewBox width
  const H = 60; // viewBox height
  const tipX = W / 2;
  const tipY = H - 2; // 거의 맨 아래가 바늘팁

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        // needle tip을 (left, top) 위치에 고정시키기 위한 보정
        transform: `translate(calc(${left} - ${tipX}px), calc(${top} - ${tipY}px)) rotate(${rotate}deg)`,
        zIndex,
        overflow: "visible",
      }}
    >
      {/* 부드러운 접촉 그림자 (핀 아래) */}
      <ellipse cx={tipX} cy={tipY - 1} rx="10" ry="3" fill="rgba(0,0,0,0.18)" />

      {/* 바늘(빛 반사 그라데이션) */}
      <defs>
        <linearGradient id="pin-needle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b9bcc2" />
          <stop offset="50%" stopColor="#e6e8ec" />
          <stop offset="100%" stopColor="#9aa0a8" />
        </linearGradient>
        <radialGradient id="pin-head" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="35%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} />
        </radialGradient>
      </defs>

      {/* 바늘 몸통 */}
      <rect
        x={tipX - 1.1}
        y={18}
        width={2.2}
        height={tipY - 20}
        rx={1.1}
        fill="url(#pin-needle)"
      />
      {/* 바늘 팁 */}
      <path
        d={`M ${tipX - 1.2} ${tipY - 20} L ${tipX} ${tipY} L ${tipX + 1.2} ${
          tipY - 20
        } Z`}
        fill="url(#pin-needle)"
      />

      {/* 헤드(정면 원형 + 약간의 타원 왜곡으로 비스듬 느낌) */}
      <g transform="translate(0,0) skewX(-4)">
        <circle cx={W / 2} cy={16} r={12} fill="url(#pin-head)" />
        {/* 반사 하이라이트 */}
        <ellipse
          cx={W / 2 - 4}
          cy={12}
          rx={5}
          ry={3}
          fill="#fff"
          opacity="0.6"
        />
        {/* 헤드 테두리/음영 */}
        <circle
          cx={W / 2}
          cy={16}
          r={12}
          fill="none"
          stroke="rgba(0,0,0,0.25)"
          strokeOpacity="0.25"
        />
      </g>
    </svg>
  );
}

/* =========================
 * 코르크보드 배경 (유지)
 * =======================*/
function CorkboardBackdrop() {
  const noiseSvg =
    "url('data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
        <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" stitchTiles="stitch"/></filter>
        <rect width="160" height="160" filter="url(#n)" opacity="0.18"/>
      </svg>`
    ) +
    "')";
  return (
    <>
      <div
        className="fixed inset-0 z-[1]"
        style={{
          background: [
            "radial-gradient(1200px 800px at 30% 10%, rgba(214,178,127,0.60), transparent 63%)",
            "radial-gradient(1500px 1000px at 72% 42%, rgba(198,157,103,0.50), transparent 62%)",
            "radial-gradient(1400px 900px at 50% 50%, transparent 60%, rgba(86,64,38,0.20) 100%)",
          ].join(", "),
        }}
        aria-hidden
      />
      <div
        className="fixed inset-0 z-[1] opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(120,85,40,0.22) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
        }}
        aria-hidden
      />
      <div
        className="fixed inset-0 z-[1] opacity-[0.35]"
        style={{
          backgroundImage: noiseSvg,
        }}
        aria-hidden
      />
    </>
  );
}

/* =========================
 * 폴라로이드 프레임(코르크보드 버전)
 * =======================*/
function PolaroidOnCork({
  children,
  idSeed,
}: {
  children: React.ReactNode;
  idSeed: string | number;
}) {
  const tilt = seededTiltDeg(String(idSeed), 2.2);

  // 테이프 컬러 랜덤
  const tapeVariant = (() => {
    const r = seededRandom(String(idSeed))();
    if (r < 0.33) return "beige";
    if (r < 0.66) return "mint";
    return "pink";
  })();

  // 압정: 좌/우 상단 랜덤 + 색상 랜덤 + 각도 소량
  const rnd = seededRandom(String(idSeed) + ":pin");
  const cornerRight = rnd() > 0.5;
  const pinLeft = cornerRight ? `${78 + rnd() * 6}%` : `${22 - rnd() * 6}%`; // 좌/우 상단 모서리 근처
  const pinRot = (rnd() - 0.5) * 10; // -5° ~ 5°
  const pinColors = ["#d43c3c", "#27b3a1", "#3366cc", "#e0b100", "#8b5cf6"];
  const pinColor = pinColors[Math.floor(rnd() * pinColors.length)];

  const tapeLeft = `${8 + seededRandom(String(idSeed) + "tape")() * 20}%`;
  const tapeRot = (seededRandom(String(idSeed) + "tr")() - 0.5) * 10;

  return (
    <div
      className={cn(
        "relative w-full origin-top transition-transform will-change-transform"
      )}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {/* 마스킹 테이프 */}
      <MaskingTape
        variant={tapeVariant as any}
        left={tapeLeft}
        rotate={tapeRot}
      />

      {/* 새 3D 압정(정면 비스듬) — 바늘팁이 사진 상단을 찍도록 top 좁게 */}
      <PushPin left={pinLeft} top="-2px" rotate={pinRot} color={pinColor} />

      {/* 폴라로이드 카드 (테두리/그림자 유지) */}
      <div
        className={cn(
          "relative rounded-[14px] p-2 bg-[linear-gradient(180deg,#fefefe_0%,#faf9f7_60%,#f6f3ee_100%)]",
          "ring-1 ring-stone-300/50 shadow-[0_14px_30px_-14px_rgba(70,50,20,0.32)]"
        )}
      >
        <div className="relative rounded-[10px] overflow-hidden bg-neutral-200">
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================
 * 이미지 박스
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

function ImageBox({
  src,
  alt,
  minHeight = 180,
  maxHeight = 640,
  onOpen,
  hearts = 0,
  idSeed,
}: {
  src?: string | null;
  alt?: string | null;
  minHeight?: number;
  maxHeight?: number;
  onOpen: () => void;
  hearts?: number;
  idSeed: string | number;
}) {
  const { ratio, loaded } = useImageAspect(src ?? undefined);
  const aspectRatio = ratio ?? 4 / 3;
  const clampStyle: React.CSSProperties = {
    aspectRatio: String(aspectRatio),
    minHeight,
    maxHeight,
  };

  return (
    <PolaroidOnCork idSeed={idSeed}>
      {/* ✅ button이 최상위 클릭 레이어 */}
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
        {/* 이미지 */}
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
                "group-hover:scale-[1.012]"
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

        {/* 하단 인화지 여백(라벨) */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/92 to-white/0 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-1 flex items-end justify-between px-3 text-[12px]">
          <span className="font-medium text-stone-700/90 tabular-nums">
            {hearts ? `❤️ ${hearts}` : ""}
          </span>
          <span className="text-stone-500/90 line-clamp-1">{alt ?? ""}</span>
        </div>
      </button>
    </PolaroidOnCork>
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
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-7 [column-fill:balance]">
      {items.map((f) => (
        <div key={f.id} className="mb-7 break-inside-avoid">
          <ImageBox
            idSeed={f.id}
            src={f.cover_photo_path ? publicUrl(f.cover_photo_path) : undefined}
            alt={f.title ?? ""}
            onOpen={() => onOpen(f.id)}
            hearts={f.hearts ?? 0}
          />
        </div>
      ))}
    </div>
  );
}

/* =========================
 * ❤️ 하트 버스트
 * =======================*/
function useInjectHeartStyles() {
  useEffect(() => {
    const id = "mem-heart-anim-style-v2";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
@keyframes mem-heart-rise {
  0%   { transform: translateY(0) scale(0.85); opacity: 0; filter: blur(0.5px); }
  25%  { transform: translateY(-10px) scale(1.1); opacity: 1; filter: blur(0); }
  100% { transform: translateY(-80px) scale(1.05); opacity: 0; filter: blur(0.6px); }
}
.mem-heart-v2 {
  position: absolute;
  font-size: 22px;
  line-height: 1;
  will-change: transform, opacity, filter;
  animation: mem-heart-rise 900ms ease-out forwards;
  text-shadow: 0 1px 0 rgba(0,0,0,0.04);
}
.mem-heart-center {
  position: absolute;
  font-size: 28px;
  line-height: 1;
  left: 50%;
  transform: translateX(-50%) translateY(-6px) scale(0.8);
  opacity: 0;
  animation: mem-heart-center-pop 700ms ease-out forwards;
}
@keyframes mem-heart-center-pop {
  0%   { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.7); }
  40%  { opacity: 1; transform: translateX(-50%) translateY(-10px) scale(1.1); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-14px) scale(1.0); }
}
`;
    document.head.appendChild(style);
  }, []);
}

function HeartBurst({ trigger }: { trigger: number }) {
  useInjectHeartStyles();
  const [parts, setParts] = useState<
    { left: number; delay: number; emoji: string }[]
  >([]);

  useEffect(() => {
    if (trigger <= 0) return;
    const emojis = ["💗", "💕", "❤️"];
    const arr = Array.from({ length: 5 }).map(() => ({
      left: Math.round(-28 + Math.random() * 56),
      delay: Math.random() * 120,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    }));
    setParts(arr);
    const t = setTimeout(() => setParts([]), 1000);
    return () => clearTimeout(t);
  }, [trigger]);

  if (trigger <= 0) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 bottom-6 -translate-x-1/2">
      <span className="mem-heart-center" aria-hidden>
        💖
      </span>
      {parts.map((p, i) => (
        <span
          key={`${trigger}-${i}`}
          className="mem-heart-v2"
          style={{ left: `${p.left}px`, animationDelay: `${p.delay}ms` }}
          aria-hidden
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

/* =========================
 * ✅ 메모 패드: 배경/보더 제거, 텍스트만 (벽에 쓴 느낌)
 * =======================*/
function MemoPad({
  fragment,
  outerSide,
  onSaved,
  onHeartsChange,
}: {
  fragment: Fragment & { memo?: string | null; hearts?: number | null };
  outerSide: "left" | "right";
  onSaved?: (memo: string) => void;
  onHeartsChange?: (id: Fragment["id"], hearts: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(fragment.memo ?? "");
  const [saving, setSaving] = useState(false);

  const [hearts, setHearts] = useState<number>(fragment.hearts ?? 0);
  const [hearting, setHearting] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  const placeClass =
    outerSide === "left"
      ? "left-0 pl-0 md:pl-4 justify-start text-left"
      : "right-0 pr-0 md:pr-4 justify-end text-right";

  const dateStr = formatDate(fragment.event_date);

  const handleHeartUp = async () => {
    if (hearting) return;
    setHearting(true);
    try {
      const next = hearts + 1;
      await updateFragment(fragment.id, { hearts: next });
      setHearts(next);
      onHeartsChange?.(fragment.id, next);
      setBurstKey((k) => k + 1);
    } finally {
      setHearting(false);
    }
  };

  return (
    <div
      className={cn(
        "absolute top-1/2 -translate-y-1/2 w-[min(58ch,42vw)] md:w-[min(62ch,40vw)]",
        "flex flex-col gap-3"
      )}
      style={{ ...(outerSide === "left" ? { left: 0 } : { right: 0 }) }}
    >
      {/* 하트 버스트 (텍스트 위 얹힘) */}
      <div className="relative">
        <HeartBurst trigger={burstKey} />
      </div>

      {/* 날짜/제목/본문 - 배경 없이 텍스트만 */}
      <div className={cn("mb-2", placeClass)}>
        <div className="text-[14px] md:text-[16px] tabular-nums text-stone-700 tracking-[0.02em]">
          {dateStr}
        </div>
        <div
          className={cn(
            "mt-1 font-extrabold text-stone-950 font-hand",
            "text-[28px] sm:text-[32px] md:text-[36px] leading-snug"
          )}
          style={{ textShadow: "0 0 1px rgba(0,0,0,0.04)" }}
        >
          {fragment.title || "제목 없음"}
        </div>
      </div>

      {editing ? (
        <>
          <textarea
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="그날의 감정, 소소한 메모를 남겨보자…"
            className={cn(
              "w-full min-h-[170px] md:min-h-[190px] resize-y rounded-xl border",
              "bg-white/80 focus:bg-white focus:outline-none",
              "p-3 text-[15.5px] md:text-[17px] leading-relaxed",
              "font-hand"
            )}
          />
          <div
            className={cn("mt-2 flex items-center gap-2 flex-wrap", placeClass)}
          >
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

            <Button
              size="lg"
              variant="outline"
              className="rounded-full h-10 px-4 text-base gap-2"
              onClick={handleHeartUp}
              disabled={hearting}
              title="하트 올리기"
            >
              <span className="text-xl" aria-hidden>
                ❤️
              </span>
              <span className="font-semibold">하트</span>
              <span className="ml-1 text-stone-500">({hearts})</span>
            </Button>
          </div>
        </>
      ) : (
        <>
          <div
            className={cn(
              "whitespace-pre-wrap text-[15.5px] md:text-[17px] leading-relaxed",
              "text-stone-900/95 font-hand"
            )}
          >
            {val || "아직 메모가 없어요. ‘메모 수정’으로 기록해볼까요?"}
          </div>
          <div
            className={cn("mt-2 flex items-center gap-2 flex-wrap", placeClass)}
          >
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              메모 수정
            </Button>

            <Button
              size="lg"
              variant="secondary"
              className="rounded-lg h-10 px-4 text-base gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-sm"
              onClick={handleHeartUp}
              disabled={hearting}
              title="하트 누르기"
            >
              <span className="text-xl" aria-hidden>
                ❤️
              </span>
              <span className="font-semibold">하트</span>
              <span className="ml-1 text-stone-500">({hearts})</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================
 * 🗓 타임라인
 * =======================*/
function TimelineLarge({
  items,
  onOpen,
  onSaveMemo,
  onHeartsChange,
}: {
  items: Fragment[];
  onOpen: (id: string | number) => void;
  onSaveMemo: (id: Fragment["id"], memo: string) => void;
  onHeartsChange: (id: Fragment["id"], hearts: number) => void;
}) {
  const groups = useMemo(() => groupByYearMonth(items), [items]);
  return (
    <div className="relative">
      {groups.map(({ ym, rows }) => (
        <MonthSection
          key={ym}
          ym={ym}
          rows={
            rows as (Fragment & {
              memo?: string | null;
              hearts?: number | null;
            })[]
          }
          onOpen={onOpen}
          onSaveMemo={onSaveMemo}
          onHeartsChange={onHeartsChange}
        />
      ))}
    </div>
  );
}

/** 월 섹션: 배경/보더 제거, 텍스트만 */
function MonthSection({
  ym,
  rows,
  onOpen,
  onSaveMemo,
  onHeartsChange,
}: {
  ym: string;
  rows: (Fragment & { memo?: string | null; hearts?: number | null })[];
  onOpen: (id: string | number) => void;
  onSaveMemo: (id: Fragment["id"], memo: string) => void;
  onHeartsChange: (id: Fragment["id"], hearts: number) => void;
}) {
  const monthNum = parseMonthFromYm(ym);
  const emoji = monthEmoji(monthNum);

  return (
    <section className="relative py-10" id={ymToId(ym)}>
      {/* 월 타이틀: 텍스트만 */}
      <div className="mx-auto mb-6 w-[min(1100px,96%)]">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <div className="text-[26px] md:text-[32px] font-extrabold font-hand text-stone-950">
              {monthNum}월
            </div>
            <div className="text-[13px] md:text-[14px] tabular-nums text-stone-600">
              {ym}
            </div>
          </div>
          <div className="text-[15px] md:text-[17px] text-stone-900/95 font-hand">
            <span className="mr-1" aria-hidden>
              {emoji}
            </span>
            {monthMessage(monthNum)}
          </div>
        </div>
      </div>

      {/* 카드 + 메모 (양옆 배치) */}
      <div className="space-y-16">
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
                  idSeed={f.id}
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
                onHeartsChange={onHeartsChange}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* =========================
 * 월 내비게이터 (UI만) – 유지
 * =======================*/
function MonthNavigatorPanel({ months }: { months: string[] }) {
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
        className={cn(
          "flex flex-col items-center gap-2 max-h-[70vh] overflow-y-auto"
        )}
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
                    className={cn(
                      "min-w-[52px] rounded-full px-3 py-1 text-xs tabular-nums ring-1 transition",
                      "hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isActive
                        ? "bg-rose-100 text-rose-700 ring-rose-200"
                        : "bg-background text-muted-foreground ring-border"
                    )}
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
 * 월 내비게이터 포털
 * =======================*/
function MonthNavigatorFixedPortal({
  months,
  show,
}: {
  months: string[];
  show: boolean;
}) {
  if (typeof document === "undefined" || !show) return null;
  return createPortal(
    <div
      className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-50
                 rounded-2xl bg-white/85 px-2 py-3 shadow-md ring-1 ring-border backdrop-blur pointer-events-auto"
      role="navigation"
      aria-label="월 타임라인 내비게이션"
    >
      <MonthNavigatorPanel months={months} />
    </div>,
    document.body
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

/** 월별 이모지/멘트 (유지) */
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
 * 빈/로딩 상태 (유지)
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
          <div className="w-full min-h-[180px] animate-pulse rounded-2xl bg-gradient-to-br from-neutral-200/60 to-neutral-100/60" />
        </Card>
      ))}
    </div>
  );
}

/* =========================
 * 페이지
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
      {/* 코르크보드 배경 */}
      <CorkboardBackdrop />

      {/* 종이 래퍼 */}
      <div
        className={cn(
          "relative z-[2] w-full sm:w-[92%] lg:w-[86%] mx-auto max-w-7xl p-4 sm:p-6 space-y-6",
          "rounded-3xl ring-1 ring-amber-300/50",
          "shadow-[0_24px_60px_-24px_rgba(80,60,25,0.45)]",
          "backdrop-blur-[2px]"
        )}
        style={{
          background:
            "linear-gradient(180deg, rgba(252,244,230,0.92) 0%, rgba(244,229,206,0.92) 60%, rgba(238,220,194,0.92) 100%)",
        }}
      >
        {/* Sticky Toolbar */}
        <div
          data-scrolled={scrolled ? "y" : "n"}
          className={[
            "sticky top-40 z-20 transition-all",
            "backdrop-blur supports-[backdrop-filter]:bg-white/65",
            "data-[scrolled=y]:shadow-md data-[scrolled=y]:ring-1 data-[scrolled=y]:ring-border",
            "rounded-2xl",
          ].join(" ")}
        >
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-3 sm:px-4">
            <div className="flex items-center gap-3">
              <span
                className={[
                  "text-[13px] font-semibold",
                  isTimeline ? "text-muted-foreground" : "text-foreground",
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
                  onHeartsChange={(id, hearts) =>
                    setItems((prev) =>
                      prev.map((it) => (it.id === id ? { ...it, hearts } : it))
                    )
                  }
                />
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

      {/* 월 네비 포털 */}
      <MonthNavigatorFixedPortal
        months={months}
        show={isTimeline && !loading && months.length > 0}
      />
    </>
  );
}
