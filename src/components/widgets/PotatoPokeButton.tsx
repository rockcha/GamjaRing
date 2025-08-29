// src/components/PotatoPokeButton.tsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { useToast } from "@/contexts/ToastContext";
import supabase from "@/lib/supabase";
import { avatarSrc } from "@/features/localAvatar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CoolMode } from "../magicui/cool-mode";

interface Props {
  className?: string; // 추가 커스텀 클래스(선택)
  onSent?: () => void;
  onError?: (err: Error) => void;
  // 아래 props는 더 이상 UI엔 쓰지 않지만, 외부 API 유지용
  title?: string;
  subtitle?: string;
}

const POKE_FALLBACK_IMG = "/images/potato-poke.png";

export default function PotatoPokeButton({
  className = "",
  onSent,
  onError,
}: Props) {
  const { user } = useUser();
  const { open } = useToast();
  const [loading, setLoading] = useState(false);

  // 파트너 정보 (아바타/닉네임)
  const [partnerAvatarId, setPartnerAvatarId] = useState<number | null>(null);
  const [partnerNickname, setPartnerNickname] = useState<string>("상대");

  // 커플 여부
  const isCoupled = Boolean(user?.partner_id);

  // 파트너 아바타 URL (없으면 폴백 이미지)
  const partnerAvatarUrl = useMemo(
    () => avatarSrc(partnerAvatarId ?? undefined) ?? POKE_FALLBACK_IMG,
    [partnerAvatarId]
  );

  // 파트너 프로필 로드
  useEffect(() => {
    const run = async () => {
      if (!user?.partner_id) {
        setPartnerAvatarId(null);
        setPartnerNickname("상대");
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("nickname, avatar_id")
        .eq("id", user.partner_id)
        .maybeSingle();

      if (!error && data) {
        setPartnerNickname(data.nickname ?? "상대");
        setPartnerAvatarId((data.avatar_id as number | null) ?? null);
      } else {
        setPartnerAvatarId(null);
        setPartnerNickname("상대");
      }
    };
    run();
  }, [user?.partner_id]);

  const handleClick = async () => {
    if (loading) return;

    if (!user?.partner_id) {
      open("커플 연결부터 해주세요");
      return;
    }

    try {
      setLoading(true);
      const description = `${user?.nickname ?? "상대"}님이 콕 찔렀어요! 🥔✨`;

      const { error } = await sendUserNotification({
        senderId: user.id,
        receiverId: user.partner_id,
        type: "감자 콕찌르기",
        description,
        isRequest: false,
      });

      if (error) {
        onError?.(error);
        return;
      }

      open("연인에게 알림을 보냈어요! 💌");
      onSent?.();
    } catch (e) {
      onError?.(e as Error);
    } finally {
      setLoading(false);
    }
  };

  // 고정 위치: 좌하단 + 안전영역 고려
  const fixedClasses =
    "fixed left-4 bottom-[calc(env(safe-area-inset-bottom,0)+1rem)] z-50";

  // 🚫 커플이 아닐 때는 버튼 표시하지 않음
  if (!isCoupled) return null;

  return (
    <CoolMode options={{ particle: "🥔", particleCount: 3, size: 4 }}>
      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        disabled={loading}
        aria-busy={loading}
        aria-label={`${partnerNickname} 콕 찌르기`}
        className={[
          fixedClasses,
          "rounded-full ",
          loading ? "opacity-70 cursor-not-allowed" : "cursor-pointer",
          className,
        ].join(" ")}
      >
        <Avatar className="w-14 h-14 md:w-16 md:h-16 border shadow-lg bg-white p-1">
          <AvatarImage
            src={partnerAvatarUrl}
            alt={`${partnerNickname} 아바타`}
          />
          <AvatarFallback className="text-xl">🥔</AvatarFallback>
        </Avatar>
      </motion.button>
    </CoolMode>
  );
}
