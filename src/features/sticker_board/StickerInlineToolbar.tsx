"use client";

import { useEffect, useRef, useState } from "react";
import {
  BringToFront,
  SendToBack,
  RotateCcw,
  RotateCw,
  ZoomOut,
  ZoomIn,
  FlipHorizontal,
  Trash2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * 선택된 스티커 위에 떠 있는 미니 툴바 (아이콘 Only + 툴팁)
 * - Stage 좌표(anchor)와 Stage DOMRect를 받아 브라우저 좌표로 변환해 배치
 * - 화면 상단에 닿으면 자동으로 아래쪽으로 뒤집어 뜸
 */
type Props = {
  /** 보이기/숨기기 */
  visible: boolean;
  /** 선택 스티커의 Stage 좌표계 중심(cx, cy)과 원본 base 크기(w,h) */
  anchor: { cx: number; cy: number; w: number; h: number } | null;
  /** Stage 컨테이너의 DOMRect */
  stageRect: DOMRect | null;

  onFront: () => void;
  onBack: () => void;
  onDelete: () => void;
  onRotateStep: (delta: number) => void;
  onScaleStep: (delta: number) => void;
  onFlipX: () => void;
};

export default function StickerInlineToolbar({
  visible,
  anchor,
  stageRect,
  onFront,
  onBack,
  onDelete,
  onRotateStep,
  onScaleStep,
  onFlipX,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; flip: boolean }>({
    left: 0,
    top: 0,
    flip: false,
  });

  // anchor(Stage 좌표) → 페이지 좌표 변환하여 툴바 위치 계산
  useEffect(() => {
    if (!visible || !anchor || !stageRect) return;

    const padding = 8;
    const approxH = 40; // 툴바 높이 근사값
    const toolbarDefaultHalf = 100; // 가정 폭 절반(후에 실제 width로 보정)

    // 1) Stage 좌표 → 페이지 좌표
    let left = stageRect.left + anchor.cx - toolbarDefaultHalf;
    let top = stageRect.top + anchor.cy - anchor.h / 2 - padding - approxH; // 기본: 위쪽

    // 2) 위로 튀어나오면 아래로 뒤집기
    let flip = false;
    const viewportTop = window.scrollY;
    if (top < viewportTop + 8) {
      top = stageRect.top + anchor.cy + anchor.h / 2 + padding;
      flip = true;
    }

    // 3) 실제 width 중앙정렬 보정
    const realW = wrapRef.current?.offsetWidth ?? toolbarDefaultHalf * 2;
    left = stageRect.left + anchor.cx - realW / 2;

    // 4) 좌우 경계 살짝 클램프
    const minLeft = 8;
    const maxLeft = window.innerWidth - realW - 8;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;

    setPos({ left, top, flip });
  }, [visible, anchor, stageRect]);

  if (!visible || !anchor || !stageRect) return null;

  const IconBtn = ({
    title,
    onClick,
    children,
    danger = false,
  }: {
    title: string;
    onClick: () => void;
    children: React.ReactNode;
    danger?: boolean;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={title}
          title={title}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white/95 hover:bg-white shadow-sm ${
            danger ? "text-red-600" : ""
          }`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side={pos.flip ? "top" : "bottom"}>
        {title}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={120}>
      <div
        ref={wrapRef}
        className="fixed z-[10000] flex items-center gap-1 rounded-lg border bg-white/90 backdrop-blur px-1 py-1 shadow-sm"
        style={{ left: pos.left, top: pos.top }}
      >
        <IconBtn title="맨앞으로" onClick={onFront}>
          <BringToFront className="h-4 w-4" />
        </IconBtn>
        <IconBtn title="맨뒤로" onClick={onBack}>
          <SendToBack className="h-4 w-4" />
        </IconBtn>

        <span className="mx-1 h-4 w-px bg-neutral-200" />

        <IconBtn title="회전 -15°" onClick={() => onRotateStep(-15)}>
          <RotateCcw className="h-4 w-4" />
        </IconBtn>
        <IconBtn title="회전 +15°" onClick={() => onRotateStep(15)}>
          <RotateCw className="h-4 w-4" />
        </IconBtn>

        <span className="mx-1 h-4 w-px bg-neutral-200" />

        <IconBtn title="축소" onClick={() => onScaleStep(-0.1)}>
          <ZoomOut className="h-4 w-4" />
        </IconBtn>
        <IconBtn title="확대" onClick={() => onScaleStep(0.1)}>
          <ZoomIn className="h-4 w-4" />
        </IconBtn>

        <span className="mx-1 h-4 w-px bg-neutral-200" />

        <IconBtn title="좌우 반전" onClick={onFlipX}>
          <FlipHorizontal className="h-4 w-4" />
        </IconBtn>

        <span className="mx-1 h-4 w-px bg-neutral-200" />

        <IconBtn title="스티커 제거" onClick={onDelete} danger>
          <Trash2 className="h-4 w-4" />
        </IconBtn>
      </div>
    </TooltipProvider>
  );
}
