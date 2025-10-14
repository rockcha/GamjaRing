// src/features/bucketlist/hooks/useBucketList.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BucketFilters, BucketItem, BucketCategory } from "./types";
import { CATEGORY_ORDER } from "./types";
import {
  createBucketItem,
  deleteBucketItem,
  fetchBucketItems,
  updateBucketItem,
} from "./api";

type Opts = { coupleId: string; myUserId: string };

export function useBucketList({ coupleId }: Opts) {
  const [items, setItems] = useState<BucketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BucketFilters>({
    category: "전체",
    status: "미완료",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchBucketItems(coupleId);
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, [coupleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const list = useMemo(() => {
    return items
      .filter((it) => {
        if (filters.status === "미완료" && it.completed) return false;
        if (filters.status === "완료" && !it.completed) return false;
        if (filters.category !== "전체" && it.category !== filters.category)
          return false;
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const ai = a.category ? CATEGORY_ORDER.indexOf(a.category) : 999;
        const bi = b.category ? CATEGORY_ORDER.indexOf(b.category) : 999;
        if (ai !== bi) return ai - bi;
        if (a.due_date && b.due_date && a.due_date !== b.due_date) {
          return a.due_date < b.due_date ? -1 : 1;
        }
        return a.created_at > b.created_at ? -1 : 1;
      });
  }, [items, filters]);

  const add = useCallback(
    async (payload: {
      couple_id: string;
      author_id: string;
      title: string;
      content?: string | null;
      link_url?: string | null;
      category?: BucketCategory | null;
      due_date?: string | null;
    }) => {
      const created = await createBucketItem(payload);
      setItems((prev) => [created, ...prev]);
    },
    []
  );

  const patch = useCallback(async (id: number, patch: Partial<BucketItem>) => {
    const updated = await updateBucketItem(id, patch);
    setItems((prev) => prev.map((x) => (x.id === id ? updated : x)));
  }, []);

  const remove = useCallback(async (id: number) => {
    await deleteBucketItem(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return {
    items: list,
    raw: items,
    loading,
    filters,
    setFilters,
    reload: load,
    add,
    patch,
    remove,
  };
}

export const CATEGORY_OPTIONS: BucketCategory[] = [
  "일상",
  "목표",
  "도전",
  "음식",
  "여행",
];
