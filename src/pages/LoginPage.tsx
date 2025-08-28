// src/pages/ResetPasswordPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import supabase from "@/lib/supabase";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(true); // 초기 링크 확인/세션 교환
  const [saving, setSaving] = useState(false); // 비번 업데이트
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) PKCE(code) 링크 처리
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (error) throw error;
          // 주소창 정리(토큰 파라미터 제거)
          window.history.replaceState({}, document.title, "/auth/reset");
        }

        // 2) 세션 확인 (hash 방식 포함)
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setError(
            "유효하지 않은 링크이거나 만료되었습니다. 다시 시도해주세요."
          );
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "링크 처리 중 문제가 발생했습니다."
        );
      } finally {
        setBusy(false);
      }
    })();
    // location.key를 deps에 두면 동일 경로 재방문 시에도 1회 더 체크 가능
  }, [location.key]);

  const onUpdate = async () => {
    setError(null);
    setMsg(null);

    if (pwd1.length < 6)
      return setError("비밀번호는 최소 6자 이상이어야 합니다.");
    if (pwd1 !== pwd2) return setError("비밀번호가 일치하지 않습니다.");

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd1 });
      if (error) throw error;

      setMsg("비밀번호가 변경되었습니다. 다시 로그인해주세요!");
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "비밀번호 변경에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  if (busy) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3] px-4 py-8">
      <Card className="w-full max-w-sm shadow-lg border border-amber-200/40">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl font-bold text-[#5b3d1d]">
            비밀번호 재설정
          </CardTitle>
          <CardDescription className="text-[#8a6b50]">
            새 비밀번호를 입력한 뒤 확인을 눌러주세요.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {msg && (
            <Alert>
              <AlertDescription>{msg}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="pwd1">새 비밀번호</Label>
            <Input
              id="pwd1"
              type="password"
              placeholder="6자 이상"
              value={pwd1}
              onChange={(e) => setPwd1(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pwd2">새 비밀번호 확인</Label>
            <Input
              id="pwd2"
              type="password"
              placeholder="다시 입력"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              disabled={saving}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button onClick={onUpdate} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                변경 중…
              </>
            ) : (
              "비밀번호 변경"
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/login")}
            disabled={saving}
          >
            로그인 화면으로 돌아가기
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
