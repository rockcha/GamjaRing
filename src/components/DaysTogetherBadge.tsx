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
      <div className="text-gray-500 text-base px-4 py-3 rounded bg-gray-100 shadow-sm inline-block">
        함께하는 사람이 없어요 😢
      </div>
    );
  }

  if (!couple.started_at || !partnerNickname) {
    return (
      <div className="text-gray-700 text-base px-4 py-3 rounded bg-yellow-100 shadow-sm inline-block">
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
    <motion.div
      whileHover={{
        scale: 1.05,
        rotate: [0, -1, 1, -1, 0],
        transition: { duration: 0.4 },
      }}
      className="bg-pink-50 border border-pink-200 text-center px-6 py-4 rounded-xl shadow-md inline-block"
    >
      <p className="text-lg md:text-xl font-medium text-black">
        <span className="text-amber-600 text-3xl font-semibold">
          {partnerNickname}
        </span>
        <span className="text-xl">님과 </span>
        <br />
        <span className="text-pink-600 text-4xl md:text-5xl font-extrabold tracking-wide">
          {daysTogether}
        </span>
        <span className="text-xl text-black">일째 함께하는 중 💘</span>
      </p>
    </motion.div>
  );
}
