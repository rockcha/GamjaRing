// 공유 supabase 클라이언트를 사용 (createClient 쓰지 않음)
import supabase from "@/lib/supabase";
import type { BoardMeta, InventoryRow, PlacedSticker } from "./types";

// --- Board / Placed / Inventory --------------------------------------------------

export async function getBoard(coupleId?: string | null): Promise<BoardMeta> {
  if (!coupleId) {
    return {
      couple_id: "",
      name: "Sticker Board",
      width: 1280,
      height: 720,
      bg_url: null,
    };
  }
  const { data } = await supabase
    .from("sticker_boards")
    .select("*")
    .eq("couple_id", coupleId)
    .maybeSingle();

  return {
    couple_id: coupleId,
    name: data?.name ?? "Sticker Board",
    width: data?.width ?? 1280,
    height: data?.height ?? 720,
    bg_url: data?.bg_url ?? null,
  };
}

export async function getPlaced(
  coupleId?: string | null
): Promise<PlacedSticker[]> {
  if (!coupleId) return [];
  const { data } = await supabase
    .from("stickers")
    .select("*")
    .eq("couple_id", coupleId)
    .order("z", { ascending: true });
  return (data ?? []) as PlacedSticker[];
}

export async function getInventory(
  coupleId?: string | null
): Promise<InventoryRow[]> {
  if (!coupleId) return [];
  const { data } = await supabase
    .from("sticker_inventory")
    .select("*")
    .eq("couple_id", coupleId)
    .gt("qty", 0)
    .order("rarity", { ascending: true })
    .order("title", { ascending: true });
  return (data ?? []) as InventoryRow[];
}

// --- Color persist (stickerboard_color) -----------------------------------------

/** DB에서 보드 컬러 텍스트(beige|mint|... 또는 #hex) 읽기 */
export async function getBoardColor(coupleId: string): Promise<string> {
  const { data, error } = await supabase
    .from("stickerboard_color")
    .select("color")
    .eq("couple_id", coupleId)
    .maybeSingle();
  if (error) throw error;
  return data?.color ?? "beige";
}

/** 보드 컬러 업서트 */
export async function upsertBoardColor(coupleId: string, color: string) {
  const { error } = await supabase
    .from("stickerboard_color")
    .upsert({ couple_id: coupleId, color }, { onConflict: "couple_id" });
  if (error) throw error;
}

// --- Mutations / RPC -------------------------------------------------------------

export async function placeFromInventory(
  coupleId: string,
  title: string,
  x: number,
  y: number
): Promise<string> {
  const { data, error } = await supabase.rpc("place_sticker_instance", {
    p_couple: coupleId,
    p_title: title,
    p_x: x,
    p_y: y,
  });
  if (error) throw error;
  return data as string; // new sticker id
}

export async function removeSticker(coupleId: string, id: string) {
  const { error } = await supabase.rpc("remove_sticker_instance", {
    p_couple: coupleId,
    p_id: id,
  });
  if (error) throw error;
}

export async function updateSticker(id: string, patch: Partial<PlacedSticker>) {
  const { error } = await supabase.from("stickers").update(patch).eq("id", id);
  if (error) throw error;
}

export async function moveToFront(coupleId: string, id: string) {
  const { error } = await supabase.rpc("sticker_move_to_front", {
    p_couple: coupleId,
    p_id: id,
  });
  if (error) throw error;
}

export async function moveToBack(coupleId: string, id: string) {
  const { error } = await supabase.rpc("sticker_move_to_back", {
    p_couple: coupleId,
    p_id: id,
  });
  if (error) throw error;
}

export { supabase }; // 필요 시 외부에서 사용
