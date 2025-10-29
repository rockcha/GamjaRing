// src/pages/SignupPage.tsx
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

/* ✅ Font Awesome 아이콘 */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHandHoldingHeart,
  faSpinner,
  faEnvelope,
  faLock,
  faEye,
  faEyeSlash,
  faUser,
  faCircleExclamation,
  faCircleCheck,
  faCircleXmark,
  faHeartPulse,
  faKey,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function pwScore(pw: string) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4); // 0~4
}

export default function SignupPage() {
  // 🔐 감자링 키 입력/검증 상태
  const [keyInput, setKeyInput] = useState("");
  const [keyVerified, setKeyVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [keyMsg, setKeyMsg] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [nickState, setNickState] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  const emailRef = useRef<HTMLInputElement | null>(null);
  const pwRef = useRef<HTMLInputElement | null>(null);
  const nickRef = useRef<HTMLInputElement | null>(null);
  const keyRef = useRef<HTMLInputElement | null>(null);

  const { signup, loading } = useUser();
  const navigate = useNavigate();

  const emailOk = isValidEmail(email);
  const pwOk = password.length >= 6;
  const matchOk = password === confirmPassword && confirmPassword.length > 0;
  const nickOk = nickname.trim().length >= 2 && nickState === "available";
  const strength = pwScore(password);

  // ✅ 키 검증이 통과해야 submit 가능
  const canSubmit = useMemo(
    () => keyVerified && !loading && emailOk && pwOk && matchOk && nickOk,
    [keyVerified, loading, emailOk, pwOk, matchOk, nickOk]
  );

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

  // 닉네임 중복 체크 (디바운스) — 키 검증 전엔 굳이 조회하지 않음
  useEffect(() => {
    if (!keyVerified) {
      setNickState("idle");
      return;
    }
    const n = nickname.trim();
    if (n.length < 2) {
      setNickState("idle");
      return;
    }
    let cancelled = false;
    setNickState("checking");
    const t = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("nickname", n);
        if (cancelled) return;
        if (error) {
          setNickState("idle");
          return;
        }
        const { data: hit } = await supabase
          .from("users")
          .select("id")
          .eq("nickname", n)
          .maybeSingle();
        setNickState(hit ? "taken" : "available");
      } catch {
        if (!cancelled) setNickState("idle");
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [nickname, keyVerified]);

  // 🔐 감자링 키 검증
  const handleVerifyKey = async () => {
    setErrorMsg("");
    setKeyMsg(null);

    const input = keyInput.trim();
    if (!input) {
      setKeyMsg("키 번호를 입력해주세요.");
      keyRef.current?.focus();
      return;
    }

    setVerifying(true);
    try {
      // 단일 키 테이블에서 값 조회
      const { data, error } = await supabase
        .from("potatoring_key")
        .select("key_value")
        .single();

      if (error) {
        setKeyMsg("키 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      if (data?.key_value === input) {
        setKeyVerified(true);
        setKeyMsg("인증되었습니다. 아래 정보를 입력해주세요!");
      } else {
        setKeyVerified(false);
        setKeyMsg("키 번호가 올바르지 않습니다.");
        keyRef.current?.focus();
      }
    } catch {
      setKeyMsg("인증 중 오류가 발생했습니다.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSignup = async () => {
    setErrorMsg("");

    if (!keyVerified) {
      setErrorMsg("먼저 운영자에게 받은 감자링 키를 인증해주세요.");
      keyRef.current?.focus();
      return;
    }
    if (!emailOk) {
      setErrorMsg("유효한 이메일 형식이 아닙니다.");
      emailRef.current?.focus();
      return;
    }
    if (!pwOk) {
      setErrorMsg("비밀번호는 최소 6자 이상이어야 합니다.");
      pwRef.current?.focus();
      return;
    }
    if (!matchOk) {
      setErrorMsg("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!nickOk) {
      setErrorMsg(
        nickState === "taken"
          ? "이미 사용 중인 닉네임입니다."
          : "닉네임을 확인해주세요."
      );
      nickRef.current?.focus();
      return;
    }

    const { error } = await signup({
      email: email.trim(),
      password,
      nickname: nickname.trim(),
    });
    if (error) {
      setErrorMsg(
        error.message === "User already registered"
          ? "이미 가입된 이메일입니다."
          : "회원가입 중 오류가 발생했습니다."
      );
      return;
    }
    navigate("/main");
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3] px-4 py-8 sm:py-12">
      <div className="mb-4 flex items-center gap-2 text-[#5b3d1d]">
        <FontAwesomeIcon icon={faHeartPulse} className="h-5 w-5" />
        <span className="text-sm font-medium">
          함께하는 우리의 놀이터, 감자링
        </span>
      </div>

      <Card className="w-full max-w-md shadow-lg border border-amber-200/40">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-[#5b3d1d]">
            회원가입
          </CardTitle>
          <CardDescription className="text-[#8a6b50]">
            감자링과 함께해요
          </CardDescription>
        </CardHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading) handleSignup();
          }}
          noValidate
        >
          <CardContent className="flex flex-col gap-6">
            {/* 🔐 감자링 키 인증 섹션 */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="potatoring-key"
                  className="inline-flex items-center gap-2"
                >
                  <FontAwesomeIcon
                    icon={faShieldHalved}
                    className="h-4 w-4 text-[#8a6b50]"
                  />
                  감자링 키
                </Label>
                <span className="text-[11px] text-[#8a6b50]"></span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FontAwesomeIcon
                    icon={faKey}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8a6b50]"
                    aria-hidden
                  />
                  <Input
                    ref={keyRef}
                    id="potatoring-key"
                    placeholder="운영자에게 키 번호를 받아야 가입이 가능합니다."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    disabled={keyVerified || verifying || loading}
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleVerifyKey}
                  disabled={
                    keyVerified || verifying || loading || !keyInput.trim()
                  }
                  className="shrink-0"
                >
                  {verifying ? (
                    <>
                      <FontAwesomeIcon
                        icon={faSpinner}
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden
                      />
                      인증 중...
                    </>
                  ) : keyVerified ? (
                    <>
                      <FontAwesomeIcon
                        icon={faCircleCheck}
                        className="mr-2 h-4 w-4"
                        aria-hidden
                      />
                      인증 완료
                    </>
                  ) : (
                    "인증"
                  )}
                </Button>
              </div>
              {keyMsg && (
                <div
                  className={cn(
                    "text-xs",
                    keyVerified ? "text-emerald-700" : "text-red-600"
                  )}
                >
                  {keyMsg}
                </div>
              )}
            </div>

            {/* 닉네임 */}
            <div className="grid gap-2 opacity-100">
              <Label htmlFor="nickname">닉네임</Label>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faUser}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8a6b50]"
                  aria-hidden
                />
                <Input
                  ref={nickRef}
                  id="nickname"
                  type="text"
                  autoComplete="nickname"
                  placeholder="닉네임을 입력해주세요 (2자 이상)"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  disabled={!keyVerified || loading}
                  className="pl-9 pr-10"
                  aria-invalid={nickState === "taken"}
                />
                {/* 상태 아이콘 */}
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  {keyVerified && nickState === "checking" && (
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="h-4 w-4 animate-spin text-[#8a6b50]"
                      aria-hidden
                    />
                  )}
                  {keyVerified && nickState === "available" && (
                    <FontAwesomeIcon
                      icon={faCircleCheck}
                      className="h-4 w-4 text-emerald-600"
                      aria-hidden
                    />
                  )}
                  {keyVerified && nickState === "taken" && (
                    <FontAwesomeIcon
                      icon={faCircleXmark}
                      className="h-4 w-4 text-red-600"
                      aria-hidden
                    />
                  )}
                </span>
              </div>
              <p className="text-[11px] text-[#8a6b50]">
                커플에게도 보여요. 특별한 닉네임이면 더 좋아요 ✨
              </p>
            </div>

            {/* 이메일 */}
            <div className="grid gap-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8a6b50]"
                  aria-hidden
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
                  disabled={!keyVerified || loading}
                  className="pl-9"
                  aria-invalid={!!email && !emailOk}
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
                  aria-hidden
                />
                <Input
                  ref={pwRef}
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="비밀번호를 입력해주세요 (6자 이상)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!keyVerified || loading}
                  className="pl-9 pr-9"
                  aria-invalid={!!password && !pwOk}
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
                    aria-hidden
                  />
                </button>
              </div>

              {/* 강도 바 */}
              <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    strength <= 1 && "bg-rose-400",
                    strength === 2 && "bg-amber-400",
                    strength >= 3 && "bg-emerald-500"
                  )}
                  style={{ width: `${(strength / 4) * 100}%` }}
                  aria-hidden
                />
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={cn("text-xs text-red-600", !capsOn && "invisible")}
                >
                  CapsLock이 켜져 있어요
                </span>
                <span className="text-[11px] text-[#8a6b50]">
                  영문 대/소문자, 숫자, 기호를 섞으면 더 안전해요
                </span>
              </div>
            </div>

            {/* 비밀번호 확인 */}
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faLock}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8a6b50]"
                  aria-hidden
                />
                <Input
                  id="confirmPassword"
                  type={showPw2 ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="비밀번호 확인"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={!keyVerified || loading}
                  className="pl-9 pr-9"
                  aria-invalid={!!confirmPassword && !matchOk}
                />
                <button
                  type="button"
                  onClick={() => setShowPw2((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#8a6b50] hover:bg-amber-100/40"
                  aria-label={showPw2 ? "비밀번호 숨기기" : "비밀번호 보이기"}
                  tabIndex={-1}
                >
                  <FontAwesomeIcon
                    icon={showPw2 ? faEyeSlash : faEye}
                    className="h-4 w-4"
                    aria-hidden
                  />
                </button>
              </div>
              {!!confirmPassword && (
                <div className="text-xs">
                  {matchOk ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <FontAwesomeIcon
                        icon={faCircleCheck}
                        className="h-3.5 w-3.5"
                        aria-hidden
                      />
                      일치합니다
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <FontAwesomeIcon
                        icon={faCircleXmark}
                        className="h-3.5 w-3.5"
                        aria-hidden
                      />
                      일치하지 않습니다
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 에러 메시지 */}
            {errorMsg && (
              <Alert variant="destructive" role="status" aria-live="polite">
                <AlertDescription className="flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={faCircleExclamation}
                    className="h-4 w-4"
                    aria-hidden
                  />
                  {errorMsg}
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
              {loading ? (
                <>
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden
                  />
                  가입 중...
                </>
              ) : (
                "회원가입"
              )}
            </Button>

            <div className="text-sm text-center text-[#8a6b50]">
              이미 계정이 있으신가요?{" "}
              <Link
                to="/login"
                className="underline font-semibold hover:text-[#6b4e2d]"
              >
                로그인하러 가기
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
