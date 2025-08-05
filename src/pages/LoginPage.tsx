import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BoorishHeader from "@/components/SubHeader";
import { useUser } from "@/contexts/UserContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const { login, user, loading } = useUser();

  const handleLogin = async () => {
    setErrorMsg("");

    const { error } = await login(email, password);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    navigate("/intro");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200 px-4">
      <div className="w-full max-w-sm bg-white shadow-md rounded-xl p-6">
        <BoorishHeader title="로그인하기" />

        {/* 입력창 */}
        <div className="flex flex-col gap-8 mb-10 mt-6">
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
            <p className="text-sm text-red-500 text-center">{errorMsg}</p>
          )}
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-[#f4c989] hover:bg-[#e5b97e] text-brown-800 py-3 rounded-full font-semibold shadow-inner border border-[#e1b574] transition duration-200 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "로딩 중..." : "🥔 로그인하기"}
        </button>

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
