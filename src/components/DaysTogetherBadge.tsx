import { useCoupleContext } from "@/contexts/CoupleContext";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import supabase from "@/lib/supabase";

export default function DaysTogetherBadge() {
  const { couple, partnerId } = useCoupleContext();
  const [partnerNickname, setPartnerNickname] = useState<string | null>(null);

  useEffect(() => {
    const fetchNickname = async () => {
      if (!partnerId) return;
      const { data } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", partnerId)
        .maybeSingle();

      if (data?.nickname) {
        setPartnerNickname(data.nickname);
      }
    };

    fetchNickname();
  }, [partnerId]);

  if (!couple) {
    return (
      <div className="text-gray-500 text-base px-4 py-2 text-center">
        함께하는 사람이 없어요 😢
      </div>
    );
  }

  if (!couple.started_at || !partnerNickname) {
    return (
      <div className="text-gray-700 text-base px-4 py-2 text-center">
        ?님과 함께한 지 ?일째
      </div>
    );
  }

  const today = new Date();
  const anniversaryDate = new Date(couple.started_at);
  const daysTogether = Math.floor(
    (+today - +anniversaryDate) / (1000 * 60 * 60 * 24)
  );

  return (
    <motion.p
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative inline-block text-center text-[22px] md:text-[26px] font-semibold text-[#5b3d1d]"
    >
      {/* 텍스트 전체 */}
      <span className="relative z-10">
        <span className="font-bold text-[30px] md:text-[50px] text-[#b75e20]">
          {partnerNickname}
        </span>
        &nbsp;님과&nbsp;&nbsp;&nbsp;
        {/* 🔥 두근두근 + 색상 변화 효과 */}
        <motion.span
          className="inline-block font-extrabold text-[34px] md:text-[50px]"
          animate={{
            color: [
              "#b75e20", // 따뜻한 모카 브라운
              "#e47191", // 감성 핑크

              "#b75e20", // 다시 갈색
            ],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {daysTogether}
        </motion.span>
        &nbsp;일 함께하는 중
      </span>
    </motion.p>
  );
}
