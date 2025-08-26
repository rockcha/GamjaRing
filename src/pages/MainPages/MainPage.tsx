// src/pages/MainPages/MainPage.tsx
import { useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/contexts/ToastContext";

import PotatoPokeButton from "@/components/widgets/PotatoPokeButton";
import SadPotatoGuard from "@/components/SadPotatoGuard";
import CouplePotatoCard from "@/components/widgets/Cards/CouplePotatoCard";
import CoupleImageCard from "@/components/widgets/Cards/CoupleImageCard";
import TodayQuestionCard from "@/components/widgets/Cards/TodayQuestionCard";
import CoupleSchedulePreview from "@/components/widgets/Cards/CoupleShedulePreview";

export default function MainPage() {
  const { isCoupled } = useUser();
  const { open } = useToast();

  useEffect(() => {
    open("환영합니다! 🥔 감자링에 오신 걸 환영해요.");
  }, [open]);

  return (
    <div className="w-full">
      {/* 
        반응형 컬럼 비율
        - 모바일: 1열
        - md: 왼(작게 0.9fr) | 가운데(크게 1.3fr)
        - xl: 왼(0.8fr) | 가운데(2fr) | 오른쪽(1.1fr)
      */}
      <div
        className="
  grid gap-4 items-start
  grid-cols-1
  md:[grid-template-columns:minmax(220px,.9fr)_minmax(0,1.3fr)]
  lg:[grid-template-columns:minmax(240px,.8fr)_minmax(0,2fr)_minmax(0,1.1fr)]   
"
      >
        {/* 왼쪽: 포크 버튼 + 감자 진행 카드 (상대적으로 좁은 컬럼) */}
        <div className="flex flex-col gap-4 min-w-0">
          {isCoupled ? (
            <PotatoPokeButton className="w-full" />
          ) : (
            <SadPotatoGuard className="w-full" />
          )}
          <CouplePotatoCard className="w-full" />
        </div>

        {/* 가운데: 커플 이미지(메인 비중 가장 크게) */}
        <div className="min-w-0">
          <CoupleImageCard
            className="
              w-full
              /* 이미지 프레임/이미지 높이 보정: 화면 커질수록 더 크게 */
              [&_img]:h-[520px]
      
            "
          />
        </div>

        {/* 오른쪽: 오늘의 질문 + 일정 미리보기 (xl 이상에서 독립 컬럼) */}
        <div className="flex flex-col gap-4 min-w-0">
          <TodayQuestionCard className="w-full h-fit" />
          <CoupleSchedulePreview limit={5} className="w-full h-fit" />
        </div>
      </div>
    </div>
  );
}
