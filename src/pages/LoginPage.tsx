// src/pages/LoginPage.tsx
"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { runDataIntegrityCheck } from "@/utils/DataIntegrityCheck";
import supabase from "@/lib/supabase";

// shadcn/ui
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

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
    // (선택) 데이터 정합성 체크
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
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3] px-4 py-8 sm:py-12">
      <Card className="w-full max-w-md shadow-lg border border-amber-200/40">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-[#5b3d1d]">
            로그인
          </CardTitle>
          <CardDescription className="text-[#8a6b50]">
            감자링을 시작해보세요
          </CardDescription>
        </CardHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <CardContent className="flex flex-col gap-6">
            {/* 이메일 */}
            <div className="grid gap-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="이메일을 입력해주세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || checking}
              />
            </div>

            {/* 비밀번호 */}
            <div className="grid gap-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="비밀번호를 입력해주세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || checking}
              />
              <button
                type="button"
                onClick={handleSendReset}
                className="text-sm underline text-[#8a6b50] hover:text-[#6b4e2d] self-end"
              >
                비밀번호를 잊으셨나요?
              </button>
            </div>

            {/* 알림 */}
            {(errorMsg || infoMsg) && (
              <Alert variant={errorMsg ? "destructive" : "default"}>
                <AlertDescription>{errorMsg || infoMsg}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || checking}
            >
              {loading || checking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                "로그인"
              )}
            </Button>

            <div className="text-sm text-center text-[#8a6b50]">
              계정이 없으신가요?{" "}
              <Link
                to="/signup"
                className="underline font-semibold hover:text-[#6b4e2d]"
              >
                회원가입하러 가기
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
