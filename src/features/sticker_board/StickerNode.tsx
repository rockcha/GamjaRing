"use client";

import { Group, Image as KImage, Rect } from "react-konva";
import useImage from "use-image";
import { useMemo, useRef } from "react";
import type { PlacedSticker } from "./types";
import { renderEmojiToImage } from "./emojiTexture";
import { clamp } from "./clamp";

type Props = {
  s: PlacedSticker;
  editable: boolean;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<PlacedSticker>) => void;
};

export default function StickerNode({
  s,
  editable,
  selected,
  onSelect,
  onChange,
}: Props) {
  const groupRef = useRef<any>(null);

  const baseW = s.base_w || 50;
  const baseH = s.base_h || 50;
  const effScale = clamp(s.scale ?? 1, 0.1, 3.0);
  const effRot = s.rotation ?? 0;
  const flipX = !!s.flip_x;

  // 저장 좌표는 좌상단, 렌더는 중심 기준
  const centerX = s.x + baseW / 2;
  const centerY = s.y + baseH / 2;

  const [pngEl] = useImage(
    s.type === "image" && s.url ? s.url : undefined,
    "anonymous"
  );
  const emojiEl = useMemo(
    () =>
      s.type === "emoji" && s.emoji
        ? renderEmojiToImage(s.emoji, baseW)
        : undefined,
    [s.type, s.emoji, baseW]
  );
  const img = s.type === "emoji" ? emojiEl : pngEl;

  const setCursor = (cursor: string) => {
    const stage = groupRef.current?.getStage();
    const container = stage?.container();
    if (container) container.style.cursor = cursor;
  };

  // 포인터 따라가도록 (포인터 좌표를 그대로 사용)
  const dragBoundFunc = (pos: { x: number; y: number }) => {
    const stage = groupRef.current?.getStage();
    const p = stage?.getPointerPosition();
    return p ? { x: p.x, y: p.y } : pos;
  };

  return (
    <Group
      ref={groupRef}
      x={centerX}
      y={centerY}
      // ⚠️ Group에는 offset을 주지 않는다. 내부 노드를 -w/2,-h/2로 중앙 정렬.
      scaleX={effScale * (flipX ? -1 : 1)}
      scaleY={effScale}
      rotation={effRot}
      draggable={editable}
      dragBoundFunc={dragBoundFunc}
      onPointerEnter={() => editable && setCursor("grab")}
      onPointerLeave={() => setCursor("default")}
      onDragStart={() => setCursor("grabbing")}
      onDragEnd={(e) => {
        setCursor("grab");
        const stage = groupRef.current?.getStage();
        const p = stage?.getPointerPosition();
        const inside =
          !!p &&
          p.x >= 0 &&
          p.y >= 0 &&
          p.x <= stage.width() &&
          p.y <= stage.height();

        if (!inside) {
          // 보드 밖 → 원위치로 복귀
          e.target.position({ x: centerX, y: centerY });
          e.target.getLayer()?.batchDraw();
          return;
        }
        // 보드 안 → 좌상단 기준으로 저장
        onChange({
          x: e.target.x() - baseW / 2,
          y: e.target.y() - baseH / 2,
        });
      }}
      onClick={onSelect} // 클릭으로만 선택
      onTap={onSelect}
      listening={editable}
    >
      {/* 이미지도 중심 기준으로 배치 */}
      <KImage
        image={img as any}
        x={-baseW / 2}
        y={-baseH / 2}
        width={baseW}
        height={baseH}
      />

      {/* 선택 박스: neutral-300, 클릭된 경우에만 */}
      {selected && (
        <Rect
          x={-baseW / 2}
          y={-baseH / 2}
          width={baseW}
          height={baseH}
          stroke={"#d4d4d8"} // neutral-300
          strokeWidth={1.5}
          listening={false}
        />
      )}
    </Group>
  );
}
