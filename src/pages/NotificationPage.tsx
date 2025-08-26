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
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
const PAGE_SIZE = 5;

export default function NotificationPage() {
  const { user } = useUser();
  const { acceptRequest, rejectRequest } = useCoupleContext();
  const { open } = useToast();

  // data
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nicknameMap, setNicknameMap] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // paging
  const [page, setPage] = useState(1);
  const clampPage = useCallback((len: number) => {
    const total = Math.max(1, Math.ceil(len / PAGE_SIZE));
    setPage((p) => Math.min(Math.max(1, p), total));
  }, []);

  // helpers
  const isSelectable = (n: Notification) =>
    !(n.is_request && n.type === "커플요청");

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
      setPage(1);

      const missing = Array.from(
        new Set(
          list.map((n) => n.sender_id).filter((id) => !!id && !nicknameMap[id])
        )
      ) as string[];
      if (missing.length) {
        const map = await fetchNicknamesByIds(missing);
        setNicknameMap((prev) => ({ ...prev, ...map }));
      }

      setSelectedIds((prev) => {
        const next = new Set<string>();
        for (const id of prev)
          if (list.some((n) => n.id === id && isSelectable(n))) next.add(id);
        return next;
      });

      clampPage(list.length);
    } finally {
      setLoading(false);
    }
  }, [user?.id, nicknameMap, fetchNicknamesByIds, clampPage]);

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
            setNotifications((prev) => [n, ...prev]);
            if (n.sender_id && !nicknameMap[n.sender_id]) {
              const map = await fetchNicknamesByIds([n.sender_id]);
              setNicknameMap((prev) => ({ ...prev, ...map }));
            }
            clampPage(notifications.length + 1);
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
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(oldRow.id);
              return next;
            });
            clampPage(notifications.length - 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    user?.id,
    nicknameMap,
    fetchNicknamesByIds,
    clampPage,
    notifications.length,
  ]);

  // selects
  const toggleSelect = (n: Notification) => {
    if (!isSelectable(n)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(n.id)) next.delete(n.id);
      else next.add(n.id);
      return next;
    });
  };

  const sorted = useMemo(() => {
    const arr = [...notifications];
    arr.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return arr;
  }, [notifications]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);

  const selectableCountOnPage = pageItems.filter(isSelectable).length;
  const selectedOnPageCount = pageItems.filter(
    (n) => isSelectable(n) && selectedIds.has(n.id)
  ).length;

  const toggleSelectAll = () => {
    const idsOnPage = pageItems.filter(isSelectable).map((n) => n.id);
    if (idsOnPage.length === 0) {
      setSelectedIds(
        (prev) => new Set([...prev].filter((id) => !idsOnPage.includes(id)))
      );
      return;
    }
    const allSelected = idsOnPage.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) idsOnPage.forEach((id) => next.delete(id));
      else idsOnPage.forEach((id) => next.add(id));
      return next;
    });
  };

  const deleteSelected = async () => {
    const ids = pageItems
      .filter(isSelectable)
      .map((n) => n.id)
      .filter((id) => selectedIds.has(id));
    if (ids.length === 0) return;
    setBusy(true);
    try {
      await Promise.all(ids.map((id) => deleteUserNotification(id)));
      setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      open("알람이 삭제되었습니다");
      setTimeout(() => clampPage(sorted.length - ids.length), 0);
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async (n: Notification) => {
    setBusy(true);
    try {
      const { error } = await acceptRequest(n.id);
      if (error) console.log(error);
      await deleteUserNotification(n.id);
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(n.id);
        return next;
      });
      clampPage(sorted.length - 1);
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
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(n.id);
        return next;
      });
      clampPage(sorted.length - 1);
    } finally {
      setBusy(false);
    }
  };

  const all =
    selectableCountOnPage > 0 && selectedOnPageCount === selectableCountOnPage;
  const some = selectedOnPageCount > 0 && !all;
  const headerChecked: boolean | "indeterminate" = some ? "indeterminate" : all;

  return (
    <main className="mx-auto w-1/2 max-w-screen-lg px-4 md:px-6 py-6">
      {/* 제목 + 보충설명 */}
      <header className="flex flex-col items-center justify-center mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-[#3d2b1f]">알람</h1>
        <p className="mt-1 text-sm md:text-base text-[#6b533b]">
          오늘 받은 알림을 확인하고 정리해 보세요.
        </p>
      </header>

      {/* 콘텐츠 카드 */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardDescription className="text-center">
              알림은 생성 시점으로부터 24시간 후 자동으로 삭제됩니다.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="min-h-[420px] grid place-items-center text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                불러오는 중…
              </div>
            </div>
          ) : sorted.length === 0 ? (
            <div className="min-h-[420px] grid place-items-center text-muted-foreground">
              새 알림이 없어요
            </div>
          ) : (
            <ScrollArea className="min-h-[500px] max-h-[65svh]">
              <ul className="p-3 space-y-2">
                {pageItems.map((n) => {
                  const selectable = isSelectable(n);
                  const checked = selectedIds.has(n.id);
                  const nickname = nicknameMap[n.sender_id] ?? "알 수 없음";
                  const isRequest = !selectable;

                  return (
                    <li
                      key={n.id}
                      className="rounded-xl border bg-white p-3 hover:bg-muted/30 transition"
                    >
                      <div className="flex pl-4 items-start gap-3">
                        {/* 본문 */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-muted grid place-items-center">
                                <User className="w-4 h-4 text-foreground" />
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
                              variant="outline"
                              className="shrink-0 text-[11px]"
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

      {/* ✅ 페이지네이션: 카드 바깥, 중앙 정렬 */}
      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={p === page ? "default" : "outline"}
              onClick={() => setPage(p)}
              className="hover:cursor-pointer"
            >
              {p}
            </Button>
          ))}
        </nav>
      )}
    </main>
  );
}
