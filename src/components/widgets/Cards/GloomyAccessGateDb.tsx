"use client";

import { useEffect, useMemo, useState, useCallback, FormEvent } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Lock, KeyRound, CheckCircle2, Loader2 } from "lucide-react";

type Mode = "loading" | "setup" | "verify" | "unlocked";

export default function GloomyAccessGateDbSimple({
  onUnlocked,
  className,
}: {
  onUnlocked?: () => void;
  className?: string;
}) {
  const { user } = useUser();
  const [mode, setMode] = useState<Mode>("loading");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [working, setWorking] = useState(false);
  const [storedPass, setStoredPass] = useState<string | null>(null);

  const canSubmit = useMemo(() => /^\d{4,8}$/.test(pin), [pin]);

  const loadState = useCallback(async () => {
    if (!user?.id) return;
    setMode("loading");
    const { data, error } = await supabase
      .from("user_auth_passwords")
      .select("password,is_set")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setStoredPass(null);
      setMode("setup");
      return;
    }
    const pass = data?.password ?? null;
    const isSet = Boolean(data?.is_set);
    setStoredPass(pass);
    setMode(isSet && pass ? "verify" : "setup");
  }, [user?.id]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleSet = async () => {
    if (!/^\d{4,8}$/.test(pin)) {
      toast.error("PIN은 숫자 4~8자리로 설정해주세요.");
      return;
    }
    if (pin !== pin2) {
      toast.error("PIN이 서로 일치하지 않습니다.");
      return;
    }
    if (!user?.id) return;

    setWorking(true);
    const { error } = await supabase
      .from("user_auth_passwords")
      .upsert([{ user_id: user.id, password: pin, is_set: true }], {
        onConflict: "user_id",
      });
    setWorking(false);

    if (error) {
      toast.error("설정 실패. 다시 시도해주세요.");
      return;
    }
    toast.success("PIN이 설정되었습니다.");
    setPin("");
    setPin2("");
    setStoredPass(pin);
    setMode("verify");
  };

  const handleVerify = async () => {
    if (!canSubmit) {
      toast.error("숫자 4~8자리로 입력해주세요.");
      return;
    }
    setWorking(true);

    // 최신값 재확인
    let pass = storedPass;
    if (user?.id) {
      const { data, error } = await supabase
        .from("user_auth_passwords")
        .select("password")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!error) pass = data?.password ?? pass;
    }

    const ok = pass === pin;
    setWorking(false);

    if (!ok) {
      toast.error("PIN이 올바르지 않습니다.");
      return;
    }
    toast.success("잠금 해제!");
    setMode("unlocked");
    onUnlocked?.();
  };

  // ⌨️ Enter 제출
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (working) return;
    if (mode === "setup") handleSet();
    if (mode === "verify") handleVerify();
  };

  if (mode === "unlocked") return null;

  return (
    <Card
      className={cn(
        "rounded-2xl overflow-hidden shadow-[0_20px_50px_-24px_rgba(0,0,0,0.35)]",
        "ring-1 ring-neutral-200 bg-white",
        className
      )}
    >
      {/* 헤더 비주얼: 정사각 아바타 프레임 + 그라데이션 */}
      <div className="relative bg-gradient-to-r from-slate-100 via-rose-50 to-pink-50">
        {/* 헤더 높이: 이미지가 여유 있게 들어가는 적당한 패딩 */}
        <div className="px-6 py-6 sm:py-7 flex items-center justify-center">
          {/* 정사각 컨테이너 */}
          <div
            className={cn(
              "relative aspect-square",
              "w-24 sm:w-28 md:w-32",
              "rounded-2xl bg-white",
              "ring-1 ring-black/10 shadow-[0_12px_28px_-14px_rgba(0,0,0,0.25)]",
              "grid place-items-center overflow-hidden"
            )}
            aria-hidden
          >
            <img
              src="/gloomyroomGuard.png"
              alt="gloomy room guard"
              className="h-[88%] w-[88%] object-contain select-none"
              draggable={false}
            />
          </div>
        </div>

        {/* 상태 배지 (우상단) */}
        <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur px-3 py-1.5 ring-1 ring-black/5 shadow-sm">
          {mode === "setup" ? (
            <>
              <KeyRound className="h-4 w-4 text-neutral-700" />
              <span className="text-xs font-semibold text-neutral-700">
                PIN 설정
              </span>
            </>
          ) : mode === "verify" ? (
            <>
              <Lock className="h-4 w-4 text-neutral-700" />
              <span className="text-xs font-semibold text-neutral-700">
                입장 확인
              </span>
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-neutral-700" />
              <span className="text-xs font-semibold text-neutral-700">
                확인 중…
              </span>
            </>
          )}
        </div>
      </div>

      {/* 타이틀 */}
      <CardHeader className="pt-3 pb-1">
        <div className="flex w-full items-center justify-center">
          <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-neutral-800">
            음침한 방 문지기
          </h3>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        {mode === "loading" ? (
          <div className="py-8 text-center text-sm text-neutral-600">
            상태 확인 중…
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mx-auto max-w-sm">
            {mode === "setup" ? (
              <>
                <p className="text-sm text-neutral-600 text-center mb-4">
                  처음이시군요. 사용할 PIN을 설정하세요. (숫자 4~8자리)
                </p>
                <div className="space-y-3">
                  <Input
                    inputMode="numeric"
                    pattern="\d{4,8}"
                    maxLength={8}
                    placeholder="PIN (숫자 4~8자리)"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className="text-center tracking-widest"
                    autoFocus
                  />
                  <Input
                    inputMode="numeric"
                    pattern="\d{4,8}"
                    maxLength={8}
                    placeholder="PIN 확인"
                    value={pin2}
                    onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
                    className="text-center tracking-widest"
                  />
                  <Button
                    type="submit"
                    disabled={working}
                    className="w-full rounded-xl bg-pink-500 hover:bg-pink-600 text-white shadow-[0_14px_28px_-14px_rgba(244,114,182,0.55)]"
                  >
                    {working ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        설정 중…
                      </>
                    ) : (
                      <>
                        <KeyRound className="mr-2 h-4 w-4" />
                        PIN 설정
                      </>
                    )}
                  </Button>
                  <Separator className="my-2" />
                  <p className="text-[11px] text-neutral-500 text-center">
                    간단 모드: 입력하신 PIN은 테이블에 그대로 저장됩니다.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-600 text-center mb-4">
                  등록된 PIN을 입력해 주세요.
                </p>
                <div className="space-y-3">
                  <Input
                    inputMode="numeric"
                    pattern="\d{4,8}"
                    maxLength={8}
                    placeholder="4~8자리 PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className="text-center tracking-widest"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={working}
                    className="w-full rounded-xl bg-rose-400 hover:bg-rose-500 text-white shadow-[0_14px_28px_-14px_rgba(244,63,94,0.45)]"
                  >
                    {working ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        확인 중…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        입장
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
