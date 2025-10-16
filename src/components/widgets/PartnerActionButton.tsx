// src/components/partner/PartnerActionButton.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import supabase from "@/lib/supabase";
import type { NotificationType } from "@/utils/notification/sendUserNotification";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";

/* shadcn/ui Tooltip */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** 알림 액션 키 타입 (커스텀은 별도 입력창으로 처리) */
type ActionKey = Extract<
  NotificationType,
  | "콕찌르기"
  | "뽀뽀하기"
  | "머리쓰다듬기"
  | "안아주기"
  | "간지럽히기"
  | "응원하기"
  | "애교부리기"
  | "하이파이브"
  | "꽃 선물하기"
  | "유혹하기"
  | "윙크하기"
  | "사랑스럽게 쳐다보기"
  | "사랑고백 속삭이기"
  | "오구오구해주기"
  | "깜짝쪽지"
  | "어깨토닥이기"
  | "하트날리기"
  | "노래 불러주기"
  | "음침한 말 하기"
  | "째려보기"
  | "우울해하기"
>;

/** 액션 아이템 — desc 제거, label만 Tooltip에 노출 */
const ACTION_ITEMS: { key: ActionKey; label: string; emoji: string }[] = [
  { key: "콕찌르기", label: "콕찌르기", emoji: "👉" },
  { key: "뽀뽀하기", label: "뽀뽀하기", emoji: "💋" },
  { key: "머리쓰다듬기", label: "머리 쓰다듬기", emoji: "🫶" },
  { key: "안아주기", label: "안아주기", emoji: "🤗" },
  { key: "간지럽히기", label: "간지럽히기", emoji: "😂" },

  { key: "응원하기", label: "응원하기", emoji: "💪" },
  { key: "애교부리기", label: "애교 부리기", emoji: "🥰" },
  { key: "하이파이브", label: "하이파이브", emoji: "🙌" },
  { key: "꽃 선물하기", label: "꽃 선물하기", emoji: "💐" },
  { key: "유혹하기", label: "유혹하기", emoji: "😏" },
  { key: "윙크하기", label: "윙크하기", emoji: "😉" },
  { key: "사랑스럽게 쳐다보기", label: "사랑스럽게 쳐다보기", emoji: "👀" },

  { key: "사랑고백 속삭이기", label: "사랑고백 속삭이기", emoji: "🤫" },
  { key: "오구오구해주기", label: "오구오구해주기", emoji: "🐻" },
  { key: "깜짝쪽지", label: "깜짝 쪽지", emoji: "✉️" },
  { key: "어깨토닥이기", label: "어깨 토닥이기", emoji: "🫱" },
  { key: "하트날리기", label: "하트 날리기", emoji: "🫰" },

  { key: "노래 불러주기", label: "노래 불러주기", emoji: "🎤" },
  { key: "음침한 말 하기", label: "음침한 말 하기", emoji: "🌚" },
  { key: "째려보기", label: "째려보기", emoji: "😒" },
  { key: "우울해하기", label: "우울해하기", emoji: "😔" },
];

/**
 * 외부에서 <PartnerActionButton /> 하나만 쓰면 됨
 * - sender/receiver/label 내부 로딩
 * - Dialog 전송 후 유지
 * - Hover Tooltip 적용
 * - 커스텀 전송은 항상 "💕" 추가 + type: "커스텀 액션"
 */
export default function PartnerActionButton({
  className,
  label = "💕",
  size = "icon",
  /** ✅ 추가: 트리거 이모지 크기(px) */
  emojiSizePx = 22,
  /** ✅ 추가: 액션 그리드 이모지 크기(px) */
  actionEmojiSizePx = 18,
}: {
  className?: string;
  label?: string;
  size?: "icon" | "sm" | "default" | "lg";
  emojiSizePx?: number;
  actionEmojiSizePx?: number;
}) {
  const { couple, partnerId } = useCoupleContext();
  const { user } = useUser();

  const senderId = (user as any)?.id ?? null;

  const [receiverLabel, setReceiverLabel] = useState<string>("상대");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<ActionKey | null>(null);

  // 커스텀 액션 입력
  const [customText, setCustomText] = useState("");

  // 파트너 닉네임 로딩
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fallback = (couple as any)?.partner_nickname as
          | string
          | undefined;
        if (!partnerId) {
          if (fallback) setReceiverLabel(fallback);
          return;
        }
        const { data, error } = await supabase
          .from("users")
          .select("nickname")
          .eq("id", partnerId)
          .single();
        if (!alive) return;
        if (error) {
          if (fallback) setReceiverLabel(fallback);
        } else {
          setReceiverLabel(data?.nickname ?? fallback ?? "상대");
        }
      } catch {
        const fallback = (couple as any)?.partner_nickname as
          | string
          | undefined;
        if (fallback) setReceiverLabel(fallback);
      }
    })();
    return () => {
      alive = false;
    };
  }, [partnerId, (couple as any)?.partner_nickname]);

  const disabled = useMemo(
    () => !senderId || !partnerId,
    [senderId, partnerId]
  );

  async function handleSend(type: ActionKey, emoji: string) {
    if (!senderId || !partnerId) {
      toast.error("로그인/파트너 정보를 확인해주세요.");
      return;
    }
    try {
      setSending(type);
      const { error } = await sendUserNotification({
        senderId,
        receiverId: partnerId,
        type,
      });
      if (error) {
        toast.error("알림 전송에 실패했어요. 잠시 후 다시 시도해주세요.");
      } else {
        toast.success(
          `‘${receiverLabel}’에게 ${emoji} ${type} 알림을 보냈어요!`
        );
        // 보낸 뒤에도 Dialog 유지
      }
    } catch {
      toast.error("알림 전송 중 오류가 발생했어요.");
    } finally {
      setSending(null);
    }
  }

  async function handleSendCustom() {
    if (!senderId || !partnerId) {
      toast.error("로그인/파트너 정보를 확인해주세요.");
      return;
    }
    const trimmed = customText.trim();
    if (!trimmed) {
      toast.error("보낼 내용을 입력해주세요.");
      return;
    }
    try {
      const desc = `${trimmed} 💕`;
      const { error } = await sendUserNotification({
        senderId,
        receiverId: partnerId,
        type: "커스텀 액션",
        description: desc,
      });
      if (error) {
        toast.error("알림 전송에 실패했어요. 잠시 후 다시 시도해주세요.");
      } else {
        toast.success(`‘${receiverLabel}’에게 커스텀 액션을 보냈어요!`);
        setCustomText(""); // 입력만 초기화, Dialog는 유지
      }
    } catch {
      toast.error("알림 전송 중 오류가 발생했어요.");
    }
  }

  function onCustomKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSendCustom();
    }
  }

  return (
    <>
      {/* 트리거 버튼: ghost + hover 이펙트 + Tooltip("액션 보내기") */}
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* disabled일 때도 툴팁 보이게 span 래퍼 사용 */}
            <span
              className={cn(
                "inline-flex",
                disabled && "cursor-not-allowed opacity-60"
              )}
              onClick={() => !disabled && setOpen(true)}
            >
              <Button
                type="button"
                variant="ghost"
                size={size}
                className={cn(
                  "relative h-10 w-10 transition-all ",
                  "before:pointer-events-none before:absolute before:inset-0 ",
                  "before:opacity-0 hover:before:opacity-100 before:transition-opacity",
                  "before:bg-[radial-gradient(120px_80px_at_50%_-20%,rgba(255,182,193,0.35),transparent_60%)]",
                  className,
                  { "w-auto px-3": size !== "icon" }
                )}
                aria-label="애정 액션 보내기"
                disabled={disabled}
              >
                {/* ✅ 이모지 크기 style로 제어 */}
                <span
                  style={{ fontSize: size === "icon" ? emojiSizePx : 18 }}
                  className={
                    size !== "icon"
                      ? "font-medium leading-none"
                      : "leading-none"
                  }
                >
                  {label}
                </span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            액션 보내기
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{receiverLabel}에게 액션 보내기</DialogTitle>
            <DialogDescription>
              아래에서 하나를 선택하거나, 직접 메시지를 적어 보낼 수 있어요.
            </DialogDescription>
          </DialogHeader>

          {/* 액션 그리드: Tooltip + hover 효과 */}
          <TooltipProvider delayDuration={120}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACTION_ITEMS.map((a) => (
                <Tooltip key={a.key}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      className={cn(
                        "group relative justify-start h-12 px-3 text-[13px] font-medium",
                        "rounded-xl border border-border transition-all",
                        "hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0",
                        "focus-visible:ring-2 focus-visible:ring-rose-300/70",
                        "before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none",
                        "before:bg-[radial-gradient(140px_100px_at_50%_-10%,rgba(255,182,193,0.25),transparent_65%)]",
                        "before:opacity-0 group-hover:before:opacity-100 before:transition-opacity"
                      )}
                      disabled={Boolean(sending)}
                      onClick={() => handleSend(a.key, a.emoji)}
                      aria-label={`${receiverLabel}에게 ${a.label} 보내기 (${a.emoji})`}
                    >
                      {/* ✅ 그리드 이모지 크기 style로 제어 */}
                      <span
                        className="mr-2 leading-none"
                        aria-hidden
                        style={{ fontSize: actionEmojiSizePx }}
                      >
                        {a.emoji}
                      </span>
                      <span className="truncate">{a.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center">
                    {a.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          {/* 커스텀 액션 입력 */}
          <div className="mt-3 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              직접 보내기
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={onCustomKeyDown}
                placeholder="예: 볼을 꼬집었어요!"
              />
              <Button
                type="button"
                variant="default"
                onClick={handleSendCustom}
                disabled={!customText.trim()}
                className={cn(
                  "transition-all hover:-translate-y-0.5",
                  "ring-1 ring-transparent hover:ring-rose-200/80"
                )}
              >
                보내기
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
