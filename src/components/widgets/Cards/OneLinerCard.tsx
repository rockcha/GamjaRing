// src/components/widgets/Cards/OneLinerCard.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import supabase from "@/lib/supabase";
import AvatarWidget from "@/components/widgets/AvatarWidget";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCommentDots,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import TodayMessageCard from "./TodayMessageCard";

type OneLiner = {
  id: number;
  author_id: string;
  content: string;
  emoji: string;
  created_at: string;
  updated_at: string;
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

/** 외부 props 없이 <OneLinerCard /> 로 사용 */
export default function OneLinerCard() {
  const { user } = useUser();
  const { partnerId: couplePartnerId } = useCoupleContext();

  const myId = user?.id ?? null;
  const myNickname = getMyNickname(user);
  const partnerId = useMemo(
    () => couplePartnerId ?? user?.partner_id ?? null,
    [couplePartnerId, user?.partner_id]
  );

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        "bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-none shadow-lg",
        "px-5 sm:px-7 py-5"
      )}
      role="region"
      aria-label="오늘의 한마디 카드"
    >
      {/* 상단 헤더 (하나의 카드 느낌 강조) */}
      <header className="mb-4 flex items-center gap-2">
        <FontAwesomeIcon
          icon={faCommentDots}
          className="text-neutral-700"
          aria-hidden
        />
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900">
          오늘의 한마디
        </h3>
      </header>

      {/* 세로 스택: 내 한마디 → 파트너 한마디 */}
      <div className="flex flex-col gap-6">
        <SelfSection myId={myId} myNickname={myNickname} />
        {partnerId && <PartnerSection partnerId={partnerId} />}
      </div>
    </Card>
  );
}

/* ─────────────────────────────────────────────
 * 공통 말풍선 뷰 (섹션 안의 ‘버블’만 담당)
 * ──────────────────────────────────────────── */
function Bubble({
  loading,
  content,
  emoji,
  clamp = 6,
}: {
  loading: boolean;
  content: string;
  emoji: string;
  clamp?: number;
}) {
  return (
    <div className="relative">
      <div
        className={cn(
          "rounded-2xl border border-neutral-200/80 bg-white",
          "px-5 sm:px-6 py-5 sm:py-6",
          "shadow-[0_1px_0_rgba(0,0,0,0.02)]"
        )}
      >
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
          </div>
        ) : (
          <p
            className={cn(
              "text-[17px] sm:text-[18px] leading-relaxed text-neutral-800 whitespace-pre-wrap",
              "break-words",
              "line-clamp-[var(--clamp)] font-hand"
            )}
            style={{ ["--clamp" as any]: String(clamp) }}
          >
            “{content}”
          </p>
        )}
      </div>

      {/* 말풍선 꼬리 (공통) */}
      <span
        aria-hidden
        className={cn(
          "absolute left-8 -bottom-2 h-4 w-4 rotate-45",
          "bg-white border-l border-b border-neutral-200/80"
        )}
      />
      {/* 이모지 칩 (우측 상단 살짝 겹치는 느낌) */}
      <span
        className={cn(
          "absolute -top-3 right-3",
          "rounded-full border border-neutral-200/70 bg-white/90 px-2 py-0.5 text-base"
        )}
        title={`오늘의 기분: ${emoji}`}
        aria-label={`오늘의 기분: ${emoji}`}
      >
        {emoji}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * 섹션 헤더 (아바타 + 닉네임 뱃지)
 * ──────────────────────────────────────────── */
function SectionHeader({
  nickname,
  tone = "emerald", // emerald | rose
  rightAddon,
  avatar,
}: {
  nickname: string;
  tone?: "emerald" | "rose";
  rightAddon?: React.ReactNode;
  avatar: React.ReactNode;
}) {
  const toneClass = tone === "emerald" ? "text-emerald-800" : "text-rose-800";

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {avatar}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[15px] sm:text-[16px] font-semibold",
              toneClass
            )}
          >
            {nickname}
          </span>
          <span className="text-neutral-700 text-[15px] sm:text-[16px] font-medium">
            의 한마디
          </span>
        </div>
      </div>
      {rightAddon}
    </div>
  );
}

/* ─────────────────────────────────────────────
 * “나” 섹션 (편집 가능, Dialog)
 * ──────────────────────────────────────────── */
function SelfSection({
  myId,
  myNickname,
}: {
  myId: string | null;
  myNickname: string;
}) {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<OneLiner | null>(null);
  const [open, setOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!myId) {
      setMsg(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_message")
      .select("*")
      .eq("author_id", myId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<OneLiner>();
    if (error) console.error("[SelfSection] load error:", error);
    setMsg(data ?? null);
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // realtime
  const channelName = useMemo(
    () => (myId ? `one_liner_live:${myId}` : "one_liner_live"),
    [myId]
  );
  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_message",
          filter: `author_id=eq.${myId}`,
        },
        (payload: any) => {
          if (payload?.new) setMsg(payload.new as OneLiner);
          else if (payload?.eventType === "DELETE") setMsg(null);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [myId, channelName]);

  const handleSaved = useCallback(
    async (next?: Partial<Pick<OneLiner, "content" | "emoji" | "id">>) => {
      if (!myId) return;
      if (next) {
        setMsg((prev) => {
          if (!prev) {
            return {
              id: next.id ?? -1,
              author_id: myId,
              content: next.content ?? "",
              emoji: next.emoji ?? "🙂",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
          return {
            ...prev,
            ...next,
            updated_at: new Date().toISOString(),
          } as OneLiner;
        });
      }
      await reload();
      setOpen(false);
    },
    [myId, reload]
  );

  const emoji = msg?.emoji ?? "🙂";
  const content = msg?.content ?? "오늘 한마디를 남겨보세요.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <section
          className={cn(
            "rounded-2xl p-4 sm:p-5",
            "bg-gradient-to-b from-emerald-50/50 to-transparent",
            "hover:bg-emerald-50/60 transition-colors cursor-pointer"
          )}
          title="클릭하여 수정하기"
        >
          <SectionHeader
            nickname={myNickname}
            tone="emerald"
            avatar={<AvatarWidget type="user" size="md" enableMenu={false} />}
          />
          <div className="mt-3">
            <Bubble loading={loading} content={content} emoji={emoji} />
          </div>
        </section>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        {/* 내부 구현 경로에 맞게 import한 TodayMessageCard 사용 */}
        {/* maxLen, onSaved는 기존과 동일하게 동작 */}
        <TodayMessageCard
          maxLen={140}
          initialShowEmojiPicker={false}
          onSaved={handleSaved}
        />
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
 * 파트너 섹션 (읽기 전용)
 * ──────────────────────────────────────────── */
function PartnerSection({ partnerId }: { partnerId: string }) {
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("상대");
  const [msg, setMsg] = useState<OneLiner | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: nickData } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", partnerId)
        .maybeSingle<{ nickname: string }>();
      if (alive && nickData?.nickname) setNickname(nickData.nickname ?? "상대");

      const { data: msgData } = await supabase
        .from("user_message")
        .select("*")
        .eq("author_id", partnerId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle<OneLiner>();

      if (alive) {
        setMsg(msgData ?? null);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [partnerId]);

  // realtime
  const channelName = useMemo(() => `one_liner_live:${partnerId}`, [partnerId]);
  useEffect(() => {
    const ch = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_message",
          filter: `author_id=eq.${partnerId}`,
        },
        (payload: any) => {
          if (payload?.new) setMsg(payload.new as OneLiner);
          else if (payload?.eventType === "DELETE") setMsg(null);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [channelName, partnerId]);

  const emoji = msg?.emoji ?? "🙂";
  const content = msg?.content ?? "아직 메시지가 없어요.";

  return (
    <section
      className={cn(
        "rounded-2xl p-4 sm:p-5",
        "bg-gradient-to-b from-rose-50/50 to-transparent"
      )}
    >
      <SectionHeader
        nickname={nickname}
        tone="rose"
        avatar={<AvatarWidget type="partner" size="md" enableMenu={false} />}
      />
      <div className="mt-3">
        <Bubble loading={loading} content={content} emoji={emoji} />
      </div>
    </section>
  );
}
