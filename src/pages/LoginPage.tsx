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
  const [infoMsg, setInfoMsg] = useState("");
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
    // 필요한 경우 데이터 정합성 체크 로직 복원
    // try {
    //   const fetchedUser = await fetchUser();
    //   const userId = (fetchedUser as { id?: string } | null | undefined)?.id ?? user?.id;
    //   if (userId) await runDataIntegrityCheck(userId);
    // } finally {
    //   setChecking(false);
    // }
    navigate("/main");
  };

  const handleSendReset = async (
    e?: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ) => {
    e?.preventDefault();

    setErrorMsg("");
    setInfoMsg("");

    const suggested = email.trim();
    const input = window.prompt(
      "재설정 링크를 받을 이메일 주소를 입력하세요:",
      suggested
    );
    if (input === null) return;

    const addr = input.trim();
    if (!addr) {
      setErrorMsg("이메일을 입력해주세요.");
      return;
    }

    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/reset`;

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
    <div
      className="
        relative min-h-dvh
        flex items-center justify-center
        bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3]
        px-4 py-8 sm:py-12
      "
    >
      {checking && (
        <div className="fixed inset-0 z-50">
          <PotatoLoading />
        </div>
      )}

      {/* 카드: 모바일 전체폭에 가깝게, md에서 고정폭 */}
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-5 sm:p-6">
        <SubHeader title="로그인하기" />

        {/* 폼으로 감싸서 Enter 제출 가능 + 모바일 키보드 대응 */}
        <form
          className="flex flex-col items-stretch gap-6 sm:gap-8 mb-8"
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          {/* 이메일 */}
          <label className="w-full">
            <span className="sr-only">이메일</span>
            <div className="flex items-center gap-2 w-full">
              <span aria-hidden className="text-xl">
                🥔
              </span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="이메일을 입력해주세요!"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="
                  flex-1 px-4 py-3 text-base
                  border border-[#e6ddd3] rounded-md
                  bg-white
                  focus:outline-none focus:ring-2 focus:ring-[#d7b89c]
                "
              />
            </div>
          </label>

          {/* 비밀번호 */}
          <label className="w-full">
            <span className="sr-only">비밀번호</span>
            <div className="flex items-center gap-2 w-full">
              <span aria-hidden className="text-xl">
                🥔
              </span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="비밀번호를 입력해주세요!"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="
                  flex-1 px-4 py-3 text-base
                  border border-[#e6ddd3] rounded-md
                  bg-white
                  focus:outline-none focus:ring-2 focus:ring-[#d7b89c]
                "
              />
            </div>
          </label>

          {/* 비밀번호 재설정 */}
          <div className="w-full -mt-2 text-right">
            <button
              type="button"
              onClick={handleSendReset}
              className="mt-1 text-sm underline text-[#8a6b50] hover:text-[#6b4e2d]"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>

          {(errorMsg || infoMsg) && (
            <div className="w-full">
              <Popup
                message={errorMsg || infoMsg}
                show={!!(errorMsg || infoMsg)}
                onClose={() => {
                  setErrorMsg("");
                  setInfoMsg("");
                }}
              />
            </div>
          )}

          {/* 로그인 버튼: 모바일 여백 확보 */}
          <div className="flex justify-center pt-2">
            <PotatoButton
              text="로그인"
              emoji="✅"
              onClick={handleLogin}
              disabled={loading || checking}
              loading={loading || checking}
            />
          </div>
        </form>

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
