import supabase from "@/lib/supabase";
import type { Fragment, MemoryCard, Summary } from "./types";

/* ---------- Fragments ---------- */

export async function listFragments(coupleId: string, limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from("memory_fragments")
    .select("*")
    .eq("couple_id", coupleId)
    .order("event_date", { ascending: true }) // ✅ 오래된 날짜가 앞쪽
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as Fragment[];
}

export async function createFragment(input: {
  couple_id: string;
  author_id?: string | null;
  title: string;
  event_date: string; // yyyy-mm-dd
}) {
  const { data, error } = await supabase
    .from("memory_fragments")
    .insert({
      couple_id: input.couple_id,
      author_id: input.author_id ?? null,
      title: input.title,
      event_date: input.event_date,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Fragment;
}

export async function updateFragment(
  fragmentId: string,
  patch: Partial<Fragment>
) {
  const { data, error } = await supabase
    .from("memory_fragments")
    .update(patch)
    .eq("id", fragmentId)
    .select()
    .single();
  if (error) throw error;
  return data as Fragment;
}

export async function getFragment(fragmentId: string) {
  const { data, error } = await supabase
    .from("memory_fragments")
    .select("*")
    .eq("id", fragmentId)
    .single();
  if (error) throw error;
  return data as Fragment;
}

/** 하트 +1 (원자적, SQL RPC: inc_fragment_hearts 사용) */
export async function heartPlus(fragmentId: string) {
  const { data, error } = await supabase.rpc("inc_fragment_hearts", {
    frag_id: fragmentId,
  });
  if (error) throw error;
  return data as number; // 최신 hearts 값
}

/* ---------- Cards ---------- */

export async function listCards(fragmentId: string, limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from("memory_cards")
    .select("*")
    .eq("fragment_id", fragmentId)
    .order("order_index", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as MemoryCard[];
}

export async function addCard(input: {
  fragment_id: string;
  couple_id: string;
  author_id?: string | null;
  image_path: string;
  layout: "photo-left" | "photo-right";
  caption_author?: string | null;
  caption_partner?: string | null;
  order_index: number;
}) {
  const { data, error } = await supabase
    .from("memory_cards")
    .insert({
      fragment_id: input.fragment_id,
      couple_id: input.couple_id,
      author_id: input.author_id ?? null,
      image_path: input.image_path,
      layout: input.layout,
      caption_author: input.caption_author ?? null,
      caption_partner: input.caption_partner ?? null,
      order_index: input.order_index,
    })
    .select()
    .single();

  if (error) throw error;
  return data as MemoryCard;
}

export async function updateCard(cardId: string, patch: Partial<MemoryCard>) {
  const { data, error } = await supabase
    .from("memory_cards")
    .update(patch)
    .eq("id", cardId)
    .select()
    .single();
  if (error) throw error;
  return data as MemoryCard;
}

/* ---------- Summary ---------- */

export async function getSummary(fragmentId: string) {
  const { data, error } = await supabase
    .from("memory_summaries")
    .select("*")
    .eq("fragment_id", fragmentId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Summary | null;
}

export async function upsertSummary(input: {
  fragment_id: string;
  content: string;
}) {
  // unique(fragment_id) 전제로 upsert
  const { data, error } = await supabase
    .from("memory_summaries")
    .upsert(
      { fragment_id: input.fragment_id, content: input.content },
      { onConflict: "fragment_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as Summary;
}

export async function deleteFragment(fragmentId: string) {
  const { error } = await supabase
    .from("memory_fragments")
    .delete()
    .eq("id", fragmentId);
  if (error) throw error;
}

export async function deleteCard(cardId: string) {
  const { error } = await supabase
    .from("memory_cards")
    .delete()
    .eq("id", cardId);
  if (error) throw error;
}
