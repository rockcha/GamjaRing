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
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import supabase from "@/lib/supabase";
import type { NotificationType } from "@/utils/notification/sendUserNotification";
import { usePartnerNotification } from "@/utils/notification/usePartnerNotification";

/* shadcn/ui Tooltip */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* 아이콘 - 닫기 버튼 */
import { X } from "lucide-react";

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
  | "볼콕 찌르기"
  | "감자하트 보내기"
  | "이불 덮어주기"
  | "볼따구 말랑하기"
  | "행운 감자 보내기"
  | "꼬옥 충전하기"
  | "손 꼭 잡기"
  | "이마 뽀뽀하기"
  | "간식 몰래주기"
  | "포근하게 쓰다듬기"
  | "감자담요 말아주기"
  | "눈맞춤 보내기"
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
  { key: "볼콕 찌르기", label: "볼콕 찌르기", emoji: "☝️" },
  { key: "감자하트 보내기", label: "감자하트 보내기", emoji: "🥔" },
  { key: "이불 덮어주기", label: "이불 덮어주기", emoji: "🛌" },
  { key: "볼따구 말랑하기", label: "볼따구 말랑하기", emoji: "🍡" },
  { key: "행운 감자 보내기", label: "행운 감자 보내기", emoji: "🍀" },
  { key: "꼬옥 충전하기", label: "꼬옥 충전하기", emoji: "🔋" },
  { key: "손 꼭 잡기", label: "손 꼭 잡기", emoji: "🤝" },
  { key: "이마 뽀뽀하기", label: "이마 뽀뽀하기", emoji: "😚" },
  { key: "간식 몰래주기", label: "간식 몰래주기", emoji: "🍪" },
  { key: "포근하게 쓰다듬기", label: "포근하게 쓰다듬기", emoji: "🧸" },
  { key: "감자담요 말아주기", label: "감자담요 말아주기", emoji: "🥔" },
  { key: "눈맞춤 보내기", label: "눈맞춤 보내기", emoji: "✨" },

  { key: "음침한 말 하기", label: "음침한 말 하기", emoji: "🌚" },
  { key: "째려보기", label: "째려보기", emoji: "😒" },
  { key: "우울해하기", label: "우울해하기", emoji: "😔" },
];

/**
 * 외부에서 <PartnerActionButton /> 하나만 쓰면 됨
 */
export default function PartnerActionButton({
  className,
  label = "💕",
  size = "icon",
  emojiSizePx = 22,
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
  const { sendToPartner } = usePartnerNotification();
  const senderId = (user as any)?.id ?? null;

  const [receiverLabel, setReceiverLabel] = useState<string>("상대");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<ActionKey | null>(null);
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
    setSending(type);
    try {
      await sendToPartner(
        { type },
        {
          showSuccess: true,
          successMessage: `‘${receiverLabel}’에게 ${emoji} ${type} 알림을 보냈어요!`,
        }
      );
    } finally {
      setSending(null);
    }
  }

  async function handleSendCustom() {
    const trimmed = customText.trim();
    if (!trimmed) {
      toast.error("보낼 내용을 입력해주세요.");
      return;
    }

    const { error } = await sendToPartner(
      {
        type: "커스텀 액션",
        description: `${trimmed} 💕`,
      },
      {
        showSuccess: true,
        successMessage: `‘${receiverLabel}’에게 커스텀 액션을 보냈어요!`,
      }
    );

    if (!error) {
      setCustomText("");
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
      {/* 트리거 버튼 */}
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
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
                  "relative h-10 w-10 transition-all",
                  "before:pointer-events-none before:absolute before:inset-0",
                  "before:opacity-0 hover:before:opacity-100 before:transition-opacity",
                  "before:bg-[radial-gradient(120px_80px_at_50%_-20%,rgba(255,182,193,0.35),transparent_60%)]",
                  className,
                  { "w-auto px-3": size !== "icon" }
                )}
                aria-label="애정 액션 보내기"
                disabled={disabled}
              >
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
        <DialogContent
          className={cn(
            // 모바일 폭 & 둥근 모서리
            "w-[calc(100vw-2rem)] sm:max-w-[520px] rounded-2xl",
            // 패딩: 모바일은 조금 작게
            "p-4 sm:p-6",
            "flex max-h-[min(640px,85vh)] flex-col overflow-hidden",
            // iOS 사파리 안전영역 약간 고려
            "sm:mx-0"
          )}
        >
          {/* 닫기 버튼: 항상 보이도록 우상단 고정 */}
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

          {/* 헤더: 스티키로 상단 고정 (모바일에서 스크롤 시 헤더 유지) */}
          <div className="-mx-4 -mt-4 mb-3 shrink-0 px-4 pt-4 pb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-t-2xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base sm:text-lg">
                {receiverLabel}에게 액션 보내기
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                아래에서 하나를 선택하거나, 직접 메시지를 적어 보낼 수 있어요.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* 액션 그리드 */}
          <TooltipProvider delayDuration={120}>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACTION_ITEMS.map((a) => (
                <Tooltip key={a.key}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      className={cn(
                        "group relative justify-start h-12 sm:h-12 px-3 text-[13px] font-medium",
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
            </div>
          </TooltipProvider>

          {/* 커스텀 액션 입력 */}
          <div className="mt-4 shrink-0 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              직접 보내기
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={onCustomKeyDown}
                placeholder="예: 볼을 꼬집었어요!"
                className="h-10"
              />
              <Button
                type="button"
                variant="default"
                onClick={handleSendCustom}
                disabled={!customText.trim()}
                className={cn(
                  "h-10 transition-all hover:-translate-y-0.5",
                  "ring-1 ring-transparent hover:ring-rose-200/80"
                )}
              >
                보내기
              </Button>
            </div>
          </div>

          {/* 푸터: 스크롤 시 하단 고정 */}
          <div className="mt-4 -mx-4 shrink-0 px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-b-2xl">
            <DialogFooter className="sm:justify-end">
              <DialogClose asChild>
                <Button variant="ghost" className="h-10">
                  닫기
                </Button>
              </DialogClose>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
