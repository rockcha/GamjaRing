// src/pages/LoginPage.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SubHeader from "@/components/SubHeader";
import { useUser } from "@/contexts/UserContext";
import PotatoButton from "@/components/widgets/PotatoButton";
import Popup from "@/components/widgets/Popup";
import PotatoLoading from "@/components/PotatoLoading";
import { runDataIntegrityCheck } from "@/utils/DataIntegrityCheck";
import supabase from "@/lib/supabase";

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
  const [infoMsg, setInfoMsg] = useState(""); // ✅ 전송 성공/안내 메시지
  const [checking, setChecking] = useState(false);

  const navigate = useNavigate();
  const { login, user, loading, fetchUser } = useUser();

  const translateError = (msg: string): string =>
    errorMessageMap[msg] || "문제가 발생했습니다. 다시 시도해주세요.";

  const handleLogin = async () => {
    setErrorMsg("");
    setInfoMsg("");

    const { error } = await login(email, password);
    if (error) {
      setErrorMsg(translateError(error.message));
      return;
    }

    setChecking(true);
    // try {
    //   const fetchedUser = await fetchUser();
    //   const userId =
    //     (fetchedUser as { id?: string } | null | undefined)?.id ?? user?.id;
    //   if (userId) await runDataIntegrityCheck(userId);
    // } finally {
    //   setChecking(false);
    // }
    navigate("/main");
  };

  // ✅ 비밀번호 재설정 메일 발송 (항상 입력창 먼저)
  const handleSendReset = async (
    e?: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ) => {
    e?.preventDefault(); // 폼 submit/링크 네비게이션 방지

    setErrorMsg("");
    setInfoMsg("");

    // 현재 이메일을 기본값으로 보여주기 (있으면)
    const suggested = email.trim();
    const input = window.prompt(
      "재설정 링크를 받을 이메일 주소를 입력하세요:",
      suggested
    );

    // 사용자가 취소하면 종료
    if (input === null) return;

    const addr = input.trim();
    if (!addr) {
      setErrorMsg("이메일을 입력해주세요.");
      return;
    }

    const origin = window.location.origin; // 예: http://localhost:5174
    const redirectTo = `${origin}/auth/reset`; // Supabase 대시보드에 허용 URL로 등록돼 있어야 함

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(addr, {
        redirectTo,
      });
      if (error) throw error;

      if (!email) setEmail(addr);
      setInfoMsg(
        "재설정 링크를 메일로 보냈어요. 메일함(스팸함 포함)을 확인해주세요!"
      );
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "재설정 메일 전송에 실패했습니다.";
      setErrorMsg(translateError(msg));
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3] px-4">
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

          {/* ✅ 비밀번호 재설정 링크 */}
          <div className="w-full -mt-4 text-right">
            <button
              type="button" // ← 중요: submit 방지
              onClick={handleSendReset}
              className="mt-2 text-sm underline text-[#8a6b50] hover:text-[#6b4e2d]"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>

          {(errorMsg || infoMsg) && (
            <Popup
              message={errorMsg || infoMsg}
              show={!!(errorMsg || infoMsg)}
              onClose={() => {
                setErrorMsg("");
                setInfoMsg("");
              }}
            />
          )}

          <PotatoButton
            text="로그인"
            emoji="✅"
            onClick={handleLogin}
            disabled={loading || checking}
            loading={loading || checking}
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
