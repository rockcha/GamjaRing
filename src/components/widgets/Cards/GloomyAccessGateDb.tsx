// src/components/guards/GloomyAccessGateDb.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKey, faLock } from "@fortawesome/free-solid-svg-icons";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

type Mode = "checking" | "setup" | "enter" | "granted";

export default function GloomyAccessGateDb({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: userLoading } = useUser(); // ✅ 로딩 상태 확보
  const [mode, setMode] = useState<Mode>("checking");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ✅ 인증 상태 확정 전에는 절대 granted로 넘어가지 않음
  useEffect(() => {
    let alive = true;
    (async () => {
      if (userLoading) return; // 아직 모름 → 그대로 'checking' 유지

      if (!user) {
        // 비로그인 정책: 통과시키고 싶다면 granted, 아니라면 enter로 유도 등 원하는 정책으로
        if (alive) setMode("granted");
        return;
      }

      const { data, error } = await supabase
        .from("user_auth_passwords")
        .select("is_set")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.error(error);
        setMode("setup"); // 보수적으로 생성 모드
        return;
      }
      setMode(data?.is_set ? "enter" : "setup");
    })();

    return () => {
      alive = false;
    };
  }, [user, userLoading]);

  const disabled = useMemo(
    () => loading || pin.length !== 4 || !/^\d{4}$/.test(pin),
    [loading, pin]
  );

  const onSetup = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase
        .from("user_auth_passwords")
        .upsert(
          { user_id: user.id, password: pin, is_set: true },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      setMode("granted");
    } catch (e) {
      console.error(e);
      setErrorMsg("비밀번호 생성 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
      setPin("");
    }
  };

  const onEnter = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const { data, error } = await supabase
        .from("user_auth_passwords")
        .select("password")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;

      if (data?.password?.trim() === pin) setMode("granted");
      else setErrorMsg("비밀번호가 올바르지 않아요.");
    } catch (e) {
      console.error(e);
      setErrorMsg("비밀번호 확인 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
      setPin("");
    }
  };

  const open = mode === "setup" || mode === "enter";

  return (
    <>
      {/* ✅ 검사 중: 전체 화면 덮개 (절대 순서로 최상단 보장) */}
      {mode === "checking" && (
        <div
          className="fixed inset-0 z-[9999] bg-background"
          aria-hidden="true"
        />
      )}

      {/* ✅ granted 되기 전까지 children은 절대 렌더하지 않음 */}
      {mode === "granted" ? children : null}

      <Dialog open={open}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              {mode === "setup" ? (
                <>
                  <FontAwesomeIcon icon={faKey} className="shrink-0" />
                  비밀번호 생성
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faLock} className="shrink-0" />
                  비밀번호 입력
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Label htmlFor="pin" className="text-sm">
              4자리 숫자
            </Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                const onlyDigits = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 4);
                setPin(onlyDigits);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !disabled) {
                  mode === "setup" ? onSetup() : onEnter();
                }
              }}
              className="text-center tracking-widest text-lg"
              autoFocus
            />
            {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
          </div>

          <DialogFooter className="gap-2">
            {mode === "setup" ? (
              <Button onClick={onSetup} disabled={disabled}>
                {loading ? "설정 중..." : "비밀번호 생성"}
              </Button>
            ) : (
              <Button onClick={onEnter} disabled={disabled}>
                {loading ? "확인 중..." : "입력"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
