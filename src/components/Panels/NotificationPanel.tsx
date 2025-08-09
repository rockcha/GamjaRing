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

interface Notification {
  id: string;
  type: NotificationType;
  created_at: string; // ISO
  description: string;
  sender_id: string;
  receiver_id: string;
  is_request: boolean;
}

const TABLE = "notifications"; // ← 실제 테이블명으로 맞춰줘

export default function NotificationPanel() {
  const { user } = useUser();
  const { acceptRequest, rejectRequest } = useCoupleContext();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [nicknameMap, setNicknameMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { open } = useToast();
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

  // 닉네임 다중 조회(없는 것만)
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
      setNotifications(list);

      const missing = Array.from(
        new Set(
          list.map((n) => n.sender_id).filter((id) => !!id && !nicknameMap[id])
        )
      ) as string[];
      if (missing.length) {
        const map = await fetchNicknamesByIds(missing);
        setNicknameMap((prev) => ({ ...prev, ...map }));
      }

      // 사라진 항목 정리(선택 유지)
      setSelectedIds((prev) => {
        const next = new Set<string>();
        for (const id of prev)
          if (list.some((n) => n.id === id && isSelectable(n))) next.add(id);
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, nicknameMap, fetchNicknamesByIds]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // Realtime 구독: 내(receiver_id)에게 온 알림만
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
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, nicknameMap, fetchNicknamesByIds]);

  // 선택 토글(일반 알림만)
  const toggleSelect = (n: Notification) => {
    if (!isSelectable(n)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(n.id)) next.delete(n.id);
      else next.add(n.id);
      return next;
    });
  };

  // 전체 선택(일반 알림만)
  const toggleSelectAll = () => {
    const selectable = notifications.filter(isSelectable).map((n) => n.id);
    if (selectable.length === 0) {
      setSelectedIds(new Set());
      return;
    }
    const allSelected = selectable.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(selectable));
  };

  // 선택 삭제(일반 알림만)
  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setBusy(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => deleteUserNotification(id)));
      setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
      open("알람이 삭제되었습니다");
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

      await deleteUserNotification(n.id); // 처리 후 제거
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(n.id);
        return next;
      });
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
    } finally {
      setBusy(false);
    }
  };

  const selectableCount = notifications.filter(isSelectable).length;

  return (
    <section className=" absolute left-1/2 -translate-x-1/2 w-3/5 h-3/5 bg-[#fdf6ee] rounded-2xl  border border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-[#fdf6ee] border-b border-amber-200/60 flex items-center justify-between">
        <h3 className="text-[17px] font-bold text-[#5b3d1d]">알림</h3>
        <label className="flex items-center gap-2 text-sm text-[#6b533b]">
          <input
            type="checkbox"
            className="accent-amber-500 w-4 h-4"
            checked={
              selectableCount > 0 && selectedIds.size === selectableCount
            }
            onChange={toggleSelectAll}
          />
          전체 선택(일반)
        </label>
      </div>

      {/* Body */}
      <div className="px-3 py-2 max-h-[60vh] overflow-auto">
        {loading ? (
          <div className="py-10 text-center text-gray-500">불러오는 중…</div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            새 알림이 없어요
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => {
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
                      <input
                        type="checkbox"
                        className="mt-1 accent-amber-500 w-4 h-4"
                        checked={checked}
                        onChange={() => toggleSelect(n)}
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
                        <span
                          className={[
                            "shrink-0 text-[11px] px-2 py-0.5 rounded-full border",
                            isRequest
                              ? "bg-pink-100 text-pink-700 border-pink-300"
                              : "bg-amber-100 text-amber-700 border-amber-300",
                          ].join(" ")}
                        >
                          {n.type}
                        </span>
                      </div>

                      {/* 내용 */}
                      <p className="mt-2 text-sm text-gray-800 whitespace-pre-line break-words">
                        {n.description}
                      </p>

                      {/* 커플 요청 액션 */}
                      {isRequest && (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => handleAccept(n)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-green-500 hover:bg-green-600 active:bg-green-700 text-white transition disabled:opacity-60"
                            disabled={busy}
                          >
                            <Check className="w-4 h-4" />
                            수락
                          </button>
                          <button
                            onClick={() => handleReject(n)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-red-500 hover:bg-red-600 active:bg-red-700 text-white transition disabled:opacity-60"
                            disabled={busy}
                          >
                            <X className="w-4 h-4" />
                            거절
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t bg-white flex items-center justify-between fixed bottom-0 left-0 right-0">
        <div className="text-sm text-[#6b533b]">
          선택됨(일반):{" "}
          <span className="font-semibold">{selectedIds.size}</span> /{" "}
          {notifications.filter(isSelectable).length}
        </div>
        <button
          onClick={deleteSelected}
          disabled={busy || selectedIds.size === 0}
          className={[
            "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border transition",
            selectedIds.size === 0
              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              : "bg-[#fdf6ee] text-[#5b3d1d] border-amber-200 hover:bg-amber-50",
          ].join(" ")}
          title={
            selectedIds.size === 0 ? "선택된 일반 알림이 없습니다" : "선택 삭제"
          }
        >
          <Trash2 className="w-4 h-4" />
          선택 삭제
        </button>
      </div>
    </section>
  );
}
