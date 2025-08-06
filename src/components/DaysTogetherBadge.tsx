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
      <div className="text-gray-500 text-base px-4 py-2 rounded bg-gray-100 text-center">
        함께하는 사람이 없어요 😢
      </div>
    );
  }

  if (!couple.started_at || !partnerNickname) {
    return (
      <div className="text-gray-700 text-base px-4 py-2 rounded bg-gray-50 text-center">
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
    <div className="bg-white py-4 px-6 rounded-lg text-center">
      <motion.p
        whileHover={{
          scale: 1.02,
          opacity: 0.9,
          transition: { duration: 0.3, ease: "easeInOut" },
        }}
        className="text-[15px] md:text-base font-medium text-[#5b3d1d]"
      >
        <span className="font-bold text-lg md:text-xl text-[#b75e20]">
          {partnerNickname}
        </span>
        &nbsp;님과&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <span className="font-extrabold text-2xl md:text-3xl text-[#e47100]">
          {daysTogether}일째
        </span>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;함께하는 중 💘
      </motion.p>
    </div>
  );
}
