// src/components/DaysTogetherBadge.tsx
"use client";

import { useCoupleContext } from "@/contexts/CoupleContext";
import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { Highlighter } from "@/components/magicui/highlighter";

type AnnotationAction =
  | "highlight"
  | "underline"
  | "box"
  | "circle"
  | "strike-through"
  | "bracket";

export default function DaysTogetherBadge() {
  const { couple, partnerId } = useCoupleContext();

  // 닉네임 상태
  const [partnerNickname, setPartnerNickname] = useState<string | null>(null);

  // 하이라이트 회전 인덱스 (⚠️ 훅은 항상 최상단에서!)
  const [idx, setIdx] = useState(0);

  // 하이라이트 액션 (as const로 고정)
  const ACTIONS = useMemo(
    () => ["circle", "box", "highlight", "underline"] as const,
    []
  );

  // 닉네임 로드 (항상 훅 호출, 내부에서 조건 가드)
  useEffect(() => {
    let cancelled = false;
    const fetchNickname = async () => {
      if (!partnerId) return;
      const { data } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", partnerId)
        .maybeSingle();
      if (!cancelled && data?.nickname) setPartnerNickname(data.nickname);
    };
    fetchNickname();
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  // 액션 회전 타이머 (항상 훅 호출, 내부에서 조건 가드)
  const ANIM_MS = 800; // Highlighter animationDuration
  const ITERS = 2; // Highlighter iterations
  const GAP_MS = 3000; // 액션 사이 쉬는 시간
  useEffect(() => {
    // 커플/닉네임/시작일이 있어야만 회전
    if (!couple?.started_at || !partnerNickname) return;

    const h = window.setTimeout(() => {
      setIdx((i) => (i + 1) % ACTIONS.length);
    }, ANIM_MS * ITERS + GAP_MS);

    return () => window.clearTimeout(h);
  }, [idx, ACTIONS.length, couple?.started_at, partnerNickname]);

  // 파생값 계산 (훅 아님)
  const daysTogether = useMemo(() => {
    if (!couple?.started_at) return null;
    const today = new Date();
    const anniversaryDate = new Date(couple.started_at);
    return Math.floor((+today - +anniversaryDate) / (1000 * 60 * 60 * 24)) + 1;
  }, [couple?.started_at]);

  // 현재 액션 (noUncheckedIndexedAccess 대응: 안전 기본값)
  const currentAction: AnnotationAction = ACTIONS[idx] ?? "highlight";

  const COLOR = "#F5D9B8";

  // ---- JSX 분기 (훅 호출 이후에만 return) ----
  if (!couple) {
    return (
      <div className="text-gray-500 text-base px-4 py-2 text-left">
        로그아웃 상태거나 함께하는 사람이 없어요 😢
      </div>
    );
  }

  if (!couple.started_at || !partnerNickname || daysTogether == null) {
    return (
      <div className="text-gray-700 text-base px-4 py-2 text-left">
        ?님과 함께한 지 ?일째
      </div>
    );
  }

  return (
    <p className="w-full text-left text-[20px] font-semibold text-[#5b3d1d]">
      <span className="font-bold text-[30px] text-[#b75e20]">
        {partnerNickname}
      </span>
      &nbsp;와 함께한 시간은&nbsp; &nbsp;
      <Highlighter
        key={currentAction} // 액션 변경 시 재마운트 → 재애니메이션
        action={currentAction}
        color={COLOR}
        strokeWidth={1.5}
        animationDuration={ANIM_MS}
        iterations={ITERS}
        padding={3}
        multiline={false}
        isView={false} // 항상 실행
      >
        <span className="font-extrabold text-[30px] text-[#b75e20]">
          {daysTogether}
        </span>
        일
      </Highlighter>
    </p>
  );
}
