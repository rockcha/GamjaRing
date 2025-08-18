import potatoesBackground from "/potatoes-bg.png";
import MainHeader from "@/components/MainHeader";
import Navbar from "@/components/Navbar";
import PageTransition from "@/components/PageTransition";
import { Outlet } from "react-router-dom";
import AppInit from "@/AppInit";

export default function AppLayout() {
  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#f6d7a7] to-[#fff3dc]
    "
    >
      {/* 헤더는 고정 */}
      <MainHeader />
      <Navbar />
      <AppInit />
      {/* 전체 배경 적용 */}
      <div
        className="flex"
        style={{
          height: "calc(100vh - 90px)",
          backgroundImage: `url(${potatoesBackground})`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "bottom",
          overflow: "hidden", // 하단 넘치는 것도 잘라냄
        }}
      >
        <div className="flex-1 px-4 py-6 overflow-hidden">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </div>
    </div>
  );
}
