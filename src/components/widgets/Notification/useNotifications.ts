// src/components/notification/hooks/useNotifications.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import type { NotificationRow } from "./types";

const TABLE = "user_notification";

export function useNotifications(uid: string | null) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<NotificationRow[]>([]);

  const fetchInitial = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select(
          "id,type,created_at,description,sender_id,receiver_id,is_request,is_read"
        )
        .eq("receiver_id", uid)
        .order("created_at", { ascending: false });
      if (!error && data) {
        setList(data as NotificationRow[]);
      }
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // realtime
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`notif:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLE,
          filter: `receiver_id=eq.${uid}`,
        },
        (payload) => {
          const { eventType } = payload as any;

          if (eventType === "INSERT") {
            const n = payload.new as NotificationRow;
            setList((prev) => {
              const next = [n, ...prev];
              next.sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              );
              return next;
            });
          }
          if (eventType === "UPDATE") {
            const n = payload.new as NotificationRow;
            setList((prev) => prev.map((x) => (x.id === n.id ? n : x)));
          }
          if (eventType === "DELETE") {
            const oldRow = payload.old as NotificationRow;
            setList((prev) => prev.filter((x) => x.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid]);

  // 안 읽은 개수
  const unreadCount = useMemo(
    () => list.filter((n) => !n.is_read).length,
    [list]
  );

  // 드롭다운 열렸을 때 전체 읽음 처리
  const markAllRead = useCallback(async () => {
    if (!uid) return;
    const unreadIds = list.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from(TABLE)
      .update({ is_read: true })
      .in("id", unreadIds)
      .eq("receiver_id", uid);

    if (!error) {
      setList((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  }, [uid, list]);

  return {
    loading,
    notifications: list,
    unreadCount,
    markAllRead,
    refetch: fetchInitial,
  };
}
