// src/pages/NotificationPage.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useToast } from "@/contexts/ToastContext";
import { getUserNotifications } from "@/utils/notification/getUserNotifications";
import { deleteUserNotification } from "@/utils/notification/deleteUserNotification";
import type { NotificationType } from "@/types/notificationType";

// shadcn/ui
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// icons
import { Trash2, Check, X, User, Clock, Loader2 } from "lucide-react";

type Notification = {
  id: string;
  type: NotificationType;
  created_at: string;
  description: string;
  sender_id: string;
  receiver_id: string;
  is_request: boolean;
};

const TABLE = "user_notification";

export default function NotificationPage() {
  const { user } = useUser();
  const { acceptRequest, rejectRequest } = useCoupleContext();
  const { open } = useToast();

  // data
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nicknameMap, setNicknameMap] = useState<Record<string, string>>({});

  // helpers
  const rtf = useMemo(
    () => new Intl.RelativeTimeFormat("ko", { numeric: "auto" }),
    []
  );
  const formatTimeAgo = (iso: string) => {
    const now = Date.now();
    const t = new Date(iso).getTime();
    const diffSec = Math.round((t - now) / 1000);
    if (Math.abs(diffSec) < 60)
      return rtf.format(Math.round(diffSec), "second");
    const diffMin = Math.round(diffSec / 60);
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
    const diffHr = Math.round(diffMin / 60);
    if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
    const diffDay = Math.round(diffHr / 24);
    return rtf.format(diffDay, "day");
  };
  const formatAbsolute = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(
      2,
      "0"
    )}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const fetchNicknamesByIds = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return {};
    const { data, error } = await supabase
      .from("users")
      .select("id, nickname")
      .in("id", ids);
    if (error || !data) return {};
    const map: Record<string, string> = {};
    for (const row of data) map[row.id] = row.nickname ?? "알 수 없음";
    return map;
  }, []);

  // initial load
  const fetchInitial = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await getUserNotifications(user.id);
      const list = (data ?? []) as Notification[];
      list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setNotifications(list);

      const missing = Array.from(
        new Set(list.map((n) => n.sender_id).filter((id) => !!id))
      ) as string[];
      if (missing.length) {
        const map = await fetchNicknamesByIds(missing);
        setNicknameMap((prev) => ({ ...prev, ...map }));
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchNicknamesByIds]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // realtime
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLE,
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const { eventType } = payload as any;

          if (eventType === "INSERT") {
            const n = payload.new as Notification;
            setNotifications((prev) => {
              const next = [n, ...prev];
              next.sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              );
              return next;
            });
            if (n.sender_id && !nicknameMap[n.sender_id]) {
              const map = await fetchNicknamesByIds([n.sender_id]);
              setNicknameMap((prev) => ({ ...prev, ...map }));
            }
          }
          if (eventType === "UPDATE") {
            const n = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((x) => (x.id === n.id ? n : x))
            );
          }
          if (eventType === "DELETE") {
            const oldRow = payload.old as Notification;
            setNotifications((prev) => prev.filter((x) => x.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, nicknameMap, fetchNicknamesByIds]);

  const sorted = useMemo(() => {
    const arr = [...notifications];
    arr.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return arr;
  }, [notifications]);

  // actions
  const handleAccept = async (n: Notification) => {
    setBusy(true);
    try {
      const { error } = await acceptRequest(n.id);
      if (error) console.log(error);
      await deleteUserNotification(n.id);
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (n: Notification) => {
    setBusy(true);
    try {
      await rejectRequest(n.id);
      await deleteUserNotification(n.id);
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-1/2 max-w-screen-lg px-4 md:px-6">
      <Card className="bg-white border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-center">
              알림은 생성 시점으로부터 24시간 후 자동으로 삭제됩니다.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="h-[60vh] grid place-items-center text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                불러오는 중…
              </div>
            </div>
          ) : sorted.length === 0 ? (
            <div className="h-[60vh] grid place-items-center text-muted-foreground">
              새 알림이 없어요
            </div>
          ) : (
            // ⬇️ 고정 높이 70vh, 내용 많으면 스크롤
            <ScrollArea className="h-[60vh] pr-2">
              <ul className="p-3 space-y-1 ">
                {sorted.map((n) => {
                  const nickname = nicknameMap[n.sender_id] ?? "알 수 없음";
                  const isRequest = n.is_request && n.type === "커플요청";

                  return (
                    <li
                      key={n.id}
                      className="rounded-xl border bg-sky-50 p-3 transition min-h-[10.5vh] flex "
                    >
                      <div className="flex pl-4 items-start gap-2 w-full">
                        {/* 본문 */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-white border grid place-items-center">
                                <User className="w-4 h-4 text-foreground " />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">
                                  {nickname}
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTimeAgo(n.created_at)}</span>
                                  <span className="mx-1">·</span>
                                  <span>{formatAbsolute(n.created_at)}</span>
                                </div>
                              </div>
                            </div>

                            <Badge
                              variant="default"
                              className="shrink-0 text-[11px] bg-amber-600 hover:bg-amber-600"
                            >
                              {n.type}
                            </Badge>
                          </div>

                          <p className="mt-2 text-sm text-foreground whitespace-pre-line break-words">
                            {n.description}
                          </p>

                          {/* 커플요청 액션 */}
                          {isRequest && (
                            <div className="mt-3 flex items-center gap-2">
                              <Button
                                onClick={() => handleAccept(n)}
                                disabled={busy}
                                className="gap-1.5 hover:cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                                수락
                              </Button>
                              <Button
                                onClick={() => handleReject(n)}
                                variant="destructive"
                                disabled={busy}
                                className="gap-1.5 hover:cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                                거절
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
