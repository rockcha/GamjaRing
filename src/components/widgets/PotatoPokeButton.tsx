// src/components/PotatoPokeButton.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { Loader2 } from "lucide-react";

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

  const [loading, setLoading] = useState(false);
  const [partnerNickname, setPartnerNickname] = useState("상대");

  // ✅ 클릭 시에만 파동 보이도록 제어
  const [ripple, setRipple] = useState(false);
  const rippleTimer = useRef<number | null>(null);
  const startRipple = () => {
    setRipple(false); // 재시작을 위해 한번 껐다가
    requestAnimationFrame(() => {
      setRipple(true);
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
      rippleTimer.current = window.setTimeout(() => setRipple(false), 1400);
    });
  };

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

    return () => {
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
    };
  }, [user?.partner_id]);

  const handleClick = async () => {
    // ✅ 클릭 시 파동 시작
    startRipple();

    if (loading) return;
    if (!user?.partner_id) {
      toast.warning("커플 연결부터 해주세요");
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

      toast.info("연인에게 알림을 보냈어요! 💌");
      onSent?.();
    } catch (e) {
      onError?.(e as Error);
    } finally {
      setLoading(false);
    }
  };

  const Btn = (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
      aria-label={`${partnerNickname} 콕 찌르기`}
      className={[
        "relative grid place-items-center",
        "h-14 w-14 rounded-full border",
        "bg-white/60 ",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2",
        "transition-colors",
        loading ? "opacity-80 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      {/* ✅ 클릭 시에만 파동 */}
      {ripple && (
        <span
          className="
              pointer-events-none absolute inset-0 rounded-full
              ring-4 ring-rose-300/50
              animate-[pokePing_1.4s_ease-out_forwards]
            "
          aria-hidden
        />
      )}

      {/* 아이콘/로더 */}
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <span className="text-2xl leading-none select-none">👉</span>
      )}

      {/* 시각적 라벨 대신 접근성용 텍스트 */}
      <span className="sr-only">콕찌르기</span>
    </motion.button>
  );

  return Btn; // ✅ inline 모드
}
