// src/components/PotatoPokeButton.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { useToast } from "@/contexts/ToastContext";
import supabase from "@/lib/supabase";
import { CoolMode } from "../magicui/cool-mode";

export default function PotatoPokeButton({
  className = "",
  onSent,
  onError,
}: {
  className?: string;
  onSent?: () => void;
  onError?: (err: Error) => void;
}) {
  const { user } = useUser();
  const { open } = useToast();
  const [loading, setLoading] = useState(false);
  const [partnerNickname, setPartnerNickname] = useState("상대");

  const isCoupled = Boolean(user?.partner_id);

  useEffect(() => {
    const run = async () => {
      if (!user?.partner_id) {
        setPartnerNickname("상대");
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", user.partner_id)
        .maybeSingle();

      setPartnerNickname(data?.nickname ?? "상대");
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
    <CoolMode options={{ particle: "👉", particleCount: 3, size: 4 }}>
      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        disabled={loading}
        aria-busy={loading}
        aria-label={`${partnerNickname} 콕 찌르기`}
        className={[
          "flex flex-col items-center justify-center gap-1", // 세로 정렬
          "cursor-pointer select-none",
          loading ? "opacity-70 cursor-not-allowed" : "",
          className,
        ].join(" ")}
      >
        {/* 손가락 이모지 (작게) */}
        <span className="text-xl md:text-2xl">👉</span>

        {/* 아래 텍스트 */}
        <span className="text-xs font-medium text-neutral-700">콕찌르기</span>
      </motion.button>
    </CoolMode>
  );
}
