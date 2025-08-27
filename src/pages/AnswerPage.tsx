// src/pages/AnswersPage.tsx
"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

import MyAnswersCard from "@/components/MyAnswersCard";
import MyPartnerAnswersCard from "@/components/MyPartnerAnswersCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AnswersPage() {
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

  const myTitle = user?.nickname ? `${user.nickname}의 답변` : "내 답변";
  const partnerTitle = partnerNickname
    ? `${partnerNickname}의 답변`
    : "연인의 답변";

  return (
    <main className="mx-auto w-full max-w-screen-lg px-4 md:px-6 py-6">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className="bg-white border shadow-sm">
          <CardHeader>
            <CardTitle className="pl-8">{myTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <MyAnswersCard />
          </CardContent>
        </Card>

        <Card className=" bg-white border shadow-sm">
          <CardHeader>
            <CardTitle className="pl-8">{partnerTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <MyPartnerAnswersCard />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
