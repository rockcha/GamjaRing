// src/components/DaysTogetherBadge.tsx
"use client";

import { useCoupleContext } from "@/contexts/CoupleContext";
import { useEffect, useMemo, useState } from "react";
import { Highlighter } from "@/components/magicui/highlighter";
import CoupleHeartWidget from "@/components/widgets/CoupleHeartWidget";

type AnnotationAction =
  | "highlight"
  | "underline"
  | "box"
  | "circle"
  | "strike-through"
  | "bracket";

export default function DaysTogetherBadge() {
  const { couple } = useCoupleContext();

  // 하이라이트 회전 인덱스
  const [idx, setIdx] = useState(0);
  const ACTIONS = ["circle", "box", "highlight", "underline"] as const;

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

  const currentAction: AnnotationAction = ACTIONS[idx] ?? "highlight";
  const COLOR = "#F5D9B8";

  if (!couple) {
    return <div></div>;
  }

  if (!couple.started_at || daysTogether == null) {
    return <div className="text-gray-700 text-base">D+?일</div>;
  }

  return (
    <div className="w-full flex items-center gap-6">
      {/* 왼쪽: 커플 아바타 위젯 */}
      <CoupleHeartWidget size="sm" />

      {/* 오른쪽: D+일 */}
      <Highlighter
        key={currentAction}
        action={currentAction}
        color={COLOR}
        strokeWidth={1.5}
        animationDuration={ANIM_MS}
        iterations={ITERS}
        padding={5}
        multiline={false}
        isView={false}
      >
        <p className="text-left text-[20px] font-semibold text-[#5b3d1d]">
          함께한지{" "}
          <span className="font-extrabold text-[26px] text-[#b75e20]">
            {" "}
            {daysTogether}
          </span>
          일
        </p>
      </Highlighter>
    </div>
  );
}
