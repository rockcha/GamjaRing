import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BoorishHeader from "@/components/SubHeader";
import { useUser } from "@/contexts/UserContext";
import PotatoButton from "@/components/widgets/PotatoButton";
import Popup from "@/components/widgets/Popup";
import supabase from "@/lib/supabase";

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

    // ✅ 1. 모든 칸 입력 확인
    if (!email || !nickname || !password || !confirmPassword) {
      setErrorMsg("모든 항목을 입력해주세요.");
      return;
    }

    // ✅ 2. 이메일 형식 확인
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg("유효한 이메일 형식이 아닙니다.");
      return;
    }

    // ✅ 3. 비밀번호 6자 이상
    if (password.length < 6) {
      setErrorMsg("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    // ✅ 4. 비밀번호 일치 확인
    if (password !== confirmPassword) {
      setErrorMsg("비밀번호가 일치하지 않습니다.");
      return;
    }

    // ✅ 5. 닉네임 중복 확인
    const { data: nicknameCheck, error: nicknameError } = await supabase
      .from("users")
      .select("id")
      .eq("nickname", nickname)
      .maybeSingle();

    if (nicknameError) {
      setErrorMsg("닉네임 중복 확인 중 오류가 발생했습니다.");
      return;
    }

    if (nicknameCheck) {
      setErrorMsg("이미 사용 중인 닉네임입니다.");
      return;
    }

    // ✅ 6. 회원가입 요청
    const { error } = await signup({ email, password, nickname });

    if (error) {
      if (error.message === "User already registered") {
        setErrorMsg("이미 가입된 이메일입니다.");
      } else {
        setErrorMsg("회원가입 중 오류가 발생했습니다.");
      }
      return;
    }

    navigate("/main");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3] px-4">
      <div className="w-full max-w-sm bg-white shadow-md rounded-xl p-6">
        <BoorishHeader title="가입하기" />

        <div className="flex flex-col items-center gap-8 mb-10 ">
          <div className="flex items-center gap-1">
            <span className="text-xl">🥔</span>
            <input
              type="text"
              placeholder="닉네임을 입력해주세요!"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full min-w-0 px-4 py-3 border border-[#e6ddd3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d7b89c]"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xl">🥔</span>
            <input
              type="email"
              placeholder="이메일을 입력해주세요!"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-w-0 px-4 py-3 border border-[#e6ddd3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d7b89c]"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xl">🥔</span>
            <input
              type="password"
              placeholder="비밀번호를 입력해주세요! (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-w-0 px-4 py-3 border border-[#e6ddd3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d7b89c]"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xl">🥔</span>
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full min-w-0 px-4 py-3 border border-[#e6ddd3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d7b89c]"
            />
          </div>

          {/* ✅ 에러 메시지 팝업 */}
          {errorMsg && (
            <Popup
              message={errorMsg}
              show={!!errorMsg}
              onClose={() => setErrorMsg("")}
            />
          )}

          <PotatoButton
            text="회원가입"
            emoji="✅"
            onClick={handleSignup}
            disabled={loading}
            loading={loading}
          />
        </div>

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
