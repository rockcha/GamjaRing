import potatoesBackground from "/potatoes-bg.png";
import MainHeader from "@/components/MainHeader";
import Sidebar from "@/components/Sidebar";
import PageTransition from "@/components/PageTransition";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#f6d7a7] to-[#fff3dc]
"
    >
      {/* 헤더는 고정 */}
      <MainHeader />

      {/* 전체 배경 적용 */}
      <div
        className="flex"
        style={{
          height: "calc(100vh )",
          backgroundImage: `url(${potatoesBackground})`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "bottom",
          overflow: "hidden", // 하단 넘치는 것도 잘라냄
        }}
      >
        {/* 오른쪽 콘텐츠 */}
        <div className="flex-1 px-4 py-6 overflow-hidden">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
        {/* 사이드바 */}
        <Sidebar />
      </div>
    </div>
  );
}
