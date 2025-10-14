// src/features/bucketlist/api.ts
import supabase from "@/lib/supabase";
import type { BucketItem } from "./types";

export async function fetchBucketItems(
  coupleId: string
): Promise<BucketItem[]> {
  const { data, error } = await supabase
    .from("couple_bucketlist")
    .select("*")
    .eq("couple_id", coupleId)
    .order("completed", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as BucketItem[]) ?? [];
}

// ✅ id/created_at/updated_at/completed/completed_at 은 절대 보내지 않음!
export async function createBucketItem(payload: {
  couple_id: string;
  author_id: string;
  title: string;
  content?: string | null;
  link_url?: string | null;
  category?: string | null;
  due_date?: string | null;
}) {
  const { data, error } = await supabase
    .from("couple_bucketlist")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as BucketItem;
}

export async function updateBucketItem(id: number, patch: Partial<BucketItem>) {
  const { data, error } = await supabase
    .from("couple_bucketlist")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as BucketItem;
}

export async function deleteBucketItem(id: number) {
  const { error } = await supabase
    .from("couple_bucketlist")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
