import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SubHeader from "@/components/SubHeader";
import { useUser } from "@/contexts/UserContext";
import PotatoButton from "@/components/widgets/PotatoButton";
import Popup from "@/components/widgets/Popup";
import PotatoLoading from "@/components/PotatoLoading"; //
import { runDataIntegrityCheck } from "@/utils/DataIntegrityCheck";

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
  const [checking, setChecking] = useState(false); //

  const navigate = useNavigate();
  const { login, user, loading, fetchUser } = useUser();

  const translateError = (msg: string): string =>
    errorMessageMap[msg] || "문제가 발생했습니다. 다시 시도해주세요.";

  const handleLogin = async () => {
    setErrorMsg("");

    // 1) 로그인
    const { error } = await login(email, password);
    if (error) {
      setErrorMsg(translateError(error.message));
      return;
    }

    // 2) 유저 최신화 + 무결성 체크 (로딩 오버레이 ON)
    setChecking(true);
    try {
      const fetchedUser = await fetchUser(); // ⚠️ fetchUser가 값을 반환하지 않으면 컨텍스트의 user를 사용
      const userId = (fetchedUser as any)?.id ?? user?.id;
      if (userId) {
        await runDataIntegrityCheck(userId);
      } else {
        console.warn("❌ 유저 정보 로드 실패");
      }
    } finally {
      setChecking(false);
    }

    // 3) 이동
    navigate("/main");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3] px-4">
      {/* ✅ 무결성 체크 중 오버레이 */}
      {checking && (
        <div className="fixed inset-0 z-50">
          <PotatoLoading />
        </div>
      )}

      <div className="w-full max-w-sm bg-white shadow-md rounded-xl p-6">
        <SubHeader title="로그인하기" />

        <div className="flex flex-col items-center gap-8 mb-10">
          <div className="flex items-center gap-1 w-full">
            <span className="text-xl">🥔</span>
            <input
              type="email"
              placeholder="이메일을 입력해주세요!"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 border border-[#e6ddd3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d7b89c]"
            />
          </div>

          <div className="flex items-center gap-1 w-full">
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
            disabled={loading || checking} // ✅ 체크 중 비활성화
            loading={loading || checking} // ✅ 버튼 로딩도 같이 표시
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
