// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import { CoupleProvider } from "./contexts/CoupleContext";
import AppLayout from "@/layouts/AppLayout";

import IntroPage from "@/pages/IntroPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import MainPage from "@/pages/MainPage";

import CouplePage from "@/pages/CouplePage";
//import MyPage from "@/pages/MyPage";

export default function App() {
  return (
    <UserProvider>
      <CoupleProvider>
        <BrowserRouter>
          <Routes>
            {/* ✅ 인트로만 루트에서 처리 */}
            <Route path="/" element={<Navigate to="/intro" replace />} />
            <Route path="/intro" element={<IntroPage />} />

            {/* ✅ 헤더 없이 보여줄 페이지들 */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* ✅ 헤더 포함된 레이아웃 (MainHeader + Outlet) */}
            <Route element={<AppLayout />}>
              <Route path="/main" element={<MainPage />} />
              <Route path="/couple" element={<CouplePage />} />
              {/* <Route path="/mypage" element={<MyPage />} /> */}
            </Route>
          </Routes>
        </BrowserRouter>
      </CoupleProvider>
    </UserProvider>
  );
}
