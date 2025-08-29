// src/components/notification/ui/NotificationItem.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { cn } from "@/lib/utils";

type NotificationMinimal = {
  id: string;
  type?: string | null;
  description?: string | null;
  is_read?: boolean | null;
  is_request?: boolean | null;
};

export function NotificationItem({
  n,
  timeText,
}: {
  n: NotificationMinimal;
  timeText: string;
}) {
  // ⬇️ isCoupled 함께 사용
  const { acceptRequest, rejectRequest, isCoupled } = useCoupleContext();

  const [dbRow, setDbRow] = useState<NotificationMinimal | null>(null);
  const [loadingRow, setLoadingRow] = useState(false);

  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [doneText, setDoneText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRow(true);
      const { data, error } = await supabase
        .from("user_notification")
        .select("id, type, description, is_read, is_request")
        .eq("id", n.id)
        .maybeSingle();
      if (!cancelled) {
        if (!error && data) setDbRow(data as NotificationMinimal);
        setLoadingRow(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [n.id]);

  const displayType = (dbRow?.type ?? n.type ?? "알림") as string;
  const displayDesc = (dbRow?.description ?? n.description ?? "") as string;
  const isRead = Boolean(dbRow?.is_read ?? n.is_read);
  const isCoupleRequest = useMemo(
    () =>
      displayType === "커플요청" && Boolean(dbRow?.is_request ?? n.is_request),
    [displayType, dbRow?.is_request, n.is_request]
  );

  const showActions = isCoupleRequest && !doneText;

  const onAccept = async () => {
    if (accepting || rejecting || isCoupled) return; // ⬅️ 가드
    setAccepting(true);
    const { error } = await acceptRequest(n.id);
    setAccepting(false);
    setDoneText(error ? `수락 실패: ${error.message}` : "요청을 수락했어요 💘");
  };

  const onReject = async () => {
    if (accepting || rejecting) return;
    setRejecting(true);
    const { error } = await rejectRequest(n.id);
    setRejecting(false);
    setDoneText(error ? `거절 실패: ${error.message}` : "요청을 거절했어요 🙅");
  };

  return (
    <li
      className={cn(
        "flex gap-3 rounded-md px-3 py-2 hover:bg-muted/60 transition border-b"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm text-foreground whitespace-pre-line break-words">
          {loadingRow ? "불러오는 중…" : displayDesc}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{timeText}</span>
          </div>

          {doneText && (
            <span className="text-[11px] text-muted-foreground">
              · {doneText}
            </span>
          )}

          {showActions && (
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                className="h-6 px-2"
                onClick={onAccept}
                disabled={accepting || rejecting || isCoupled} // ⬅️ 여기서 비활성화
                title={isCoupled ? "이미 커플 상태입니다." : undefined}
              >
                {accepting ? "수락 중…" : "수락"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2"
                onClick={onReject}
                disabled={accepting || rejecting}
              >
                {rejecting ? "거절 중…" : "거절"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="pt-0.5">
        <Badge variant={isRead ? "secondary" : "default"}>{displayType}</Badge>
      </div>
    </li>
  );
}
