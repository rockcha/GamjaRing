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
import { User2 } from "lucide-react"; // ✅ 아이콘 추가

// 🔻 폴백 PNG 제거
// const POKE_FALLBACK_IMG = "/images/potato-poke.png";

export default function PotatoPokeButton({
  className = "",
  onSent,
  onError,
}: {
  className?: string;
  onSent?: () => void;
  onError?: (err: Error) => void;
  title?: string;
  subtitle?: string;
}) {
  const { user } = useUser();
  const { open } = useToast();
  const [loading, setLoading] = useState(false);

  const [partnerAvatarId, setPartnerAvatarId] = useState<number | null>(null);
  const [partnerNickname, setPartnerNickname] = useState<string>("상대");

  const isCoupled = Boolean(user?.partner_id);

  // ✅ 아바타가 없으면 undefined를 반환 → AvatarFallback만 노출
  const partnerAvatarUrl = useMemo(
    () => (partnerAvatarId ? avatarSrc(partnerAvatarId) : undefined),
    [partnerAvatarId]
  );

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
      const { error } = await sendUserNotification({
        senderId: user.id,
        receiverId: user.partner_id,
        type: "콕찌르기",
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
          "rounded-full",
          loading ? "opacity-70 cursor-not-allowed" : "cursor-pointer",
          className,
        ].join(" ")}
      >
        <Avatar className="w-14 h-14 md:w-16 md:h-16 border shadow-lg bg-white p-1 overflow-hidden rounded-full">
          {/* ✅ URL 있을 때만 이미지 렌더 */}
          {partnerAvatarUrl && (
            <AvatarImage
              src={partnerAvatarUrl}
              alt={`${partnerNickname} 아바타`}
              className="h-full w-full object-cover object-center"
              loading="lazy"
            />
          )}
          {/* ✅ 아바타 없으면 아이콘으로 표시 */}
          <AvatarFallback className="flex items-center justify-center bg-neutral-50 text-neutral-500">
            <User2 className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
      </motion.button>
    </CoolMode>
  );
}
