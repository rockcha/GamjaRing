// src/components/timecapsule/TimeCapsuleButton.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
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

/* Tooltip (PartnerActionButton 스타일) */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* 아이콘 - 닫기 버튼 */
import { X } from "lucide-react";

/* 연출 & 날짜 선택 */
import TimeRippleEffect from "./TimeRippleEffect";
import DateTimePicker from "./date-time-picker";

function getDefaultOpenDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setSeconds(0, 0);
  return d;
}

export default function TimeCapsuleButton({
  className,
  buttonEmoji = "⏳",
  ariaLabel = "타임캡슐 작성",
  size = "icon",
  emojiSizePx = 22,
}: {
  className?: string;
  buttonEmoji?: string;
  ariaLabel?: string;
  size?: "icon" | "sm" | "default" | "lg";
  emojiSizePx?: number;
}) {
  const { user } = useUser();
  const { couple } = useCoupleContext();

  const [open, setOpen] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [openAt, setOpenAt] = React.useState<Date>(getDefaultOpenDate());
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  // 봉인 연출 상태
  const [sealing, setSealing] = React.useState(false); // 폼 숨김 + 이펙트 표시
  const [fxDone, setFxDone] = React.useState(false); // 이펙트 완료
  const [readyToClose, setReadyToClose] = React.useState(false); // DB 완료
  const prevRef = React.useRef<{
    title: string;
    content: string;
    openAt: Date;
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
      setTimeout(() => handleDialogChange(false), 80);
      setSealing(false);
      setFxDone(false);
      setReadyToClose(false);
      setShouldToastOnClose(true);
    }
  }, [sealing, fxDone, readyToClose]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setOpenAt(getDefaultOpenDate());
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

    const t = title.trim();
    const c = content.trim();
    if (!t) {
      setErr("제목을 입력해 주세요.");
      return;
    }
    if (!c) {
      setErr("내용을 입력해 주세요.");
      return;
    }
    if (!(openAt instanceof Date) || Number.isNaN(openAt.getTime())) {
      setErr("유효한 날짜/시간이 아닙니다.");
      return;
    }
    if (openAt.getTime() <= Date.now()) {
      setErr("열람 가능 일시는 현재 시각 이후여야 합니다.");
      return;
    }

    setSaving(true);

    // ★ 폼 내용 비우고 봉인 이펙트 진입
    prevRef.current = { title, content, openAt };
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
      if ((user as any)?.partner_id) {
        try {
          await sendUserNotification({
            senderId: user.id,
            receiverId: (user as any).partner_id,
            type: "타임캡슐",
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
        setOpenAt(prevRef.current.openAt);
      }
      setErr("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  /** ───────── Trigger Button (PartnerActionButton 스타일) ───────── */
  const Trigger = (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex", className)}>
            <Button
              type="button"
              variant="ghost"
              size={size}
              className={cn(
                "relative h-10 w-10 transition-all",
                "before:pointer-events-none before:absolute before:inset-0",
                "before:opacity-0 hover:before:opacity-100 before:transition-opacity",
                "before:bg-[radial-gradient(120px_80px_at_50%_-20%,rgba(255,182,193,0.35),transparent_60%)]",
                { "w-auto px-3": size !== "icon" }
              )}
              aria-label={ariaLabel}
              onClick={() => {
                setErr("");
                setOpen(true);
              }}
            >
              <span
                style={{ fontSize: size === "icon" ? emojiSizePx : 18 }}
                className={
                  size !== "icon" ? "font-medium leading-none" : "leading-none"
                }
                aria-hidden
              >
                {buttonEmoji}
              </span>
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">
          타임캡슐 작성
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <>
      {Trigger}

      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent
          className={cn(
            "w-[calc(100vw-2rem)] sm:max-w-[520px] rounded-2xl",
            "p-4 sm:p-6",
            "max-h-[85vh] overflow-y-auto",
            "sm:mx-0"
          )}
        >
          {/* 우상단 닫기 버튼 */}
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-9 w-9 rounded-full"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>

          {/* 스티키 헤더 */}
          <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 px-4 pt-4 pb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-t-2xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base sm:text-lg">
                타임캡슐 작성
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                제목은 상대에게 공개되며, 열람 가능 일시는 현재보다 이후여야
                해요.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* 본문 */}
          {sealing ? (
            <div className="relative h-96 sm:h-64">
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
            <div
              className={cn(
                "space-y-4",
                sealing && "pointer-events-none opacity-50"
              )}
            >
              {/* 제목 */}
              <div className="space-y-1.5">
                <Label htmlFor="tc-title">제목</Label>
                <div className="relative">
                  <Input
                    id="tc-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예) 1주년 기념 편지"
                    maxLength={10}
                    className="h-10"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400">
                    {title.length}/10
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  * 제목은 상대에게 공개됩니다.
                </p>
              </div>

              {/* 내용 */}
              <div className="space-y-1.5">
                <Label htmlFor="tc-content">내용</Label>
                <Textarea
                  id="tc-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="열었을 때 전하고 싶은 말을 적어보세요..."
                  className="min-h-[160px]"
                />
              </div>

              {/* 열람 가능 일시 */}
              <div className="space-y-1.5">
                <Label>열람 가능 일시</Label>
                <DateTimePicker
                  value={openAt}
                  onChange={(d) => d && setOpenAt(d)}
                  min={new Date()}
                />
              </div>

              {err && <div className="text-sm text-rose-600">{err}</div>}
            </div>
          )}

          {/* 스티키 푸터 */}
          <div className="sticky bottom-0 mt-4 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-b-2xl">
            <DialogFooter className="sm:justify-end gap-2">
              {!sealing ? (
                <>
                  <Button
                    onClick={onSave}
                    disabled={saving}
                    className="h-10 transition-all hover:-translate-y-0.5 ring-1 ring-transparent hover:ring-rose-200/80"
                  >
                    {saving ? "타임캡슐 봉인 중…" : "타임캡슐 봉인"}
                  </Button>
                  <DialogClose asChild>
                    <Button variant="ghost" className="h-10">
                      닫기
                    </Button>
                  </DialogClose>
                </>
              ) : (
                <DialogClose asChild>
                  <Button variant="ghost" className="h-10">
                    취소
                  </Button>
                </DialogClose>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
