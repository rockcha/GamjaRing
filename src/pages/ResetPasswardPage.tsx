// src/pages/ResetPasswordPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/lib/supabase";

// shadcn/ui
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(true); // 초기 링크/세션 확인
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(""); // 안내/오류 메시지
  const [isError, setIsError] = useState(false);

  // 링크로 들어왔을 때 recovery 세션이 잡혔는지 확인
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setIsError(true);
        setMsg("유효하지 않은 링크이거나 만료되었습니다. 다시 시도해주세요.");
      }
      setBusy(false);
    })();
  }, []);

  const onUpdate = async () => {
    setMsg("");
    setIsError(false);

    if (pwd1.length < 6) {
      setIsError(true);
      setMsg("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }
    if (pwd1 !== pwd2) {
      setIsError(true);
      setMsg("비밀번호가 일치하지 않습니다.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd1 });
      if (error) throw error;

      setIsError(false);
      setMsg("비밀번호가 변경되었습니다. 다시 로그인해주세요!");
      await supabase.auth.signOut();
      navigate("/login");
    } catch (e) {
      setIsError(true);
      const text =
        e instanceof Error ? e.message : "비밀번호 변경에 실패했습니다.";
      setMsg(text);
    } finally {
      setSaving(false);
    }
  };

  if (busy) {
    return (
      <div className="min-h-dvh grid place-items-center bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3] px-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          링크 상태 확인 중…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3] px-4 py-10">
      <Card className="w-full max-w-md bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-[#6b4e2d]">비밀번호 재설정</CardTitle>
          <CardDescription className="text-[#8a6b50]">
            새 비밀번호를 입력한 뒤, 확인 버튼을 눌러주세요.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* 안내/오류 */}
          {msg && (
            <Alert variant={isError ? "destructive" : "default"}>
              <AlertTitle className="flex items-center gap-2">
                {isError ? "알림" : "완료"}
                {!isError && <ShieldCheck className="h-4 w-4" />}
              </AlertTitle>
              <AlertDescription>{msg}</AlertDescription>
            </Alert>
          )}

          {/* 새 비밀번호 */}
          <div className="space-y-2">
            <Label htmlFor="pwd1">새 비밀번호</Label>
            <Input
              id="pwd1"
              type="password"
              autoComplete="new-password"
              placeholder="새 비밀번호(6자 이상)"
              value={pwd1}
              onChange={(e) => setPwd1(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* 새 비밀번호 확인 */}
          <div className="space-y-2">
            <Label htmlFor="pwd2">새 비밀번호 확인</Label>
            <Input
              id="pwd2"
              type="password"
              autoComplete="new-password"
              placeholder="새 비밀번호 확인"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              disabled={saving}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button
            variant="outline"
            type="button"
            onClick={() => navigate("/login")}
            className="hover:cursor-pointer"
            disabled={saving}
          >
            로그인으로 돌아가기
          </Button>
          <Button
            type="button"
            onClick={onUpdate}
            className="hover:cursor-pointer min-w-[140px]"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                변경 중…
              </>
            ) : (
              <>비밀번호 변경</>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
