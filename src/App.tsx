// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import { CoupleProvider } from "@/contexts/CoupleContext";

import { Toaster } from "./components/ui/sonner";

import PageLayout from "./components/layouts/PageLayout";
import AppInit from "./AppInit";

import { AnswersPage, AquariumPage } from "./pages";
import IntroPage from "@/pages/IntroPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import MainPage from "./pages/MainPage";
import ResetPasswardPage from "./pages/ResetPasswardPage";
import InfoPage from "./pages/InfoPage";
import SettingPage from "./pages/SettingPage";
import QuestionPage from "./pages/QuestionPage";
import CoupleSchedulerPage from "./pages/CoupleSchedulerPage";

import PotatoFieldPage from "./pages/PotatoFieldPage";
import KitchenPage from "./pages/KitchenPage";
import FishingPage from "./pages/FishingPage";
import OddEvenGamesPage from "./features/mini_games/OddEvenGamesPage";
import StickerBoardPage from "./features/sticker_board/StickerBoardPage";

import PartnerTimeCapsulesPage from "./pages/PartnerTimeCapsulesPage";
import ExchangePage from "./pages/ExchangePage";
import MiniGamePage from "./pages/MiniGamesPage";

export default function App() {
  return (
    <UserProvider>
      <CoupleProvider>
        <BrowserRouter>
          <AppInit />

          <Routes>
            <Route path="/" element={<Navigate to="/intro" replace />} />

            {/* 퍼블릭 */}
            <Route path="/intro" element={<IntroPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/auth/reset" element={<ResetPasswardPage />} />

            {/* 공통 레이아웃 */}
            <Route element={<PageLayout />}>
              <Route path="main" element={<MainPage />} />
              <Route path="info" element={<InfoPage />} />
              <Route path="settings" element={<SettingPage />} />
              <Route path="bundle" element={<AnswersPage />} />
              <Route path="scheduler" element={<CoupleSchedulerPage />} />
              <Route path="timeCapsule" element={<PartnerTimeCapsulesPage />} />
              <Route path="questions" element={<QuestionPage />} />
              <Route path="kitchen" element={<KitchenPage />} />
              <Route path="aquarium" element={<AquariumPage />} />
              <Route path="potatoField" element={<PotatoFieldPage />} />
              <Route path="fishing" element={<FishingPage />} />
              <Route path="oddEven" element={<OddEvenGamesPage />} />
              <Route path="stickerBoard" element={<StickerBoardPage />} />
              <Route path="miniGame" element={<MiniGamePage />} />
              <Route path="exchange" element={<ExchangePage />} />
            </Route>
          </Routes>

          {/* ✅ 여기! Routes 바깥에 전역으로 한 번만 */}
          <Toaster position="bottom-right" richColors />
        </BrowserRouter>
      </CoupleProvider>
    </UserProvider>
  );
}
