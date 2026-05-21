// src/pages/AnswersPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircleHeart, NotebookPen, Sparkles } from "lucide-react";

import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import MyAnswersCard from "@/components/MyAnswersCard";
import MyPartnerAnswersCard from "@/components/MyPartnerAnswersCard";
import AvatarWidget from "@/components/widgets/AvatarWidget";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function AnswersPage() {
  const { user } = useUser();
  const [partnerNickname, setPartnerNickname] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchPartnerNickname = async () => {
      if (!user?.partner_id) {
        if (mounted) setPartnerNickname(null);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", user.partner_id)
        .maybeSingle();

      if (!mounted) return;
      setPartnerNickname(!error && data ? (data.nickname ?? null) : null);
    };

    fetchPartnerNickname();
    return () => {
      mounted = false;
    };
  }, [user?.partner_id]);

  const partnerLabel = partnerNickname ?? "상대방";
  const pageDescription = useMemo(() => {
    if (!user?.nickname && !partnerNickname) {
      return "서로의 답변을 한눈에 모아보는 공간이에요.";
    }
    return `${user?.nickname ?? "나"}와 ${partnerLabel}의 답변을 한눈에 모아보세요.`;
  }, [partnerLabel, partnerNickname, user?.nickname]);

  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto flex w-full max-w-none flex-col gap-5 px-3 py-5 sm:px-4 md:gap-6 md:py-8 lg:px-6 2xl:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6 ">
          <AnswerPanel
            icon={<NotebookPen className="size-5" />}
            title="내 답변"
            description="내가 남긴 답변을 다시 읽고 수정할 수 있어요."
            badge={user?.nickname ?? "나"}
          >
            <MyAnswersCard />
          </AnswerPanel>

          <AnswerPanel
            icon={<MessageCircleHeart className="size-5" />}
            title={`${partnerLabel}의 답변`}
            description="상대방의 답변을 읽고 마음에 맞는 반응을 남겨보세요."
            badge={partnerLabel}
          >
            <MyPartnerAnswersCard />
          </AnswerPanel>
        </div>
      </div>
    </main>
  );
}

function AnswerPanel({
  icon,
  title,
  description,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border/80 bg-white shadow-sm">
      <CardHeader className="space-y-0 p-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg border bg-muted/50 text-rose-600">
              {icon}
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate text-lg tracking-normal">
                {title}
              </CardTitle>
              <CardDescription className="leading-5">
                {description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

export { AnswersPage };
