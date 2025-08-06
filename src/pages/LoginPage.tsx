import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SubHeader from "@/components/SubHeader";
import { useUser } from "@/contexts/UserContext";
import PotatoButton from "@/components/widgets/PotatoButton";
import Popup from "@/components/widgets/Popup";

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

  const { login, user, loading } = useUser();

  const translateError = (msg: string): string => {
    return errorMessageMap[msg] || "문제가 발생했습니다. 다시 시도해주세요.";
  };

  const handleLogin = async () => {
    setErrorMsg("");

    const { error } = await login(email, password);

    if (error) {
      setErrorMsg(translateError(error.message));
      return;
    }

    navigate("/main");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200 px-4">
      <div className="w-full max-w-sm bg-white shadow-md rounded-xl p-6">
        <SubHeader title="로그인하기" />

        {/* 입력창 */}
        <div className="flex flex-col items-center gap-8 mb-10 ">
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
          <div className="flex items-center  gap-1">
            <span className="text-xl">🥔</span>
            <input
              type="password"
              placeholder="비밀번호를 입력해주세요!"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 px-4 py-3 border border-[#e6ddd3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d7b89c]"
            />
          </div>
          {errorMsg && (
            <Popup
              message={errorMsg}
              show={!!errorMsg}
              onClose={() => setErrorMsg("")}
            />
          )}
          <PotatoButton
            text="로그인"
            emoji="✅"
            onClick={handleLogin}
            disabled={loading}
            loading={loading}
          />
        </div>

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
