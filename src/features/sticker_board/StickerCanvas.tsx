"use client";

import { Stage, Layer, Image as KImage } from "react-konva";
import useImage from "use-image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardMeta, PlacedSticker, InventoryRow } from "./types";
import StickerNode from "./StickerNode";
import { DRAG_EMOJI_PREVIEW_SCALE } from "./dragPreview";
import { renderEmojiToImage } from "./emojiTexture";
import StickerInlineToolbar from "./StickerInlineToolbar";

type Props = {
  board: BoardMeta;
  placed: PlacedSticker[];
  editable: boolean;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  onPatch: (id: string, patch: Partial<PlacedSticker>) => void;

  // 인벤토리 드래그 상태
  draggingTitle: string | null;
  draggingItem: InventoryRow | null;
  dragSeed: { clientX: number; clientY: number } | null;

  // Stage 컨테이너를 부모에 제공 (드롭 판정용)
  bindStageContainer?: (el: HTMLDivElement | null) => void;

  // 인라인 툴바 콜백
  onFront: () => void;
  onBack: () => void;
  onDelete: () => void;
  onRotateStep: (d: number) => void;
  onScaleStep: (d: number) => void;
  onFlipX: () => void;
};

export default function StickerCanvas({
  board,
  placed,
  editable,
  selectedId,
  setSelectedId,
  onPatch,
  draggingTitle,
  draggingItem,
  dragSeed,
  bindStageContainer,
  onFront,
  onBack,
  onDelete,
  onRotateStep,
  onScaleStep,
  onFlipX,
}: Props) {
  const [bg] = useImage(board.bg_url ?? "", "anonymous");
  const stageRef = useRef<any>(null);

  // 부모로 Stage 컨테이너 전달 + rect 보관
  const [stageRect, setStageRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    const el: HTMLDivElement | null = stageRef.current?.container?.() ?? null;
    bindStageContainer?.(el);
    const update = () => setStageRect(el?.getBoundingClientRect() ?? null);
    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      bindStageContainer?.(null);
    };
  }, [bindStageContainer]);

  const sorted = useMemo(
    () => [...placed].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)),
    [placed]
  );

  // Stage 내부 고스트
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // 고스트 텍스처
  const [ghostPng] = useImage(
    draggingItem?.type === "image" ? draggingItem?.url ?? "" : undefined,
    "anonymous"
  );
  const ghostEmoji = useMemo(() => {
    if (!draggingItem || draggingItem.type !== "emoji" || !draggingItem.emoji)
      return undefined;
    return renderEmojiToImage(
      draggingItem.emoji,
      Math.round(draggingItem.base_w * DRAG_EMOJI_PREVIEW_SCALE)
    );
  }, [draggingItem]);

  const getRel = (clientX: number, clientY: number) => {
    const container: HTMLDivElement | null = stageRef.current?.container?.();
    if (!container) return { x: 0, y: 0, inside: false };
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    return {
      x: Math.max(0, Math.min(rect.width, x)),
      y: Math.max(0, Math.min(rect.height, y)),
      inside,
    };
  };

  // seed가 있으면 Stage 안에 들어온 경우에만 고스트 표시
  useEffect(() => {
    if (!(editable && draggingTitle && dragSeed)) return;
    const { x, y, inside } = getRel(dragSeed.clientX, dragSeed.clientY);
    setGhost(inside ? { x, y } : null);
  }, [editable, draggingTitle, dragSeed]);

  // 전역 이동 시 Stage 내부일 때만 고스트 갱신
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!(editable && draggingTitle)) return;
      const { x, y, inside } = getRel(e.clientX, e.clientY);
      setGhost(inside ? { x, y } : null);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [editable, draggingTitle]);

  // 선택 스티커 anchor(Stage 좌표) 계산 → 인라인 툴바 배치용
  const anchor = useMemo(() => {
    if (!selectedId) return null;
    const s = placed.find((p) => p.id === selectedId);
    if (!s) return null;
    return {
      cx: s.x + (s.base_w || 0) / 2,
      cy: s.y + (s.base_h || 0) / 2,
      w: s.base_w || 0,
      h: s.base_h || 0,
    };
  }, [selectedId, placed]);

  return (
    <>
      <Stage
        ref={stageRef}
        width={board.width}
        height={board.height}
        onPointerDown={(e: any) => {
          const stage = e.target?.getStage?.();
          if (stage && e.target === stage) setSelectedId(null);
        }}
        className={editable && draggingTitle ? "cursor-grabbing" : undefined}
        style={{ touchAction: editable && draggingTitle ? "none" : "auto" }}
      >
        <Layer>
          {bg && (
            <KImage
              image={bg as any}
              x={0}
              y={0}
              width={board.width}
              height={board.height}
            />
          )}

          {sorted.map((s) => (
            <StickerNode
              key={s.id}
              s={s}
              editable={editable}
              selected={s.id === selectedId}
              onSelect={() => setSelectedId(s.id)}
              onChange={(patch) => onPatch(s.id, patch)}
              onDragStart={() => setDragging(true)}
              onDragEnd={() => setTimeout(() => setDragging(false), 180)}
            />
          ))}

          {/* Stage 내부 미리보기 고스트 (이미지/이모지 모두 KImage로 통일) */}
          {editable && draggingItem && ghost && (
            <KImage
              image={
                draggingItem.type === "image"
                  ? (ghostPng as any)
                  : (ghostEmoji as any)
              }
              x={
                ghost.x -
                (draggingItem.base_w *
                  (draggingItem.type === "emoji"
                    ? DRAG_EMOJI_PREVIEW_SCALE
                    : 1)) /
                  2
              }
              y={
                ghost.y -
                (draggingItem.base_h *
                  (draggingItem.type === "emoji"
                    ? DRAG_EMOJI_PREVIEW_SCALE
                    : 1)) /
                  2
              }
              width={
                draggingItem.base_w *
                (draggingItem.type === "emoji" ? DRAG_EMOJI_PREVIEW_SCALE : 1)
              }
              height={
                draggingItem.base_h *
                (draggingItem.type === "emoji" ? DRAG_EMOJI_PREVIEW_SCALE : 1)
              }
              opacity={0.8}
              listening={false}
            />
          )}
        </Layer>
      </Stage>

      {/* 선택 스티커 위 오버레이 툴바 */}
      <StickerInlineToolbar
        visible={!!selectedId && !dragging && editable}
        anchor={anchor}
        stageRect={stageRect}
        onFront={onFront}
        onBack={onBack}
        onDelete={onDelete}
        onRotateStep={onRotateStep}
        onScaleStep={onScaleStep}
        onFlipX={onFlipX}
      />
    </>
  );
}
