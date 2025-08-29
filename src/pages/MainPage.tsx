// src/pages/MainPages/MainPage.tsx
import { useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/contexts/ToastContext";

import SoloUserCard from "@/components/widgets/Cards/SoloUserCard";

import PotatoPokeButton from "@/components/widgets/PotatoPokeButton";

import CoupleImageCard from "@/components/widgets/Cards/CoupleImageCard";
import TodayQuestionCard from "@/components/widgets/Cards/TodayQuestionCard";
import CoupleSchedulePreview from "@/components/widgets/Cards/CoupleShedulePreview";
import CoupleMusicCard from "@/components/widgets/Cards/CoupleMusicCard";
import DailyFortuneCard from "@/features/fortune/DailyFortuneCard";

export default function MainPage() {
  const { isCoupled } = useUser();
  const { open } = useToast();

  useEffect(() => {
    open("환영합니다! 🥔 감자링에 오신 걸 환영해요.");
  }, [open]);

  // ✅ 솔로면 SoloUserCard만 표시
  if (!isCoupled) {
    return (
      <div className="w-full">
        <div className=" mx-auto ">
          <SoloUserCard />
        </div>
      </div>
    );
  }

  // ✅ 커플이면 기존 메인 레이아웃
  return (
    <div className="w-full">
      <div
        className="
          grid gap-2 items-start
          grid-cols-1
          md:[grid-template-columns:minmax(220px,1fr)_minmax(0,0.9fr)]
          lg:[grid-template-columns:minmax(260px,0.9fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]
        "
      >
        {/* 왼쪽 */}
        <div className="flex flex-col gap-2 min-w-0">
          <CoupleMusicCard />
          <DailyFortuneCard />
          <PotatoPokeButton />
          {/* <CouplePotatoCard className="w-full" /> */}
        </div>

        {/* 가운데: 커플 이미지 */}
        <div className="min-w-0">
          <CoupleImageCard
            className="
              w-full
              [&_img]:h-[620px]
            "
          />
        </div>

        {/* 오른쪽: 질문 + 일정 */}
        <div className="flex flex-col gap-2 min-w-0">
          <CoupleSchedulePreview limit={5} className="w-full h-fit" />
          <TodayQuestionCard className="w-full h-fit" />
        </div>
      </div>
    </div>
  );
}
