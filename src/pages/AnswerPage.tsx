// src/pages/AnswersPage.tsx
"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

import MyAnswersCard from "@/components/MyAnswersCard";
import MyPartnerAnswersCard from "@/components/MyPartnerAnswersCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// ✅ 추가
import AvatarWidget from "@/components/widgets/AvatarWidget";

function AnswersPage() {
  const { user } = useUser();
  const [partnerNickname, setPartnerNickname] = useState<string | null>(null);

  useEffect(() => {
    const fetchPartnerNickname = async () => {
      if (!user?.partner_id) {
        setPartnerNickname(null);
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", user.partner_id)
        .maybeSingle();

      if (!error && data) setPartnerNickname(data.nickname ?? null);
      else setPartnerNickname(null);
    };
    fetchPartnerNickname();
  }, [user?.partner_id]);

  return (
    <main
      className={[
        "mx-auto w-full px-4 md:px-6 py-6",
        // 📱 모바일: 기본 w-full
        // 🧪 태블릿 이상: 화면을 넓게 쓰되 과도하게 늘어나지 않게 단계별 최대너비 제한
        "md:max-w-[92vw]",
        "lg:max-w-[88vw]",
        "xl:max-w-[1280px]",
        "2xl:max-w-[1440px]",
      ].join(" ")}
    >
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* 내 답변 */}
        <Card className="bg-white border shadow-sm">
          <CardHeader className="flex justify-center items-center">
            {/* 👇 내 아바타 */}
            <AvatarWidget type="user" size="sm" />
          </CardHeader>
          <CardContent>
            <MyAnswersCard />
          </CardContent>
        </Card>

        {/* 파트너 답변 */}
        <Card className="bg-white border shadow-sm">
          <CardHeader className="flex justify-center items-center">
            {/* 👇 파트너 아바타 */}
            <AvatarWidget type="partner" size="sm" />
          </CardHeader>
          <CardContent>
            <MyPartnerAnswersCard />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
export { AnswersPage };
