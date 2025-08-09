import { useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/contexts/ToastContext";
import DevNotice from "@/components/DevNotice";
import type { DevNote } from "@/components/DevNotice";
import CoupleMainPage from "./CoupleMainPage";
import SoloMainPage from "./SoloMainPage";
import HeroSection from "@/components/HeroSection";
import HeroSection2 from "@/components/HeroSection2";

export default function MainPage() {
  const notes: DevNote[] = [
    {
      id: "1",
      title: "커플 등록 이슈",
      description: "로그아웃 후 재접하면 적용됩니다.",
      severity: "info",
      date: "2025-08-09",
    },
    {
      id: "2",
      title: "감자 찌르기 이슈",
      description: "내가 찔렀는데 상대가 찔렀다고 가는듯? 알림이 이상하게 감.",
      severity: "info",
      date: "2025-08-09",
    },
    {
      id: "3",
      title: "무결성 체크 간헐적 실패",
      description: "로그인 직후 fetchUser race condition 조사 중",
      severity: "critical",
      date: "2025-08-09",
    },
    {
      id: "4",
      title: "답변 보기 기능 이슈",
      description: "내가 답변 안했을 시 상대방 답변 못보게하는 기능 추가 예정",
      severity: "warning",
      date: "2025-08-09",
    },
  ];

  const { user, isCoupled, loading } = useUser();
  const { open } = useToast();

  useEffect(() => {
    open("환영합니다! 🥔 감자링에 오신 걸 환영해요.");
  }, [open]);

  const CenterContent = isCoupled ? <CoupleMainPage /> : <SoloMainPage />;

  return (
    <div className="min-h-screen ">
      {/* ✅ DevNotice: 고정 오버레이 (레이아웃 밀지 않음) */}
      <div className="fixed left-1/2 -translate-x-1/2 ml-[-450px] mt-[-300px] w-[500px] max-w-[92vw] z-50 pointer-events-none">
        {/* 공지 내부는 클릭 가능하도록 */}
        <div className="pointer-events-auto">
          <DevNotice notes={notes} />
        </div>
      </div>

      {/* 메인 영역 */}
      <section className="max-w-6xl mx-auto px-4 pt-36">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(0,420px)_1fr] gap-6 items-start relative z-0">
          {/* 왼쪽: Hero1 */}
          <div className="min-w-0">
            <HeroSection />
          </div>

          {/* 가운데: 메인 */}
          <div className="min-w-0">
            <div className="max-w-md mx-auto w-full">
              {loading ? (
                <div className="h-40 rounded-xl border border-amber-200/60 bg-amber-50/30 animate-pulse" />
              ) : (
                CenterContent
              )}
            </div>
          </div>

          {/* 오른쪽: Hero2 */}
          <div className="min-w-0">
            <HeroSection2 />
          </div>
        </div>
      </section>
    </div>
  );
}
