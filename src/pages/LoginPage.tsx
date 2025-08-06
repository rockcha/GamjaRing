import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SubHeader from "@/components/SubHeader";
import { useUser } from "@/contexts/UserContext";
import PotatoButton from "@/components/widgets/PotatoButton";
import Popup from "@/components/widgets/Popup";
import { CheckAndResetDailyTask } from "@/utils/notifications/tasks/CheckAndResetDailyTask";

// 에러 메시지 번역 맵
const errorMessageMap: Record<string, string> = {
  "Invalid login credentials": "이메일 또는 비밀번호가 잘못되었습니다.",
  "User already registered": "이미 가입된 이메일입니다.",
  "Email not confirmed": "이메일 인증이 완료되지 않았습니다.",
  "Signup requires a valid email": "유효한 이메일을 입력해주세요.",
  "Password should be at least 6 characters":
    "비밀번호는 최소 6자 이상이어야 합니다.",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();
  const { login, user, loading, fetchUser } = useUser(); // ✅ fetchUser도 필요

  // 🔁 Supabase 에러 메시지를 한글로 변환
  const translateError = (msg: string): string => {
    return errorMessageMap[msg] || "문제가 발생했습니다. 다시 시도해주세요.";
  };

  // ✅ 로그인 처리 함수
  const handleLogin = async () => {
    setErrorMsg("");

    // 1. 로그인 시도
    const { error } = await login(email, password);
    if (error) {
      setErrorMsg(translateError(error.message));
      return;
    }

    // 2. 유저 정보 가져오기 (리턴값 사용!)
    const fetchedUser = await fetchUser();

    if (fetchedUser) {
      await CheckAndResetDailyTask(fetchedUser.id, fetchedUser.couple_id);
    } else {
      console.warn("❌ 유저 정보 로드 실패");
    }

    // 3. 메인 페이지로 이동
    navigate("/main");
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3] px-4">
      <div className="w-full max-w-sm bg-white shadow-md rounded-xl p-6">
        <SubHeader title="로그인하기" />

        {/* 이메일/비밀번호 입력 */}
        <div className="flex flex-col items-center gap-8 mb-10">
          <div className="flex items-center gap-1">
            <span className="text-xl">🥔</span>
            <input
              type="email"
              placeholder="이메일을 입력해주세요!"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 border border-[#e6ddd3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d7b89c]"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xl">🥔</span>
            <input
              type="password"
              placeholder="비밀번호를 입력해주세요!"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 px-4 py-3 border border-[#e6ddd3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d7b89c]"
            />
          </div>

          {/* 에러 메시지 표시 */}
          {errorMsg && (
            <Popup
              message={errorMsg}
              show={!!errorMsg}
              onClose={() => setErrorMsg("")}
            />
          )}

          {/* 로그인 버튼 */}
          <PotatoButton
            text="로그인"
            emoji="✅"
            onClick={handleLogin}
            disabled={loading}
            loading={loading}
          />
        </div>

        {/* 회원가입 링크 */}
        <div className="text-sm text-center text-[#8a6b50]">
          계정이 없으신가요?{" "}
          <Link
            to="/signup"
            className="underline font-semibold hover:text-[#6b4e2d]"
          >
            회원가입하러 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
