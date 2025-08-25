// src/components/NotificationPanel.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Trash2, Check, X, User, Clock } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { getUserNotifications } from "@/utils/notification/getUserNotifications";
import { deleteUserNotification } from "@/utils/notification/deleteUserNotification";
import { useToast } from "@/contexts/ToastContext";
import supabase from "@/lib/supabase";
import type { NotificationType } from "@/types/notificationType";

// ✅ shadcn/ui
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";

interface Notification {
  id: string;
  type: NotificationType;
  created_at: string; // ISO
  description: string;
  sender_id: string;
  receiver_id: string;
  is_request: boolean;
}

const TABLE = "user_notification";
const PAGE_SIZE = 3;

export default function NotificationPanel() {
  const { user } = useUser();
  const { acceptRequest, rejectRequest } = useCoupleContext();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [nicknameMap, setNicknameMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { open } = useToast();

  // ✅ 페이지네이션
  const [page, setPage] = useState(1);
  const clampPage = useCallback((len: number) => {
    const total = Math.max(1, Math.ceil(len / PAGE_SIZE));
    setPage((p) => Math.min(Math.max(1, p), total));
  }, []);

  // 커플요청 등 액션 전용 알림은 선택/삭제 불가
  const isSelectable = (n: Notification) =>
    !(n.is_request && n.type === "커플요청");

  // 시간 포맷터
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

  // 닉네임 다중 조회
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

  // 최초 1회 로드
  const fetchInitial = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await getUserNotifications(user.id);
      const list = (data ?? []) as Notification[];

      // 최신순
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

      // 선택 유지(존재 & 선택가능만)
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

  // Realtime
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

  // 선택 토글
  const toggleSelect = (n: Notification) => {
    if (!isSelectable(n)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(n.id)) next.delete(n.id);
      else next.add(n.id);
      return next;
    });
  };

  // 정렬/페이지 단위
  const sortedNotifications = useMemo(() => {
    const arr = [...notifications];
    arr.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return arr;
  }, [notifications]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedNotifications.length / PAGE_SIZE)
  );
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = sortedNotifications.slice(start, start + PAGE_SIZE);

  // 현재 페이지 선택 상태
  const selectableCountOnPage = pageItems.filter(isSelectable).length;
  const selectedOnPageCount = pageItems.filter(
    (n) => isSelectable(n) && selectedIds.has(n.id)
  ).length;

  // 전체 선택(현재 페이지의 일반 알림만)
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

  // 선택 삭제
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
      setTimeout(() => clampPage(sortedNotifications.length - ids.length), 0);
    } finally {
      setBusy(false);
    }
  };

  // 요청 수락/거절
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
      clampPage(sortedNotifications.length - 1);
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
      clampPage(sortedNotifications.length - 1);
    } finally {
      setBusy(false);
    }
  };

  // 헤더 체크박스(삼상)
  const all =
    selectableCountOnPage > 0 && selectedOnPageCount === selectableCountOnPage;
  const some = selectedOnPageCount > 0 && !all;
  const headerChecked: boolean | "indeterminate" = some ? "indeterminate" : all;

  return (
    <Card
      className="
        mx-auto
        w-[min(92vw,720px)] h-[70vh]
        bg-amber-50 border-amber-200 shadow-xl
        flex flex-col overflow-hidden
      "
    >
      {/* Header */}
      <CardHeader className="bg-amber-50 sticky top-0 z-20 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-[17px] font-bold text-[#5b3d1d]">
            알림
          </CardTitle>
          <label className="flex items-center gap-2 text-sm text-[#6b533b]">
            <Checkbox
              checked={headerChecked}
              onCheckedChange={toggleSelectAll}
            />
            전체 선택(일반)
          </label>
        </div>
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-100/60 px-3 py-2 text-amber-800 text-xs md:text-sm">
          알림은 생성 시점으로부터{" "}
          <span className="font-semibold">24시간 후 자동으로 삭제</span>돼요.
        </div>
      </CardHeader>

      <Separator />

      {/* Body */}
      <CardContent className="p-0 flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full grid place-items-center text-gray-500">
            불러오는 중…
          </div>
        ) : sortedNotifications.length === 0 ? (
          <div className="h-full grid place-items-center text-gray-500">
            새 알림이 없어요
          </div>
        ) : (
          <>
            <ScrollArea className="h-full">
              <ul className="p-3 space-y-2">
                {pageItems.map((n) => {
                  const selectable = isSelectable(n);
                  const checked = selectedIds.has(n.id);
                  const nickname = nicknameMap[n.sender_id] ?? "알 수 없음";
                  const isRequest = !selectable;

                  return (
                    <li
                      key={n.id}
                      className={[
                        "rounded-xl border p-3",
                        isRequest
                          ? "border-pink-200 bg-pink-50/60"
                          : "border-gray-200 bg-white",
                        "hover:border-amber-300 transition-colors",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        {/* 체크박스(요청은 숨김) */}
                        {selectable ? (
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleSelect(n)}
                            className="mt-1"
                          />
                        ) : (
                          <div className="w-4 h-4 mt-1" />
                        )}

                        {/* 본문 */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            {/* 보낸 사람 / 시간 */}
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-amber-100 text-[#5b3d1d] flex items-center justify-center">
                                <User className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-[#3d2b1f] truncate">
                                  {nickname}
                                </div>
                                <div className="text-[11px] text-[#6b533b] flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTimeAgo(n.created_at)}</span>
                                  <span className="mx-1">·</span>
                                  <span>{formatAbsolute(n.created_at)}</span>
                                </div>
                              </div>
                            </div>

                            {/* 타입 배지 */}
                            <Badge
                              variant="outline"
                              className={[
                                "shrink-0 text-[11px]",
                                isRequest
                                  ? "bg-pink-100 text-pink-700 border-pink-300"
                                  : "bg-amber-100 text-amber-700 border-amber-300",
                              ].join(" ")}
                            >
                              {n.type}
                            </Badge>
                          </div>

                          {/* 내용 */}
                          <p className="mt-2 text-sm text-gray-800 whitespace-pre-line break-words">
                            {n.description}
                          </p>

                          {/* 커플 요청 액션 */}
                          {isRequest && (
                            <div className="mt-3 flex items-center gap-2">
                              <Button
                                onClick={() => handleAccept(n)}
                                disabled={busy}
                                className="gap-1.5 bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-4 h-4" />
                                수락
                              </Button>
                              <Button
                                onClick={() => handleReject(n)}
                                variant="destructive"
                                disabled={busy}
                                className="gap-1.5"
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

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="px-3 pb-3 flex items-center justify-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pNum) => (
                    <Button
                      key={pNum}
                      size="sm"
                      variant={pNum === page ? "default" : "outline"}
                      onClick={() => setPage(pNum)}
                      className={
                        pNum === page
                          ? "bg-amber-200 text-[#5b3d1d] hover:bg-amber-200"
                          : "hover:bg-amber-50"
                      }
                    >
                      {pNum}
                    </Button>
                  )
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Footer */}
      <Separator />
      <CardFooter className="bg-white sticky bottom-0 z-20 justify-between">
        <div className="text-sm text-[#6b533b]">
          선택됨(일반):{" "}
          <span className="font-semibold">{selectedOnPageCount}</span> /{" "}
          {selectableCountOnPage}
        </div>
        <Button
          onClick={deleteSelected}
          disabled={busy || selectedOnPageCount === 0}
          variant={selectedOnPageCount === 0 ? "outline" : "default"}
          className={[
            "gap-2",
            "mt-2",
            selectedOnPageCount === 0
              ? "text-gray-400"
              : "bg-amber-100 text-[#5b3d1d] hover:bg-amber-200",
          ].join(" ")}
          title={
            selectedOnPageCount === 0
              ? "선택된 일반 알림이 없습니다"
              : "선택 삭제"
          }
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
