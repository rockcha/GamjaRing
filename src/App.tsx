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
import CookingPage from "./pages/CookingPage";

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

              {/* 퍼블릭(헤더) */}
              <Route path="/intro" element={<IntroPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/auth/reset" element={<ResetPasswardPage />} />

              {/* 공통 레이아웃(헤더 ) */}
              <Route element={<PageLayout />}>
                <Route path="main" element={<MainPage />} />
                <Route path="info" element={<InfoPage />} />
                <Route path="settings" element={<SettingPage />} />
                <Route path="notifications" element={<NotificationPage />} />
                <Route path="bundle" element={<AnswersPage />} />
                <Route path="scheduler" element={<CoupleSchedulerPage />} />
                <Route path="questions" element={<QuestionPage />} />
                <Route path="kitchen" element={<CookingPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CoupleProvider>
      </UserProvider>
    </ToastProvider>
  );
}
