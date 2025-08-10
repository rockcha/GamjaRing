// src/components/PotatoPokeButton.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
// ✅ 프로젝트의 useToast 경로에 맞춰 조정하세요.
import { useToast } from "@/contexts/ToastContext";

interface Props {
  className?: string;
  onSent?: () => void;
  onError?: (err: Error) => void;
  title?: string;
  subtitle?: string;
}

// ✅ 내부 고정 이미지 (원하면 경로만 바꾸면 됨)
const POKE_IMG = "/images/potato-poke.png";

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

  const handleClick = async () => {
    if (loading) return;

    // 파트너 없는 경우: 토스트
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
      const err = e as Error;

      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {/* 타이틀/서브타이틀 */}
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold text-[#3d2b1f]">{title}</h3>
        <p className="text-sm text-[#6b533b]">{subtitle}</p>
      </div>

      {/* 이미지 버튼 (고정 이미지) */}
      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.05 }} // 🔹 호버 시 살짝 확대
        whileTap={{ scale: 0.97 }} // 🔹 탭 시 살짝 축소
        disabled={loading}
        aria-busy={loading}
        className={[
          "relative group rounded-xl select-none",
          "focus:outline-none",
          loading ? "opacity-70 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        {/* ✅ 보더 레이어: 평소 보이고, 탭 중에는 숨김 */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl "
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          whileTap={{ opacity: 0 }} // ← 눌렀을 때 보더 안 보이게
        />

        <img
          src={POKE_IMG}
          alt="감자 콕 찌르기"
          className="w-58 h-58 object-contain"
          draggable={false}
        />

        {/* ✅ 호버 힌트: '나를 찔러봐' */}
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
          나를 찔러봐
        </div>

        {/* 로딩 인디케이터 (최상단) */}
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
