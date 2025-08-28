// src/components/PotatoPokeButton.tsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { useToast } from "@/contexts/ToastContext";
import supabase from "@/lib/supabase";
import { avatarSrc } from "@/features/localAvatar";
// shadcn avatar
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Props {
  className?: string;
  onSent?: () => void;
  onError?: (err: Error) => void;
  title?: string;
  subtitle?: string;
}

const POKE_FALLBACK_IMG = "/images/potato-poke.png";

export default function PotatoPokeButton({
  className = "",
  onSent,
  onError,
  title = "감자 콕 찌르기",
  subtitle = "연인의 아바타를 찔러주세요.",
}: Props) {
  const { user } = useUser();
  const { open } = useToast();
  const [loading, setLoading] = useState(false);

  // 파트너 정보 (아바타/닉네임)
  const [partnerAvatarId, setPartnerAvatarId] = useState<number | null>(null);
  const [partnerNickname, setPartnerNickname] = useState<string>("상대");

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

  return (
    <div
      className={`w-full flex flex-col items-center ${className} py-4 rounded-lg bg-white`}
    >
      <div className="text-center w-full border-b py-1 pb-3">
        <h3 className="text-lg font-bold text-[#3d2b1f]">{`${partnerNickname} 👉콕 찌르기`}</h3>
        <p className="text-sm text-[#6b533b]">{subtitle}</p>
      </div>

      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        disabled={loading}
        aria-busy={loading}
        className={[
          "relative group rounded-xl select-none",
          "focus:outline-none",
          loading ? "opacity-70 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        {/* ▶ shadcn Avatar로 통일 */}
        <Avatar className="w-32 h-32 border shadow-sm bg-white mt-4 ">
          <AvatarImage
            src={partnerAvatarUrl}
            alt={`${partnerNickname} 콕 찌르기`}
            // 로드 실패 시 Fallback이 자연스럽게 노출됨
          />
          <AvatarFallback className="text-xl">🥔</AvatarFallback>
        </Avatar>

        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl">
            <span className="animate-pulse text-[#5b3d1d] text-sm">
              보내는 중…
            </span>
          </div>
        )}
      </motion.button>
    </div>
  );
}
