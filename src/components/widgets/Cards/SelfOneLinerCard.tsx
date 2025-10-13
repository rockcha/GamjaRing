// src/components/widgets/Cards/SelfOneLinerCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import supabase from "@/lib/supabase";
import AvatarWidget from "@/components/widgets/AvatarWidget";
/* shadcn/ui */
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCommentDots } from "@fortawesome/free-solid-svg-icons";
/* 내부 에디터 카드 (경로 주의: 이번 요청 파일 경로) */
import TodayMessageCard from "./TodayMessageCard";

type UserMessage = {
  id: number;
  author_id: string;
  content: string;
  emoji: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  className?: string;
  maxLines?: number; // 말풍선 최대 줄수 (기본 6)
  titleIcon?: any; // 기본 faCommentDots
};

function getMyNickname(user: any): string {
  return (
    user?.user_metadata?.nickname ??
    user?.nickname ??
    user?.profile?.nickname ??
    user?.email?.split?.("@")?.[0] ??
    "나"
  );
}

export default function SelfOneLinerCard({
  className,
  maxLines = 6,
  titleIcon = faCommentDots,
}: Props) {
  const { user } = useUser();
  const myId = user?.id ?? null;
  const myNickname = getMyNickname(user);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<UserMessage | null>(null);
  const [open, setOpen] = useState(false);

  // 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!myId) {
        setLoading(false);
        setMsg(null);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("user_message")
        .select("*")
        .eq("author_id", myId)
        .maybeSingle<UserMessage>();
      if (!alive) return;
      if (error) console.error("[SelfOneLinerCard] load error:", error);
      setMsg(data ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [myId]);

  // realtime
  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel("self_user_message_live_card")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_message",
          filter: `author_id=eq.${myId}`,
        },
        (payload) => {
          if (payload?.new) setMsg(payload.new as UserMessage);
          else if ((payload as any)?.eventType === "DELETE") setMsg(null);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [myId]);

  const emoji = msg?.emoji ?? "🙂";
  const content = msg?.content ?? "오늘 한마디를 남겨보세요.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card
          className={cn(
            "relative overflow-hidden cursor-pointer",
            "bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-none shadow-lg",
            "px-5 sm:px-7 pt-5 pb-20",
            "transition-transform hover:-translate-y-[1px] hover:shadow-xl",
            className
          )}
          role="region"
          aria-label={`${myNickname}의 한마디 카드`}
          title="클릭하여 수정하기"
        >
          {/* 헤더 */}
          <div className="w-full flex items-center justify-start gap-3 mb-3 text-xl">
            <FontAwesomeIcon
              icon={titleIcon}
              aria-hidden
              className="text-neutral-700"
            />
            <h3 className="text-base sm:text-[20px] font-bold tracking-tight">
              <span className="text-emerald-800">{myNickname}</span>
              <span className="text-neutral-800 font-semibold">의 한마디</span>
            </h3>
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0.5 text-base bg-white/70"
              aria-label={`오늘의 기분: ${emoji}`}
              title={`오늘의 기분: ${emoji}`}
            >
              {emoji}
            </Badge>
          </div>

          {/* 말풍선 */}
          <div className="relative">
            <div
              className={cn(
                "mx-auto max-w-2xl",
                "rounded-3xl border border-neutral-200/80 bg-white",
                "px-5 sm:px-7 py-6 sm:py-8",
                "shadow-[0_1px_0_rgba(0,0,0,0.02)]"
              )}
            >
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-1/2 mx-auto" />
                  <Skeleton className="h-5 w-4/5 mx-auto" />
                  <Skeleton className="h-5 w-3/5 mx-auto" />
                </div>
              ) : (
                <p
                  className={cn(
                    "text-center",
                    "text-[19px] sm:text-[20px] leading-relaxed text-neutral-800 whitespace-pre-wrap",
                    "break-words",
                    "line-clamp-[var(--clamp)] font-hand"
                  )}
                  style={{ ["--clamp" as any]: String(maxLines) }}
                >
                  "{content}"
                </p>
              )}
            </div>

            {/* 꼬리 */}
            <span
              aria-hidden
              className={cn(
                "absolute right-8 -bottom-3 h-4 w-4 rotate-45",
                "bg-white border-l border-b border-neutral-200/80"
              )}
            />
          </div>

          {/* ✅ 내 아바타 */}
          <div
            className="pointer-events-none absolute right-4 bottom-4"
            aria-hidden
          >
            <div className="drop-shadow-sm">
              <AvatarWidget type="user" size="lg" enableMenu={false} />
            </div>
          </div>
        </Card>
      </DialogTrigger>

      {/* ✅ 이모지 피커는 기본 '접힘', 저장하면 Dialog 닫힘 */}
      <DialogContent className="sm:max-w-2xl">
        <TodayMessageCard
          maxLen={140}
          initialShowEmojiPicker={false}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
