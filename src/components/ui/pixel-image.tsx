// src/components/ui/pixel-image.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Grid = { rows: number; cols: number };

const DEFAULT_GRIDS: Record<string, Grid> = {
  "6x4": { rows: 4, cols: 6 },
  "8x8": { rows: 8, cols: 8 },
  "8x3": { rows: 3, cols: 8 },
  "4x6": { rows: 6, cols: 4 },
  "3x8": { rows: 8, cols: 3 },
};

type PredefinedGridKey = keyof typeof DEFAULT_GRIDS;

interface PixelImageProps {
  src: string;
  grid?: PredefinedGridKey;
  customGrid?: Grid;
  grayscaleAnimation?: boolean;
  pixelFadeInDuration?: number; // ms
  maxAnimationDelay?: number; // ms
  colorRevealDelay?: number; // ms
  /** 애니를 다시 재생시키는 키 */
  playToken?: number;
  /** 컨테이너 클래스 (선택) */
  className?: string;
}

/** 변경점
 * - base <img> 제거: 깜빡임/선행노출 방지
 * - 원본 이미지 자연비율을 읽어 컨테이너 aspect-ratio에 반영
 * - background-size: cover, background-position: center 로 왜곡 제거
 */
export const PixelImage = ({
  src,
  grid = "6x4",
  grayscaleAnimation = true,
  pixelFadeInDuration = 1000,
  maxAnimationDelay = 1200,
  colorRevealDelay = 1300,
  customGrid,
  playToken = 0,
  className,
}: PixelImageProps) => {
  const [visible, setVisible] = useState(false);
  const [colorOn, setColorOn] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null); // natural aspect ratio
  const containerRef = useRef<HTMLDivElement | null>(null);

  const MIN_GRID = 1;
  const MAX_GRID = 16;

  const { rows, cols } = useMemo(() => {
    const isValidGrid = (g?: Grid) =>
      !!g &&
      Number.isInteger(g.rows) &&
      Number.isInteger(g.cols) &&
      g.rows >= MIN_GRID &&
      g.cols >= MIN_GRID &&
      g.rows <= MAX_GRID &&
      g.cols <= MAX_GRID;

    return isValidGrid(customGrid) ? customGrid! : DEFAULT_GRIDS[grid];
  }, [customGrid, grid]);

  // 원본 이미지 비율 로드 (왜곡 방지)
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img.onload = () => {
      if (!alive) return;
      if (img.naturalWidth && img.naturalHeight) {
        setRatio(img.naturalWidth / img.naturalHeight);
      } else {
        setRatio(null);
      }
    };
    img.onerror = () => setRatio(null);
    return () => {
      alive = false;
    };
  }, [src]);

  // playToken이 바뀔 때마다 애니 초기화
  useEffect(() => {
    setVisible(false);
    setColorOn(false);
    const t0 = window.setTimeout(() => setVisible(true), 20);
    const t1 = window.setTimeout(() => setColorOn(true), colorRevealDelay);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [playToken, colorRevealDelay]);

  // 조각(clip-path + 개별 딜레이). playToken 포함 → 매번 새 랜덤
  const pieces = useMemo(() => {
    const total = rows * cols;
    return Array.from({ length: total }, (_, index) => {
      const r = Math.floor(index / cols);
      const c = index % cols;
      const x0 = c * (100 / cols);
      const y0 = r * (100 / rows);
      const x1 = (c + 1) * (100 / cols);
      const y1 = (r + 1) * (100 / rows);
      const clipPath = `polygon(${x0}% ${y0}%, ${x1}% ${y0}%, ${x1}% ${y1}%, ${x0}% ${y1}%)`;
      const delay = Math.random() * maxAnimationDelay;
      return { clipPath, delay };
    });
  }, [rows, cols, maxAnimationDelay, playToken]);

  // 컨테이너 style: 원본비 비율을 알면 그대로, 모르면 살짝 안전한 4/3
  const aspect = ratio ? `${ratio} / 1` : "4 / 3";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden rounded-[1.5rem] md:rounded-[2rem]",
        className
      )}
      style={{
        // 핵심: 자연 비율 유지
        aspectRatio: aspect,
      }}
    >
      {/* 조각 애니메이션 (등장) - base 이미지 제거 */}
      {pieces.map((piece, i) => (
        <div
          key={i}
          className={cn(
            "absolute inset-0 transition-opacity ease-out will-change-opacity",
            visible ? "opacity-100" : "opacity-0"
          )}
          style={{
            clipPath: piece.clipPath,
            transitionDelay: `${piece.delay}ms`,
            transitionDuration: `${pixelFadeInDuration}ms`,
          }}
        >
          <div
            className={cn(
              "absolute inset-0",
              grayscaleAnimation && (colorOn ? "filter-none" : "grayscale")
            )}
            style={{
              // cover + center로 왜곡 방지하면서 모든 조각이 동일한 배경 정렬
              backgroundImage: `url(${src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              transition: grayscaleAnimation
                ? `filter ${pixelFadeInDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`
                : "none",
            }}
          />
        </div>
      ))}
    </div>
  );
};
