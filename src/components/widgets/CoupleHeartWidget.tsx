// src/components/widgets/CoupleHeartWidget.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import supabase from "@/lib/supabase";
import { avatarSrc } from "@/features/localAvatar";

type Size = "sm" | "md" | "lg";

type Props = {
  className?: string;
  size?: Size; // 기본 md
};

const AVATAR_SIZE: Record<Size, string> = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-14 w-14",
};

const NAME_TEXT: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

const HEART_SIZE: Record<Size, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export default function CoupleHeartWidget({ className, size = "md" }: Props) {
  const { user } = useUser();

  // 내 정보
  const myNickname = user?.nickname ?? "나";
  const myAvatarId = user?.avatar_id ?? null;

  // 상대 정보
  const [partnerNickname, setPartnerNickname] = useState<string>("상대");
  const [partnerAvatarId, setPartnerAvatarId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadPartner = async () => {
      if (!user?.partner_id) return;
      const { data } = await supabase
        .from("users")
        .select("nickname, avatar_id")
        .eq("id", user.partner_id)
        .maybeSingle();
      if (!cancelled && data) {
        setPartnerNickname(data.nickname ?? "상대");
        setPartnerAvatarId(
          typeof data.avatar_id === "number"
            ? data.avatar_id
            : Number.isFinite(Number(data.avatar_id))
            ? Number(data.avatar_id)
            : null
        );
      }
    };
    loadPartner();
    return () => {
      cancelled = true;
    };
  }, [user?.partner_id]);

  // URL
  const myUrl = useMemo(
    () => avatarSrc(myAvatarId ?? undefined) ?? undefined,
    [myAvatarId]
  );
  const partnerUrl = useMemo(
    () => avatarSrc(partnerAvatarId ?? undefined) ?? undefined,
    [partnerAvatarId]
  );

  // 이니셜
  const myInitial = myNickname.trim()?.[0] || "🙂";
  const partnerInitial = partnerNickname.trim()?.[0] || "🙂";

  return (
    <div className={cn("inline-flex flex-col items-center ", className)}>
      {/* 아바타들 */}
      <div className="flex items-end gap-4 ">
        <Avatar className={cn(AVATAR_SIZE[size])}>
          <AvatarImage src={myUrl} alt={`${myNickname} 아바타`} />
          <AvatarFallback>{myInitial}</AvatarFallback>
        </Avatar>

        <Avatar className={cn(AVATAR_SIZE[size])}>
          <AvatarImage src={partnerUrl} alt={`${partnerNickname} 아바타`} />
          <AvatarFallback>{partnerInitial}</AvatarFallback>
        </Avatar>
      </div>

      {/* 닉네임 + 하트 */}
      <div className=" flex items-center gap-2">
        <span
          className={cn(
            "font-semibold text-amber-700",
            NAME_TEXT[size],
            "max-w-[7rem] truncate"
          )}
        >
          {myNickname}
        </span>
        <Heart
          className={cn(HEART_SIZE[size], "text-rose-500")}
          fill="currentColor"
          strokeWidth={1.5}
        />
        <span
          className={cn(
            "font-semibold text-amber-700",
            NAME_TEXT[size],
            "max-w-[7rem] truncate"
          )}
        >
          {partnerNickname}
        </span>
      </div>
    </div>
  );
}
