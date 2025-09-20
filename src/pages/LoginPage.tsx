// src/pages/LoginPage.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import supabase from "@/lib/supabase";
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
import { cn } from "@/lib/utils";

/* ▼ Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHandHoldingHeart, // 브랜드 타이틀용 (HeartHandshake 대체)
  faSpinner, // 로딩 스피너 (Loader2 대체)
  faEnvelope, // 메일 아이콘
  faLock, // 자물쇠
  faEye, // 비밀번호 보이기
  faEyeSlash, // 비밀번호 숨기기
  faCircleExclamation, // 경고(에러) 아이콘
} from "@fortawesome/free-solid-svg-icons";
/* ▲ Font Awesome */

const errorMessageMap: Record<string, string> = {
  "Invalid login credentials": "이메일 또는 비밀번호가 잘못되었습니다.",
  "User already registered": "이미 가입된 이메일입니다.",
  "Email not confirmed": "이메일 인증이 완료되지 않았습니다.",
  "Signup requires a valid email": "유효한 이메일을 입력해주세요.",
  "Password should be at least 6 characters":
    "비밀번호는 최소 6자 이상이어야 합니다.",
};

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [checking, setChecking] = useState(false);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const pwRef = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();
  const { login, loading } = useUser();

  const translateError = (msg: string): string =>
    errorMessageMap[msg] || "문제가 발생했습니다. 다시 시도해주세요.";

  const canSubmit = useMemo(
    () => !loading && !checking && isValidEmail(email) && password.length >= 6,
    [email, password, loading, checking]
  );

  const handleLogin = async () => {
    setErrorMsg("");
    setInfoMsg("");

    const { error } = await login(email.trim(), password);
    if (error) {
      const m = translateError(error.message);
      setErrorMsg(m);
      if (/이메일|가입|인증/.test(m)) emailRef.current?.focus();
      else pwRef.current?.focus();
      return;
    }
    setChecking(true);
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
      emailRef.current?.focus();
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

  // CapsLock 감지
  useEffect(() => {
    const el = pwRef.current;
    if (!el) return;
    const onKey = (ev: KeyboardEvent) => {
      const on = ev.getModifierState?.("CapsLock");
      setCapsOn(!!on);
    };
    el.addEventListener("keydown", onKey);
    el.addEventListener("keyup", onKey);
    return () => {
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("keyup", onKey);
    };
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3] px-4 py-8 sm:py-12">
      {/* 브랜드 타이틀 */}
      <div className="mb-4 flex items-center gap-2 text-[#5b3d1d]">
        <FontAwesomeIcon icon={faHandHoldingHeart} className="h-5 w-5" />
        <span className="text-sm font-medium">
          함께하는 우리의 놀이터, 감자링
        </span>
      </div>

      <Card className="w-full max-w-md shadow-lg border border-amber-200/40">
        <CardHeader className="text-center space-y-1">
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
            if (canSubmit) handleLogin();
          }}
          noValidate
        >
          <CardContent className="flex flex-col gap-6">
            {/* 이메일 */}
            <div className="grid gap-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8a6b50]"
                />
                <Input
                  ref={emailRef}
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="이메일을 입력해주세요"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || checking}
                  className="pl-9"
                  aria-invalid={!!errorMsg && !isValidEmail(email)}
                />
              </div>
            </div>

            {/* 비밀번호 */}
            <div className="grid gap-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faLock}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8a6b50]"
                />
                <Input
                  ref={pwRef}
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="비밀번호를 입력해주세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || checking}
                  className="pl-9 pr-9"
                  aria-invalid={!!errorMsg && password.length < 6}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit) handleLogin();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#8a6b50] hover:bg-amber-100/40"
                  aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보이기"}
                  tabIndex={-1}
                >
                  <FontAwesomeIcon
                    icon={showPw ? faEyeSlash : faEye}
                    className="h-4 w-4"
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={cn("text-xs text-red-600", !capsOn && "invisible")}
                >
                  CapsLock이 켜져 있어요
                </span>
                <button
                  type="button"
                  onClick={handleSendReset}
                  className="text-sm underline text-[#8a6b50] hover:text-[#6b4e2d]"
                >
                  비밀번호를 잊으셨나요?
                </button>
              </div>
            </div>

            {(errorMsg || infoMsg) && (
              <Alert
                variant={errorMsg ? "destructive" : "default"}
                role="status"
                aria-live="polite"
              >
                <AlertDescription className="flex items-center gap-2">
                  {errorMsg ? (
                    <FontAwesomeIcon
                      icon={faCircleExclamation}
                      className="h-4 w-4"
                    />
                  ) : null}
                  {errorMsg || infoMsg}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full active:scale-95 transition"
              disabled={!canSubmit}
            >
              {loading || checking ? (
                <>
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="mr-2 h-4 w-4 animate-spin"
                  />
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
