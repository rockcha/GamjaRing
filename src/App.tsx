// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import { CoupleProvider } from "@/contexts/CoupleContext";
import { ToastProvider } from "@/contexts/ToastContext";

import PageLayout from "./components/layouts/PageLayout";
import AppInit from "./AppInit";
import IntroPage from "@/pages/IntroPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import MainPage from "./pages/MainPage";
import ResetPasswardPage from "./pages/ResetPasswardPage";
import InfoPage from "./pages/InfoPage";
import SettingPage from "./pages/SettingPage";
import NotificationPage from "./pages/NotificationPage";
import CoupleSchedulerPage from "./pages/CoupleSchedulerPage";
import AnswersPage from "./pages/AnswerPage";
import QuestionPage from "./pages/QuestionPage";

export default function App() {
  return (
    <ToastProvider>
      <UserProvider>
        <CoupleProvider>
          <BrowserRouter>
            <AppInit />
            <Routes>
              {/* 루트 → 인트로로 */}
              <Route path="/" element={<Navigate to="/intro" replace />} />

              {/* 퍼블릭(헤더/도크 없음) */}
              <Route path="/intro" element={<IntroPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/auth/reset" element={<ResetPasswardPage />} />

              {/* 공통 레이아웃(헤더 + NavDock) */}
              <Route element={<PageLayout />}>
                {/* ⛔ index 리다이렉트 삭제 */}
                <Route path="main" element={<MainPage />} />
                <Route path="info" element={<InfoPage />} />
                <Route path="settings" element={<SettingPage />} />
                <Route path="notifications" element={<NotificationPage />} />
                <Route path="bundle" element={<AnswersPage />} />
                <Route path="scheduler" element={<CoupleSchedulerPage />} />
                <Route path="questions" element={<QuestionPage />} />
              </Route>

              {/* 그 외 → 인트로 */}
              <Route path="*" element={<Navigate to="/intro" replace />} />
            </Routes>
          </BrowserRouter>
        </CoupleProvider>
      </UserProvider>
    </ToastProvider>
  );
}
