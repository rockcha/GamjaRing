export type Rarity = "common" | "rare" | "epic" | "legendary";
export type StickerType = "image" | "emoji";

export type BoardMeta = {
  couple_id: string;
  name?: string | null;
  width: number;
  height: number;
  bg_url?: string | null;
};

export type InventoryRow = {
  couple_id: string;
  title: string; // PK (couple_id, title)
  type: StickerType;
  url?: string | null; // image
  emoji?: string | null; // emoji
  rarity?: Rarity | null;
  base_w: number;
  base_h: number;
  qty: number;
};

export type PlacedSticker = {
  id: string;
  couple_id: string;
  title: string;
  type: StickerType;
  url?: string | null;
  emoji?: string | null;
  base_w: number;
  base_h: number;
  x: number;
  y: number; // 저장은 좌상단 기준
  scale: number | null; // null → UI에서 1.0 보정
  rotation: number | null; // null → UI에서 0 보정
  z: number | null;
  // is_locked: 제거됨 (항상 편집 가능)
  flip_x?: boolean | null;
  created_by?: string | null;
  updated_at?: string | null;
  version?: number | null;
};
