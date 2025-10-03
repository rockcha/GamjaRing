// src/components/widgets/Cards/PartnerOneLinerCard.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import supabase from "@/lib/supabase";
import AvatarWidget from "@/components/widgets/AvatarWidget";
/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCommentDots } from "@fortawesome/free-solid-svg-icons";

type PartnerMessage = {
  id: number;
  author_id: string;
  content: string;
  emoji: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  className?: string;
  icon?: any; // 기본 faCommentDots
  maxLines?: number; // 말풍선 최대 줄수 (기본 6)
};

export default function PartnerOneLinerCard({
  className,
  icon = faCommentDots,
  maxLines = 6,
}: Props) {
  const { user } = useUser();
  const { partnerId: couplePartnerId } = useCoupleContext();
  const partnerId = useMemo(
    () => couplePartnerId ?? user?.partner_id ?? null,
    [couplePartnerId, user?.partner_id]
  );

  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("상대");
  const [msg, setMsg] = useState<PartnerMessage | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!partnerId) {
        setLoading(false);
        setMsg(null);
        return;
      }
      setLoading(true);

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
        .maybeSingle<PartnerMessage>();

      if (alive) {
        setMsg(msgData ?? null);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [partnerId]);

  const hasMsg = !!msg;
  const emoji = msg?.emoji ?? "🙂";
  const content = msg?.content ?? "아직 메시지가 없어요.";

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        "bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-none shadow-lg",
        // 아바타가 좌하단에 겹치므로 여유 패딩 확보
        "px-5 sm:px-7 pt-5 pb-20", // 하단 여백 크게
        className
      )}
      role="region"
      aria-label={`${nickname}의 한마디 카드`}
    >
      {/* 헤더: 중앙 정렬 타이틀/이모지 (미니멀) */}
      <div className="w-full flex items-center justify-start gap-3 mb-3 text-xl">
        <FontAwesomeIcon icon={icon} aria-hidden />
        <h3
          className="text-base sm:text-[20px] font-bold tracking-tight "
          title={`${nickname} 의 한마디`}
        >
          <span className="text-amber-800"> {nickname} </span>

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

      {/* 본문: 중앙 큰 말풍선 (텍스트 큼) */}
      <div className="relative">
        {/* 말풍선 컨테이너 */}
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

        {/* 말풍선 꼬리: 좌하단 아바타 쪽을 향하도록 왼쪽 아래로 배치 */}
        <span
          aria-hidden
          className={cn(
            "absolute right-8 -bottom-3 h-4 w-4 rotate-45",
            "bg-white border-l border-b border-neutral-200/80"
          )}
        />
      </div>

      {/* 좌하단 고정 큰 아바타 (겹쳐 보이는 느낌) */}
      <div
        className={cn(
          "pointer-events-none", // 클릭 패스(아바타 위에 텍스트 클릭 가능)
          "absolute right-4 bottom-4"
        )}
        aria-hidden
      >
        {/* AvatarWidget 자체가 링/그라데이션/상태점 포함 */}
        <div className="drop-shadow-sm">
          <AvatarWidget type="partner" size="lg" enableMenu={false} />
        </div>
      </div>
    </Card>
  );
}
