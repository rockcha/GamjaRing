// src/features/fishing/ingredient-section/types.ts
export type Rarity = "일반" | "희귀" | "에픽" | "전설";

export type TankRow = { tank_no: number; title: string | null };

export type BulkCatch = {
  id: string;
  label: string;
  rarity: Rarity;
  image: string;
  count: number;
  isNew?: boolean;
};

export type Placements = Record<string, number>; // key: fishId, value: tank_no

export const DND_MIME = "application/x-ingredient" as const;
