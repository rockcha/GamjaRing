// src/components/notification/ui/NotificationItem.tsx
"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import type { NotificationRow } from "./types";
import { useCoupleContext } from "@/contexts/CoupleContext";

export function NotificationItem({
  n,
  timeText,
}: {
  n: NotificationRow;
  timeText: string;
}) {
  const { acceptRequest, rejectRequest } = useCoupleContext();

  // 버튼 로딩/결과 상태
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [doneText, setDoneText] = useState<string | null>(null);

  // 커플요청인지 판단
  const isCoupleRequest = useMemo(
    () => n.type === "커플요청" && !!n.is_request,
    [n.type, n.is_request]
  );

  const showActions = isCoupleRequest && !doneText; // 완료되면 버튼 숨김

  const onAccept = async () => {
    if (accepting || rejecting) return;
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
    <li className="flex gap-3 rounded-md px-3 py-2 hover:bg-muted/60 transition border-b">
      <div className="min-w-0 flex-1">
        <div className="text-sm text-foreground whitespace-pre-line break-words">
          {n.description}
        </div>

        {/* 하단: 시간/상태/액션 */}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{timeText}</span>
          </div>

          {/* 결과 문구(수락/거절 후) */}
          {doneText && (
            <span className="text-[11px] text-muted-foreground">
              · {doneText}
            </span>
          )}

          {/* 액션 버튼(커플요청일 때만 노출) */}
          {showActions && (
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                className="h-6 px-2"
                onClick={onAccept}
                disabled={accepting || rejecting}
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
        <Badge
          variant={n.is_read ? "secondary" : "default"}
          className={n.is_read ? "" : "bg-amber-600 hover:bg-amber-600"}
        >
          {n.type}
        </Badge>
      </div>
    </li>
  );
}
