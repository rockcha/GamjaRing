import { useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/contexts/ToastContext";
import DevNotice from "@/components/DevNotice";
import CoupleSchedulePreview from "@/components/CoupleShedulePreview";

import CoupleMainPage from "./CoupleMainPage";
import SoloMainPage from "./SoloMainPage";
import HeroSection from "@/components/HeroSection";
import HeroSection2 from "@/components/HeroSection2";
import { DevNotices } from "@/constants/DevNotices";
export default function MainPage() {
  const { user, isCoupled, loading } = useUser();
  const { open } = useToast();

  useEffect(() => {
    open("환영합니다! 🥔 감자링에 오신 걸 환영해요.");
    console.log(new Date().toLocaleDateString("sv-SE"));
  }, [open]);

  const CenterContent = isCoupled ? <CoupleMainPage /> : <SoloMainPage />;

  return (
    <div className="min-h-screen ">
      {/* 메인 영역 */}
      <div className="  fixed top-[350px] right-[1%]  z-50 w-[350px] max-w-2xl ">
        <DevNotice notes={DevNotices} defaultOpen={true} />
      </div>
      <div className="   fixed top-[350px]  z-50 w-[350px] max-w-2xl ">
        <CoupleSchedulePreview limit={3} />
      </div>

      <section className="max-w-6xl mx-auto px-4 pt-36">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(0,420px)_1fr] gap-10 items-start relative z-0 ">
          {/* 왼쪽: Hero1 */}
          <div className="min-w-0">
            <HeroSection />
          </div>

          {/* 가운데: 메인 */}
          <div className="min-w-0">
            <div className="max-w-md mx-auto w-full">
              {loading ? (
                <div className="h-40 rounded-xl border   animate-pulse" />
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
