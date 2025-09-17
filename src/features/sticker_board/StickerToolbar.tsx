// src/features/sticker/StickerToolbar.tsx
"use client";

import type { PlacedSticker } from "./types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

type Props = {
  selected: PlacedSticker | null;
  onFront: () => void;
  onBack: () => void;
  onDelete: () => void;
  onRotateStep: (delta: number) => void;
  onScaleStep: (delta: number) => void;
  onFlipX: () => void;
};

export default function StickerToolbar({
  selected,
  onFront,
  onBack,
  onDelete,
  onRotateStep,
  onScaleStep,
  onFlipX,
}: Props) {
  const disabled = !selected;

  return (
    <TooltipProvider delayDuration={150}>
      <div
        role="toolbar"
        aria-label="스티커 편집 도구"
        className="flex flex-wrap items-center gap-2 rounded-xl border bg-white/90 backdrop-blur px-2 py-2 shadow-sm"
      >
        {/* 정렬(맨앞/맨뒤) */}
        <ToolButton
          disabled={disabled}
          tooltip="맨앞으로"
          onClick={onFront}
          icon={<BringToFront className="h-4 w-4" />}
          label="맨앞"
        />
        <ToolButton
          disabled={disabled}
          tooltip="맨뒤로"
          onClick={onBack}
          icon={<SendToBack className="h-4 w-4" />}
          label="맨뒤"
        />

        <Divider />

        {/* 회전 */}
        <ToolButton
          disabled={disabled}
          tooltip="회전 -15°"
          onClick={() => onRotateStep(-15)}
          icon={<RotateCcw className="h-4 w-4" />}
          label="회전 -15°"
          variant="outline"
        />
        <ToolButton
          disabled={disabled}
          tooltip="회전 +15°"
          onClick={() => onRotateStep(15)}
          icon={<RotateCw className="h-4 w-4" />}
          label="회전 +15°"
          variant="outline"
        />

        <Divider />

        {/* 크기 */}
        <ToolButton
          disabled={disabled}
          tooltip="축소"
          onClick={() => onScaleStep(-0.1)}
          icon={<ZoomOut className="h-4 w-4" />}
          label="축소"
          variant="outline"
        />
        <ToolButton
          disabled={disabled}
          tooltip="확대"
          onClick={() => onScaleStep(0.1)}
          icon={<ZoomIn className="h-4 w-4" />}
          label="확대"
          variant="outline"
        />

        <Divider />

        {/* 반전 */}
        <ToolButton
          disabled={disabled}
          tooltip="좌우 반전"
          onClick={onFlipX}
          icon={<FlipHorizontal className="h-4 w-4" />}
          label="좌우반전"
        />

        <Divider />

        {/* 제거 (삭제 → 제거, 강조 색상) */}
        <ToolButton
          disabled={disabled}
          tooltip="스티커 제거"
          onClick={onDelete}
          icon={<Trash2 className="h-4 w-4" />}
          label="제거"
          variant="destructive"
        />
      </div>
    </TooltipProvider>
  );
}

/* ────────────────────────── 유틸 컴포넌트 ────────────────────────── */

function Divider() {
  return <div className="mx-1 h-6 w-px bg-neutral-200" />;
}

type ToolButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "ghost"
    | "link";
};

function ToolButton({
  onClick,
  disabled,
  icon,
  label,
  tooltip,
  variant = "secondary",
}: ToolButtonProps) {
  const btn = (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant={variant}
      className="h-9 gap-1.5 rounded-lg px-2.5 text-sm"
      aria-disabled={disabled}
    >
      {icon}
      <span className="leading-none">{label}</span>
    </Button>
  );

  // shadcn Tooltip만 사용 (요청 반영)
  if (!tooltip) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
