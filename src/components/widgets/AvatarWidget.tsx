// src/components/widgets/AvatarWidget.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import supabase from "@/lib/supabase";
import { avatarSrc } from "@/features/localAvatar";

export type AvatarWidgetSize = "sm" | "md" | "lg";
export type AvatarWidgetType = "user" | "partner";

type Props = {
  className?: string;
  size?: AvatarWidgetSize;
  type?: AvatarWidgetType;
};

const AVATAR_SIZE: Record<AvatarWidgetSize, string> = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-14 w-14",
};

const NAME_TEXT: Record<AvatarWidgetSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export default function AvatarWidget({
  className,
  size = "md",
  type = "user",
}: Props) {
  const { user } = useUser();

  const [nickname, setNickname] = useState<string>("나");
  const [avatarId, setAvatarId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(type === "partner"); // 👈 파트너면 true로 시작

  useEffect(() => {
    let cancelled = false;

    const setSelf = () => {
      setNickname(user?.nickname ?? "나");
      setAvatarId(
        user?.avatar_id == null
          ? null
          : typeof user.avatar_id === "number"
          ? user.avatar_id
          : Number.isFinite(Number(user.avatar_id))
          ? Number(user.avatar_id)
          : null
      );
      setLoading(false);
    };

    const setPartner = async () => {
      if (!user?.partner_id) {
        setNickname("상대");
        setAvatarId(null);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("nickname, avatar_id")
        .eq("id", user.partner_id)
        .maybeSingle();

      if (cancelled) return;
      if (!error && data) {
        setNickname(data.nickname ?? "상대");
        setAvatarId(
          typeof data.avatar_id === "number"
            ? data.avatar_id
            : Number.isFinite(Number(data.avatar_id))
            ? Number(data.avatar_id)
            : null
        );
      } else {
        setNickname("상대");
        setAvatarId(null);
      }
      setLoading(false);
    };

    if (type === "user") {
      setSelf();
    } else {
      setPartner();
    }

    return () => {
      cancelled = true;
    };
  }, [type, user?.nickname, user?.avatar_id, user?.partner_id]);

  const imgUrl = useMemo(
    () => avatarSrc(avatarId ?? undefined) ?? undefined,
    [avatarId]
  );
  const initial = nickname.trim()?.[0] || "🙂";

  return (
    <div className={cn("inline-flex flex-col items-center", className)}>
      <Avatar className={cn(AVATAR_SIZE[size])}>
        {loading ? (
          <AvatarFallback className="text-xs text-gray-400">…</AvatarFallback>
        ) : (
          <>
            <AvatarImage src={imgUrl} alt={`${nickname} 아바타`} />
            <AvatarFallback className="font-semibold">{initial}</AvatarFallback>
          </>
        )}
      </Avatar>

      <span
        className={cn(
          "font-semibold text-amber-700 max-w-[8rem] truncate",
          NAME_TEXT[size]
        )}
        title={nickname}
      >
        {loading ? "로딩중..." : nickname}
      </span>
    </div>
  );
}
