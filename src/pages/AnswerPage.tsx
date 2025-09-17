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
    <main className="mx-auto w-full max-w-screen-lg px-4 md:px-6 py-6">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* 내 답변 */}
        <Card className="bg-white border shadow-sm">
          <CardHeader className="flex jutify-center items-center ">
            {/* 👇 내 아바타 */}

            <AvatarWidget type="user" size="sm" />
          </CardHeader>
          <CardContent>
            <MyAnswersCard />
          </CardContent>
        </Card>

        {/* 파트너 답변 */}
        <Card className="bg-white border shadow-sm">
          <CardHeader className="flex justify-center items-center ">
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
