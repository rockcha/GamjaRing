import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BoorishHeader from "@/components/SubHeader";
import { useUser } from "@/contexts/UserContext";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { signup, loading } = useUser();
  const navigate = useNavigate();

  const handleSignup = async () => {
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!nickname.trim()) {
      setErrorMsg("닉네임을 입력해주세요.");
      return;
    }

    const { error } = await signup({ email, password, nickname });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200 px-4">
      <div className="w-full max-w-sm bg-white shadow-md rounded-xl p-6">
        <BoorishHeader title="가입하기" />

        <div className="flex flex-col gap-8 mb-10 mt-6">
          <div className="flex items-center  gap-1">
            <span className="text-xl">🥔</span>
            <input
              type="text"
              placeholder="닉네임을 입력해주세요!"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="flex-1 px-4 py-3 border border-[#e6ddd3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d7b89c]"
            />
          </div>

          <div className="flex items-center  gap-1">
            <span className="text-xl">🥔</span>
            <input
              type="email"
              placeholder="이메일을 입력해주세요!"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 border border-[#e6ddd3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d7b89c]"
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xl">🥔</span>
            <input
              type="password"
              placeholder="비밀번호를 입력해주세요! (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 px-4 py-3 border border-[#e6ddd3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d7b89c]"
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xl">🥔</span>
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="flex-1 px-4 py-3 border border-[#e6ddd3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d7b89c]"
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-red-500 text-center">{errorMsg}</p>
          )}
        </div>

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-[#f4c989] hover:bg-[#e5b97e] text-brown-800 py-3 rounded-full font-semibold shadow-inner border border-[#e1b574] transition duration-200 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "가입 중..." : "🥔 가입하기"}
        </button>

        <div className="text-sm text-center text-[#8a6b50]">
          이미 계정이 있으신가요?{" "}
          <Link
            to="/login"
            className="underline font-semibold hover:text-[#6b4e2d]"
          >
            로그인하러 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
