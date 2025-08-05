// src/App.tsx
import { Navigate, BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import PageTransition from "@/components/PageTransition";
import IntroPage from "@/pages/IntroPage";
import MainPage from "@/pages/MainPage";

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/intro" replace />} />
          <Route
            path="/login"
            element={
              <PageTransition>
                <LoginPage />
              </PageTransition>
            }
          />
          <Route
            path="/signup"
            element={
              <PageTransition>
                <SignupPage />
              </PageTransition>
            }
          />
          {/* 다른 페이지들도 동일하게 PageTransition으로 감싸기 */}

          <Route
            path="/main"
            element={
              <PageTransition>
                <MainPage />
              </PageTransition>
            }
          />
          <Route
            path="/intro"
            element={
              <PageTransition>
                <IntroPage />
              </PageTransition>
            }
          />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}
