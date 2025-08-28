// src/pages/SignupPage.tsx
"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
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

    // 1) 모든 칸 입력
    if (!email || !nickname || !password || !confirmPassword) {
      setErrorMsg("모든 항목을 입력해주세요.");
      return;
    }

    // 2) 이메일 형식
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg("유효한 이메일 형식이 아닙니다.");
      return;
    }

    // 3) 비밀번호 길이
    if (password.length < 6) {
      setErrorMsg("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    // 4) 비밀번호 일치
    if (password !== confirmPassword) {
      setErrorMsg("비밀번호가 일치하지 않습니다.");
      return;
    }

    // 5) 닉네임 중복 확인
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

    // 6) 회원가입
    const { error } = await signup({ email, password, nickname });
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
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3] px-4 py-8 sm:py-12">
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
        >
          <CardContent className="flex flex-col gap-6">
            {/* 닉네임 */}
            <div className="grid gap-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input
                id="nickname"
                type="text"
                autoComplete="nickname"
                placeholder="닉네임을 입력해주세요"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={loading}
              />
            </div>

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
                disabled={loading}
              />
            </div>

            {/* 비밀번호 */}
            <div className="grid gap-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="비밀번호를 입력해주세요 (6자 이상)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* 비밀번호 확인 */}
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="비밀번호 확인"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* 에러 메시지 */}
            {errorMsg && (
              <Alert variant="destructive">
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
