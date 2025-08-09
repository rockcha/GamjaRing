import { useCoupleContext } from "@/contexts/CoupleContext";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import supabase from "@/lib/supabase";
import { User } from "lucide-react";

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
      <div className="text-gray-500 text-base px-4 py-2 text-left">
        로그아웃 상태거나 함께하는 사람이 없어요 😢
      </div>
    );
  }

  if (!couple.started_at || !partnerNickname) {
    return (
      <div className="text-gray-700 text-base px-4 py-2 text-left">
        ?님과 함께한 지 ?일째
      </div>
    );
  }

  const today = new Date();
  const anniversaryDate = new Date(couple.started_at);
  const daysTogether = Math.floor(
    (+today - +anniversaryDate) / (1000 * 60 * 60 * 24) + 2
  );

  return (
    <p className="w-full text-left text-[22px] md:text-[24px] font-semibold text-[#5b3d1d]">
      <span className="font-bold text-[30px] md:text-[50px] text-[#b75e20]">
        {partnerNickname}
      </span>
      &nbsp;와 함께한 시간은 &nbsp;
      <span className="font-extrabold text-[34px] md:text-[50px] text-[#b75e20]">
        {daysTogether}
      </span>
      &nbsp;일
    </p>
  );
}
