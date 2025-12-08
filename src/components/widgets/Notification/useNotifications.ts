// src/components/notification/hooks/useNotifications.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import type { NotificationRow } from "./types";

const TABLE = "user_notification";

export function useNotifications(uid: string | null) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<NotificationRow[]>([]);

  console.log("[notif] hook render, uid =", uid);

  // 1) 처음 목록 가져오기
  const fetchInitial = useCallback(async () => {
    if (!uid) {
      console.log("[notif] fetchInitial skip (no uid)");
      return;
    }

    console.log("[notif] fetchInitial start, uid =", uid);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select(
          "id,type,created_at,description,sender_id,receiver_id,is_request,is_read"
        )
        .eq("receiver_id", uid)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[notif] fetchInitial error:", error);
      } else {
        console.log(
          "[notif] fetchInitial success, rows =",
          data ? data.length : 0
        );
        setList(data as NotificationRow[]);
      }
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    console.log("[notif] useEffect(fetchInitial) run");
    fetchInitial();
  }, [fetchInitial]);

  // 2) 실시간 구독
  useEffect(() => {
    console.log("[notif] realtime effect RUN, uid =", uid);

    if (!uid) {
      console.log("[notif] realtime effect SKIP (no uid)");
      return;
    }

    console.log("[notif] realtime SUBSCRIBE start, uid =", uid);

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
          console.log("[notif] realtime PAYLOAD:", payload);

          const { eventType } = payload as any;

          if (eventType === "INSERT") {
            const n = payload.new as NotificationRow;
            console.log("[notif] INSERT id =", n.id);
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
            console.log("[notif] UPDATE id =", n.id);
            setList((prev) => prev.map((x) => (x.id === n.id ? n : x)));
          }

          if (eventType === "DELETE") {
            const oldRow = payload.old as NotificationRow;
            console.log("[notif] DELETE id =", oldRow.id);
            setList((prev) => prev.filter((x) => x.id !== oldRow.id));
          }
        }
      )
      .subscribe((status) => {
        console.log("[notif] channel STATUS:", status);
      });

    return () => {
      console.log("[notif] realtime UNSUBSCRIBE, uid =", uid);
      supabase.removeChannel(channel);
    };
  }, [uid]);

  // 3) 안 읽은 개수
  const unreadCount = useMemo(
    () => list.filter((n) => !n.is_read).length,
    [list]
  );

  // 4) 모두 읽음 처리
  const markAllRead = useCallback(async () => {
    if (!uid) {
      console.log("[notif] markAllRead SKIP (no uid)");
      return;
    }

    const unreadIds = list.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) {
      console.log("[notif] markAllRead: no unread");
      return;
    }

    console.log("[notif] markAllRead sending, ids:", unreadIds);

    const { error } = await supabase
      .from(TABLE)
      .update({ is_read: true })
      .in("id", unreadIds)
      .eq("receiver_id", uid);

    if (error) {
      console.error("[notif] markAllRead ERROR:", error);
      return;
    }

    console.log("[notif] markAllRead SUCCESS");
    setList((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [uid, list]);

  return {
    loading,
    notifications: list,
    unreadCount,
    markAllRead,
    refetch: fetchInitial,
  };
}
