// src/components/PotatoPokeButton.tsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { useToast } from "@/contexts/ToastContext";
import supabase from "@/lib/supabase";
import { avatarSrc } from "@/features/localAvatar";

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
  subtitle = "감자를 찔러 연인에게 알림을 보내세요.",
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
    <div className={`w-full flex flex-col items-center ${className}`}>
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold text-[#3d2b1f]">{title}</h3>
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
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          whileTap={{ opacity: 0 }}
        />

        {/* ▶ 파트너 아바타 or 폴백 이미지 */}
        <img
          src={partnerAvatarUrl}
          alt={`${partnerNickname} 콕 찌르기`}
          className={
            partnerAvatarId
              ? "w-40 h-40 rounded-full object-cover border shadow-sm" // 아바타면 동그랗게
              : "w-48 h-32 object-contain" // 폴백 이미지면 기존 사이즈
          }
          draggable={false}
          loading="lazy"
        />

        <div
          className="
            absolute bottom-14 left-1/2 -translate-x-1/2 z-20
            px-2 py-1 text-xs rounded-md
            bg-black/60 text-white
            opacity-0 translate-y-1
            transition-all duration-200
            group-hover:opacity-100 group-hover:translate-y-0
          "
        >
          {partnerNickname}에게 찌르기
        </div>

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
