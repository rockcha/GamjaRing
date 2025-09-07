// src/components/DaysTogetherBadge.tsx
"use client";

import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import { useEffect, useMemo, useState } from "react";
import { Highlighter } from "@/components/magicui/highlighter";
import { Heart } from "lucide-react";
import supabase from "@/lib/supabase";

export default function DaysTogetherBadge() {
  const { couple, partnerId } = useCoupleContext();
  const { user } = useUser(); // ✅ 내 닉네임은 여기서!

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 파트너 닉네임 가져오기 (partnerId 기준)
  const [partnerNickname, setPartnerNickname] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!partnerId) {
          setPartnerNickname((couple as any)?.partner_nickname ?? null);
          return;
        }
        const { data, error } = await supabase
          .from("users")
          .select("nickname")
          .eq("id", partnerId)
          .single();
        if (!alive) return;
        if (error) {
          setPartnerNickname((couple as any)?.partner_nickname ?? null);
        } else {
          setPartnerNickname(
            data?.nickname ?? (couple as any)?.partner_nickname ?? null
          );
        }
      } catch {
        setPartnerNickname((couple as any)?.partner_nickname ?? null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [partnerId, (couple as any)?.partner_nickname]);

  // 하이라이트 회전 인덱스
  const [idx, setIdx] = useState(0);
  const ACTIONS = ["circle", "box", "highlight"] as const;

  // 함께한 일수 계산
  const daysTogether = useMemo(() => {
    if (!couple?.started_at) return null;
    const today = new Date();
    const start = new Date(couple.started_at);
    const start0 = new Date(start.toDateString()).getTime();
    const today0 = new Date(today.toDateString()).getTime();
    const diffDays = Math.floor((today0 - start0) / 86400000);
    return diffDays + 1; // 하루부터 시작
  }, [couple?.started_at]);

  // 액션 회전 타이머
  const ANIM_MS = 2800;
  const ITERS = 2;
  const GAP_MS = 3000;
  useEffect(() => {
    if (!couple?.started_at) return;
    const h = window.setTimeout(() => {
      setIdx((i) => (i + 1) % ACTIONS.length);
    }, ANIM_MS * ITERS + GAP_MS);
    return () => window.clearTimeout(h);
  }, [idx, couple?.started_at]);

  const currentAction = ACTIONS[idx] ?? "highlight";
  const COLOR = "#F5D9B8"; // 포근한 포테이토 베이지

  if (!couple) return <div />;

  // ✅ 내 닉네임: useUser()의 user에서 안전하게 추출
  const myNickname =
    (user as any)?.user_metadata?.nickname ??
    (user as any)?.nickname ??
    (user as any)?.profile?.nickname ??
    (user as any)?.email?.split?.("@")?.[0] ??
    "나";

  const partnerLabel = partnerNickname ?? "상대";

  // 카드형 가로 배치
  return (
    <div className={"w-full  px-4 py-3 mt-2"}>
      <div className="flex items-center justify-center gap-3">
        {/* 닉네임 ♥ 닉네임 */}
        <div className="flex items-center gap-2 text-[#5b3d1d] min-w-0">
          <span className="text-[18px] sm:text-[24px] font-extrabold truncate">
            {myNickname}
          </span>
          <Heart
            className="h-5 w-5 sm:h-5 sm:w-5 text-rose-500 fill-rose-400 animate-pulse"
            aria-hidden
          />
          <span className="text-[18px] sm:text-[24px] font-extrabold truncate max-w-[40vw]">
            {partnerLabel}
          </span>
        </div>

        {/* 세로 구분선 (넓은 화면에서만) */}
        <div className="hidden sm:block h-8 w-px bg-amber-200/70" aria-hidden />

        {/* 함께한지 N일 (하이라이터) */}
        <div className="flex-shrink-0">
          {mounted ? (
            <Highlighter
              key={currentAction}
              action={currentAction as any}
              color={COLOR}
              strokeWidth={1.7}
              animationDuration={ANIM_MS}
              iterations={ITERS}
              padding={10}
              multiline={false}
              isView={false}
            >
              <p className="text-[16px] sm:text-[20px] font-semibold text-[#5b3d1d]">
                함께한지
                <span className="mx-1 font-extrabold text-[22px] sm:text-[28px] text-[#b75e20] align-baseline">
                  {daysTogether ?? "?"}
                </span>
                일
              </p>
            </Highlighter>
          ) : (
            <p className="text-[16px] sm:text-[18px] font-semibold text-[#5b3d1d]">
              함께한지{" "}
              <span className="font-extrabold text-[22px] sm:text-[24px] text-[#b75e20]">
                …
              </span>
              일
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
