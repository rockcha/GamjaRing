"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useStickerBoard } from "./useStickerBoard";
import StickerCanvas from "./StickerCanvas";
import InventoryDock from "./InventoryDock";
import StickerToolbar from "./StickerToolbar";
import {
  moveToBack,
  moveToFront,
  placeFromInventory,
  removeSticker,
  updateSticker,
  getPlaced,
  getInventory,
} from "@/features/sticker_board/supa";
import type { PlacedSticker } from "@/features/sticker_board/types";
import { clamp } from "@/features/sticker_board/clamp";
import EmojiShopButton from "./EmojiShopButton";
import { DRAG_EMOJI_PREVIEW_SCALE } from "./dragPreview";

/** 배경 테마 정의 */
type ThemeKey = "beige" | "mint" | "sky" | "lavender" | "peach";
const BG_THEMES: Record<
  ThemeKey,
  { label: string; classes: string; dot: string }
> = {
  beige: {
    label: "베이지",
    classes: "bg-gradient-to-br from-[#F9F5EC] via-[#F3E9D2] to-[#EFE0C4]",
    dot: "bg-gradient-to-br from-[#F9F5EC] via-[#F3E9D2] to-[#EFE0C4]",
  },
  mint: {
    label: "민트",
    classes: "bg-gradient-to-br from-[#ECFDF5] via-[#D1FAE5] to-[#A7F3D0]",
    dot: "bg-gradient-to-br from-[#ECFDF5] via-[#D1FAE5] to-[#A7F3D0]",
  },
  sky: {
    label: "스카이",
    classes: "bg-gradient-to-br from-[#F0F9FF] via-[#E0F2FE] to-[#BAE6FD]",
    dot: "bg-gradient-to-br from-[#F0F9FF] via-[#E0F2FE] to-[#BAE6FD]",
  },
  lavender: {
    label: "라벤더",
    classes: "bg-gradient-to-br from-[#F5F3FF] via-[#EDE9FE] to-[#DDD6FE]",
    dot: "bg-gradient-to-br from-[#F5F3FF] via-[#EDE9FE] to-[#DDD6FE]",
  },
  peach: {
    label: "피치",
    classes: "bg-gradient-to-br from-[#FFF7ED] via-[#FFE4D5] to-[#FBD1B7]",
    dot: "bg-gradient-to-br from-[#FFF7ED] via-[#FFE4D5] to-[#FBD1B7]",
  },
};

function normalizeZ(list: PlacedSticker[]) {
  const sorted = [...list].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  return sorted.map((s, i) => ({ ...s, z: i + 1 }));
}

export default function StickerBoardPage() {
  const { couple, isCoupled } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const {
    board,
    placed,
    setPlaced,
    inventory,
    setInventory,
    loading,
    saveDebounced,
  } = useStickerBoard(coupleId);

  const [edit, setEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => placed.find((s) => s.id === selectedId) ?? null,
    [placed, selectedId]
  );

  // 배경 테마
  const [theme, setTheme] = useState<ThemeKey>("beige");

  // 인벤토리 드래그 상태
  const [draggingTitle, setDraggingTitle] = useState<string | null>(null);
  const [dragSeed, setDragSeed] = useState<{
    clientX: number;
    clientY: number;
  } | null>(null);
  const draggingItem = useMemo(
    () => inventory.find((i) => i.title === draggingTitle) ?? null,
    [inventory, draggingTitle]
  );

  // Stage DOM 엘리먼트 (드롭 판정용)
  const stageElRef = useRef<HTMLDivElement | null>(null);

  // 전역 HTML 고스트(보드 밖에서만 표시)
  const [overlayPos, setOverlayPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [overlayInside, setOverlayInside] = useState(false);

  useEffect(() => {
    if (!draggingTitle) {
      setOverlayPos(null);
      setOverlayInside(false);
      return;
    }
    const onMove = (e: PointerEvent) => {
      setOverlayPos({ x: e.clientX, y: e.clientY });
      if (stageElRef.current) {
        const r = stageElRef.current.getBoundingClientRect();
        const inside =
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom;
        setOverlayInside(!!inside);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!stageElRef.current) return cancelDrag();
      const r = stageElRef.current.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      if (!inside) {
        cancelDrag();
      } else {
        handleDropFromInventory({
          x: Math.max(0, Math.min(r.width, x)),
          y: Math.max(0, Math.min(r.height, y)),
        });
      }
      setOverlayPos(null);
      setOverlayInside(false);
    };

    if (dragSeed) setOverlayPos({ x: dragSeed.clientX, y: dragSeed.clientY });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: false });
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingTitle, dragSeed]);

  const cancelDrag = useCallback(() => {
    setDraggingTitle(null);
    setDragSeed(null);
    setOverlayPos(null);
    setOverlayInside(false);
    document.body.style.cursor = "";
  }, []);

  const handlePatch = useCallback(
    (id: string, patch: Partial<PlacedSticker>) => {
      setPlaced((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, ...patch, version: (s.version ?? 0) + 1 } : s
        )
      );
      saveDebounced(() => {
        updateSticker(id, {
          ...patch,
          updated_at: new Date().toISOString() as any,
        });
      });
    },
    [saveDebounced, setPlaced]
  );

  // 드롭 저장 (Stage 좌표계 중앙 기준 → 좌상단 좌표로 변환)
  const handleDropFromInventory = useCallback(
    async (ptCenter: { x: number; y: number }) => {
      if (!draggingTitle || !coupleId) return;
      const invRow = inventory.find((r) => r.title === draggingTitle);
      if (!invRow) return;

      const left = Math.round(ptCenter.x - invRow.base_w / 2);
      const top = Math.round(ptCenter.y - invRow.base_h / 2);

      // 낙관적: 인벤토리 감소 + 임시 스티커 추가
      setInventory((prev) =>
        prev.map((row) =>
          row.title === draggingTitle
            ? { ...row, qty: Math.max(0, row.qty - 1) }
            : row
        )
      );
      const tempId = `TEMP_${Date.now()}`;
      const maxZ = placed.reduce((m, s) => Math.max(m, s.z ?? 0), 0);
      setPlaced((prev) =>
        normalizeZ([
          ...prev,
          {
            id: tempId,
            couple_id: coupleId,
            title: invRow.title,
            type: invRow.type,
            url: invRow.url ?? null,
            emoji: invRow.emoji ?? null,
            base_w: invRow.base_w,
            base_h: invRow.base_h,
            x: left,
            y: top,
            scale: 1,
            rotation: 0,
            z: maxZ + 1,
            flip_x: false,
          },
        ])
      );

      try {
        await placeFromInventory(coupleId, draggingTitle, left, top);
        // 리얼타임 지연 대비 보정 재조회
        setTimeout(async () => {
          const [p, inv] = await Promise.all([
            getPlaced(coupleId),
            getInventory(coupleId),
          ]);
          setPlaced(p);
          setInventory(inv);
        }, 50);
      } catch {
        // 롤백
        setPlaced((prev) => prev.filter((s) => s.id !== tempId));
        setInventory((prev) =>
          prev.map((row) =>
            row.title === draggingTitle ? { ...row, qty: row.qty + 1 } : row
          )
        );
      } finally {
        cancelDrag();
      }
    },
    [
      draggingTitle,
      coupleId,
      inventory,
      placed,
      setPlaced,
      setInventory,
      cancelDrag,
    ]
  );

  const handleDelete = useCallback(async () => {
    if (!selected || !coupleId) return;
    const delId = selected.id;
    const title = selected.title;

    setPlaced((prev) => prev.filter((s) => s.id !== delId));
    setInventory((prev) =>
      prev.map((row) =>
        row.title === title ? { ...row, qty: row.qty + 1 } : row
      )
    );

    try {
      await removeSticker(coupleId, delId);
      setTimeout(async () => {
        const inv = await getInventory(coupleId);
        setInventory(inv);
      }, 30);
    } catch {
      setInventory((prev) =>
        prev.map((row) =>
          row.title === title ? { ...row, qty: Math.max(0, row.qty - 1) } : row
        )
      );
    }
  }, [selected, coupleId, setPlaced, setInventory]);

  const bringFront = useCallback(async () => {
    if (!selected || !coupleId) return;
    const maxZ = placed.reduce((m, s) => Math.max(m, s.z ?? 0), 0);
    setPlaced((prev) =>
      normalizeZ(
        prev.map((s) =>
          s.id === selected.id ? { ...s, z: (maxZ || 0) + 1 } : s
        )
      )
    );
    try {
      await moveToFront(coupleId, selected.id);
    } catch {}
  }, [selected, coupleId, placed, setPlaced]);

  const sendBack = useCallback(async () => {
    if (!selected || !coupleId) return;
    const minZ = placed.reduce((m, s) => Math.min(m, s.z ?? 0), Infinity);
    setPlaced((prev) =>
      normalizeZ(
        prev.map((s) =>
          s.id === selected.id ? { ...s, z: (minZ || 1) - 1 } : s
        )
      )
    );
    try {
      await moveToBack(coupleId, selected.id);
    } catch {}
  }, [selected, coupleId, placed, setPlaced]);

  const rotateStep = useCallback(
    (delta: number) => {
      if (!selected) return;
      const r = ((((selected.rotation ?? 0) + delta) % 360) + 360) % 360;
      setPlaced((prev) =>
        prev.map((s) => (s.id === selected.id ? { ...s, rotation: r } : s))
      );
      saveDebounced(() =>
        updateSticker(selected.id, {
          rotation: r,
          updated_at: new Date().toISOString() as any,
        })
      );
    },
    [selected, saveDebounced, setPlaced]
  );

  const scaleStep = useCallback(
    (delta: number) => {
      if (!selected) return;
      const now = clamp((selected.scale ?? 1) + delta, 0.1, 2.0);
      const scale = Math.round(now * 10) / 10;
      setPlaced((prev) =>
        prev.map((s) => (s.id === selected.id ? { ...s, scale } : s))
      );
      saveDebounced(() =>
        updateSticker(selected.id, {
          scale,
          updated_at: new Date().toISOString() as any,
        })
      );
    },
    [selected, saveDebounced, setPlaced]
  );

  const toggleFlipX = useCallback(() => {
    if (!selected) return;
    const next = !(selected.flip_x ?? false);
    setPlaced((prev) =>
      prev.map((s) => (s.id === selected.id ? { ...s, flip_x: next } : s))
    );
    saveDebounced(() => updateSticker(selected.id, { flip_x: next } as any));
  }, [selected, saveDebounced, setPlaced]);

  if (!isCoupled || !coupleId) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-2">스티커 보드</h2>
        <p className="text-sm text-gray-600">
          커플 기능입니다. 커플을 먼저 연결해주세요.
        </p>
      </div>
    );
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="flex h-[calc(100dvh-64px)] relative">
      <div className="flex-1 relative">
        {/* 상단 바 (왼쪽) */}
        <div className="absolute left-3 top-3 z-10 flex items-center gap-3">
          <EmojiShopButton />
        </div>

        {/* 상단 바 (오른쪽: 상점 + 테마 선택) */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-3">
          {/* 테마 스와치 */}
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur rounded-full p-1 border">
            {(["beige", "mint", "sky", "lavender", "peach"] as ThemeKey[]).map(
              (key) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`w-6 h-6 rounded-full border ${
                    theme === key ? "ring-2 ring-black ring-offset-1" : ""
                  }`}
                  aria-label={BG_THEMES[key].label}
                  title={BG_THEMES[key].label}
                >
                  <span
                    className={`block w-full h-full rounded-full ${BG_THEMES[key].dot}`}
                  />
                </button>
              )
            )}
          </div>

          <button
            className="px-3 py-1 rounded bg-black text-white"
            onClick={() => {
              setEdit((v) => !v);
              setSelectedId(null);
              cancelDrag();
            }}
          >
            {edit ? "편집 종료" : "편집하기"}
          </button>

          {edit && (
            <StickerToolbar
              selected={selected ?? null}
              onFront={bringFront}
              onBack={sendBack}
              onDelete={handleDelete}
              onRotateStep={rotateStep}
              onScaleStep={scaleStep}
              onFlipX={toggleFlipX}
            />
          )}
        </div>

        {/* 캔버스 래퍼: 그라데이션은 여기! (스티커를 덮지 않음) */}
        <div
          className={`grid place-items-center w-full h-full ${BG_THEMES[theme].classes}`}
        >
          <StickerCanvas
            board={board}
            placed={placed}
            editable={edit}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            onPatch={handlePatch}
            draggingTitle={draggingTitle}
            draggingItem={draggingItem}
            dragSeed={dragSeed}
            bindStageContainer={(el) => (stageElRef.current = el)}
          />
        </div>
      </div>

      {/* 인벤토리 도크 */}
      {edit && (
        <InventoryDock
          items={inventory}
          onStartDrag={(title, seed) => {
            setDraggingTitle(title);
            if (seed) setDragSeed(seed);
            document.body.style.cursor = "grabbing";
          }}
        />
      )}

      {/* 전역 HTML 고스트: 보드 밖에서만 표시 */}
      {edit && draggingItem && overlayPos && !overlayInside && (
        <div
          className="pointer-events-none fixed z-[9999]"
          style={{
            left: 0,
            top: 0,
            transform: `translate(${
              overlayPos.x -
              (draggingItem.base_w * DRAG_EMOJI_PREVIEW_SCALE) / 2
            }px, ${
              overlayPos.y -
              (draggingItem.base_h * DRAG_EMOJI_PREVIEW_SCALE) / 2
            }px)`,
          }}
        >
          {draggingItem.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draggingItem.url ?? ""}
              alt="ghost"
              width={draggingItem.base_w}
              height={draggingItem.base_h}
              style={{ opacity: 0.8 }}
            />
          ) : (
            <div
              style={{
                width: draggingItem.base_w * DRAG_EMOJI_PREVIEW_SCALE,
                height: draggingItem.base_h * DRAG_EMOJI_PREVIEW_SCALE,
                display: "grid",
                placeItems: "center",
                fontSize: Math.floor(
                  draggingItem.base_h * DRAG_EMOJI_PREVIEW_SCALE * 0.8
                ),
                opacity: 0.9,
              }}
            >
              {draggingItem.emoji}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
