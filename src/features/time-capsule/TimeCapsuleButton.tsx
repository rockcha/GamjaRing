"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import supabase from "@/lib/supabase";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import TimeRippleEffect from "./TimeRippleEffect";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
function getDefaultOpenLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalInputValue(d);
}

export default function TimeCapsuleButton({
  className,
  buttonEmoji = "⏳",
  ariaLabel = "타임캡슐 작성",
}: {
  className?: string;
  buttonEmoji?: string;
  ariaLabel?: string;
}) {
  const { user } = useUser();
  const { couple } = useCoupleContext();

  const [open, setOpen] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [openLocal, setOpenLocal] = React.useState(getDefaultOpenLocal());
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  // 봉인 연출 상태
  const [sealing, setSealing] = React.useState(false); // 폼 숨김 + 이펙트 표시
  const [fxDone, setFxDone] = React.useState(false); // 이펙트 완료
  const [readyToClose, setReadyToClose] = React.useState(false); // DB 완료
  const prevRef = React.useRef<{
    title: string;
    content: string;
    openLocal: string;
  } | null>(null);

  // 다이얼로그 닫힌 뒤 토스트
  const [shouldToastOnClose, setShouldToastOnClose] = React.useState(false);
  const handleDialogChange = (o: boolean) => {
    setOpen(o);
    if (!o && shouldToastOnClose) {
      toast.success("봉인완료!");
      setShouldToastOnClose(false);
    }
  };

  // 이펙트/DB가 모두 끝나면 닫기
  React.useEffect(() => {
    if (sealing && fxDone && readyToClose) {
      // 약간의 여유 후 닫기(선호에 따라 0으로 해도 됨)
      setTimeout(() => handleDialogChange(false), 80);
      setSealing(false);
      setFxDone(false);
      setReadyToClose(false);
      // 폼은 이미 비워졌음
      setShouldToastOnClose(true);
    }
  }, [sealing, fxDone, readyToClose]);

  // 원형 버튼 리플
  const [ripple, setRipple] = React.useState(false);
  const rippleTimer = React.useRef<number | null>(null);
  const startRipple = () => {
    setRipple(false);
    requestAnimationFrame(() => {
      setRipple(true);
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
      rippleTimer.current = window.setTimeout(() => setRipple(false), 1400);
    });
  };
  React.useEffect(
    () => () => {
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
    },
    []
  );

  const handleOpen = () => {
    startRipple();
    setErr("");
    setOpen(true);
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setOpenLocal(getDefaultOpenLocal());
    setErr("");
  };

  async function onSave() {
    setErr("");

    if (!user?.id) {
      toast.warning("로그인 후 이용해 주세요.");
      return;
    }
    if (!couple?.id) {
      toast.warning("커플 연동 후 이용해 주세요.");
      return;
    }

    const t = title.trim(),
      c = content.trim();
    if (!t) {
      setErr("제목을 입력해 주세요.");
      return;
    }
    if (!c) {
      setErr("내용을 입력해 주세요.");
      return;
    }
    if (!openLocal) {
      setErr("열람 가능 일시를 선택해 주세요.");
      return;
    }

    const openAt = new Date(openLocal);
    if (Number.isNaN(openAt.getTime())) {
      setErr("유효한 날짜/시간이 아닙니다.");
      return;
    }
    if (openAt.getTime() <= Date.now()) {
      setErr("열람 가능 일시는 현재 시각 이후여야 합니다.");
      return;
    }

    setSaving(true);

    // ★ 폼 내용 비우고 봉인 이펙트 진입
    prevRef.current = { title, content, openLocal };
    resetForm();
    setSealing(true);
    setFxDone(false);
    setReadyToClose(false);

    try {
      const id = (globalThis.crypto?.randomUUID?.() ??
        Math.random().toString(36).slice(2)) as string;

      const { error } = await supabase.from("time_capsule").insert({
        id,
        couple_id: couple.id,
        author_id: user.id,
        title: t,
        content: c,
        open_at: openAt.toISOString(),
      });
      if (error) throw error;

      // 알림(실패해도 무시)
      if (user.partner_id) {
        try {
          await sendUserNotification({
            senderId: user.id,
            receiverId: user.partner_id,
            type: "타임캡슐작성",
            capsuleTitle: t,
          });
        } catch (e) {
          console.warn("[TimeCapsule] 알림 실패(무시):", e);
        }
      }

      // ★ DB 완료 플래그 → 이펙트 onDone과 만나면 닫힘 + 토스트
      setReadyToClose(true);
    } catch (e: any) {
      console.error(e);
      // 실패 시 봉인 해제 + 이전 폼 복원
      setSealing(false);
      if (prevRef.current) {
        setTitle(prevRef.current.title);
        setContent(prevRef.current.content);
        setOpenLocal(prevRef.current.openLocal);
      }
      setErr("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  const CircleButton = (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onClick={handleOpen}
      className={cn(
        "relative grid place-items-center h-14 w-14 rounded-full border bg-white/60 hover:pl-4 transition-all duration-500",
        className
      )}
    >
      {ripple && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-rose-300/50 animate-[pokePing_1.4s_ease_out_forwards]"
          aria-hidden
        />
      )}
      <span className="text-2xl leading-none select-none" aria-hidden>
        {buttonEmoji}
      </span>
      <style>{`@keyframes pokePing{0%{transform:scale(1);opacity:.75}70%{transform:scale(1.9);opacity:0}100%{transform:scale(1.9);opacity:0}}`}</style>
    </motion.button>
  );

  return (
    <>
      {CircleButton}

      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>타임캡슐 작성</DialogTitle>
          </DialogHeader>

          {/* ★ 봉인 중 화면: 다이얼로그 내부 중앙에 이펙트 + 하단 문구 */}
          {sealing ? (
            <div className="relative h-96 sm:h-64 ">
              <TimeRippleEffect
                open
                variant="inline"
                icon={buttonEmoji}
                onDone={() => setFxDone(true)}
              />
              <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-neutral-500">
                타임캡슐 봉인중...
              </div>
            </div>
          ) : (
            <>
              {/* 폼 내용 */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tc-title">제목</Label>
                  <Input
                    id="tc-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예) 1주년 기념 편지"
                    maxLength={40}
                  />
                </div>
                <p className="text-[11px] text-neutral-500">
                  * 제목은 상대에게 공개됩니다.
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="tc-content">내용</Label>
                  <Textarea
                    id="tc-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="열었을 때 그 사람에게 전하고 싶은 말을 적어보세요..."
                    className="min-h-[160px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tc-open-dt">열람 가능 일시</Label>
                  <Input
                    id="tc-open-dt"
                    type="datetime-local"
                    value={openLocal}
                    onChange={(e) => setOpenLocal(e.target.value)}
                    min={toLocalInputValue(new Date())}
                  />
                  <p className="text-[11px] text-neutral-500">
                    * 입력하신 시각 이후에만 열어볼 수 있어요.
                  </p>
                </div>

                {err && <div className="text-sm text-rose-600">{err}</div>}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={onSave} disabled={saving}>
                  {saving ? "타임캡슐 봉인 중…" : "타임캡슐 봉인"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleDialogChange(false)}
                >
                  닫기
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
