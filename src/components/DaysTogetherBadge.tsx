// src/components/DaysTogetherBadge.tsx
"use client";

import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import { useEffect, useMemo, useState } from "react";
import { Highlighter } from "@/components/magicui/highlighter";
import supabase from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";

export default function DaysTogetherBadge() {
  const { couple, partnerId } = useCoupleContext();
  const { user } = useUser();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [partnerNickname, setPartnerNickname] = useState<string | null>(null);

  // 파트너 닉네임 로딩(표시용)
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

  const myNickname =
    (user as any)?.user_metadata?.nickname ??
    (user as any)?.nickname ??
    (user as any)?.profile?.nickname ??
    (user as any)?.email?.split?.("@")?.[0] ??
    "나";
  const partnerLabel = partnerNickname ?? "상대";

  const daysTogether = useMemo(() => {
    if (!couple?.started_at) return null;
    const today = new Date();
    const start = new Date(couple.started_at);
    const start0 = new Date(start.toDateString()).getTime();
    const today0 = new Date(today.toDateString()).getTime();
    const diffDays = Math.floor((today0 - start0) / 86400000);
    return diffDays + 1;
  }, [couple?.started_at]);

  const ANIM_MS = 2800;
  const ITERS = 2;
  const GAP_MS = 3000;

  const ACTIONS = ["circle", "box", "highlight"] as const;
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!couple?.started_at) return;
    const h = window.setTimeout(() => {
      setIdx((i) => (i + 1) % ACTIONS.length);
    }, ANIM_MS * ITERS + GAP_MS);
    return () => window.clearTimeout(h);
  }, [idx, couple?.started_at]);
  const currentAction = ACTIONS[idx] ?? "highlight";
  const COLOR = "#F5D9B8";

  if (!couple) return <div />;

  return (
    <div className={"w-full px-4 py-3 mt-2"}>
      {/* 헤더 */}
      <div className="flex items-center justify-center gap-4 sm:gap-5">
        {/* 닉네임 섹션(이제 클릭 안 함) */}
        <div className="flex items-center gap-2 text-[#5b3d1d] min-w-0">
          <span className="text-[22px] sm:text-[32px] font-extrabold truncate">
            {myNickname}
          </span>
          <span className="animate-pulse select-none" aria-hidden>
            <FontAwesomeIcon
              icon={faHeart}
              className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px] text-rose-500"
            />
          </span>
          <span
            className={cn(
              "text-[22px] sm:text-[32px] font-extrabold truncate max-w-[40vw]"
            )}
            title={partnerLabel}
          >
            {partnerLabel}
          </span>
        </div>

        {/* 함께한 일수 하이라이트 */}
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
              <p className="text-[16px] sm:text-[20px] font-semibold text-[#5b3d1d] font-hand">
                함께한지
                <span className="mx-1 font-extrabold text-[30px] sm:text-[36px] text-[#b75e20] align-baseline">
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
