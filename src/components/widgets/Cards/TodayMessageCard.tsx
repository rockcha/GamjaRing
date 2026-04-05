// src/components/TodayMessageCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/features/localAvatar";

/* shadcn/ui */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faMessage,
  faShuffle,
} from "@fortawesome/free-solid-svg-icons";

/* Toast */
import { toast } from "sonner";

/* 타입 */
type UserMessage = {
  id: number;
  author_id: string;
  content: string;
  emoji: string;
  created_at: string;
  updated_at: string;
};

/** 감정 이모지 확장 세트 (밸런스 좋게 36종) */
const EMOJI_CANDIDATES = [
  // 밝음/애정
  "😀",
  "😄",
  "😊",
  "🙂",
  "🥰",
  "😍",
  "😘",
  "😙",
  "😻",
  // 차분/힐링
  "😌",
  "🤗",
  "🫶",
  "🙏",
  "☕️",
  "🌿",
  // 에너지/도전
  "😎",
  "🤩",
  "💪",
  "⚡️",
  "🏃‍♂️",
  // 당황/머쓱
  "😅",
  "😳",
  "🙃",
  "🫠",
  // 피곤/번아웃
  "🥱",
  "😴",
  "😮‍💨",
  "😵‍💫",
  // 우울/서운
  "😞",
  "😔",
  "😟",
  "😢",
  "😭",
  "🥺",
  // 짜증/화남
  "😕",
  "😣",
  "😖",
  "😫",
  "😤",
] as const;

type Props = {
  maxLen?: number;
  /** 저장 성공 시 콜백 (다이얼로그 닫기 등) */
  onSaved?: () => void;
};

export default function TodayMessageCard({ maxLen = 140, onSaved }: Props) {
  const { user } = useUser();

  const [myMsg, setMyMsg] = useState<UserMessage | null>(null);
  const [loadingMy, setLoadingMy] = useState(true);
  const [saving, setSaving] = useState(false);

  // 작성중 상태
  const [draft, setDraft] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string>(
    EMOJI_CANDIDATES[0],
  );
  const [emojiOpen, setEmojiOpen] = useState(false); // ✅ 드롭다운(팝오버) 제어

  const charCount = draft.length;
  const remain = maxLen - charCount;
  const avatarUrl = avatarSrc(user?.avatar_id ?? undefined);
  const nickname = user?.nickname?.trim() || "나";
  const updatedLabel = myMsg?.updated_at
    ? new Date(myMsg.updated_at).toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "아직 저장 전";

  /* 내 메시지 불러오기 */
  useEffect(() => {
    if (!user?.id) return;
    let ignore = false;

    (async () => {
      setLoadingMy(true);
      const { data, error } = await supabase
        .from("user_message")
        .select("*")
        .eq("author_id", user.id)
        .maybeSingle<UserMessage>();

      if (!ignore) {
        if (error) {
          console.error("[TodayMessageCard] my load error:", error);
        } else {
          setMyMsg(data ?? null);
          if (data) {
            setDraft(data.content ?? "");
            setSelectedEmoji(data.emoji ?? EMOJI_CANDIDATES[0]);
          }
        }
        setLoadingMy(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [user?.id]);

  const canSave = useMemo(() => {
    return (
      !saving &&
      selectedEmoji &&
      draft.trim().length > 0 &&
      draft.length <= maxLen
    );
  }, [saving, selectedEmoji, draft, maxLen]);

  const onSave = async () => {
    if (!user?.id || !canSave) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("save_user_message", {
        p_content: draft.trim(),
        p_emoji: selectedEmoji,
      });
      if (error) throw error;
      setMyMsg(data as UserMessage);
      toast.success("저장되었습니다!");
      onSaved?.(); // ✅ 저장 후 콜백
    } catch (e) {
      console.error("[TodayMessageCard] save error:", e);
      toast.error("저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      className={cn(
        "relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-neutral-200/70",
        "bg-[linear-gradient(150deg,rgba(255,255,255,0.96),rgba(249,250,251,0.95))]",
        "shadow-[0_20px_45px_-26px_rgba(15,23,42,0.35)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 h-44 w-44 rounded-full bg-amber-100/70 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-14 h-52 w-52 rounded-full bg-sky-100/70 blur-2xl"
      />

      {/* 헤더 */}
      <div className="relative z-10 px-4 sm:px-6 pt-5 pb-4 flex items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-3">
          <div className="relative shrink-0 h-14 w-14 rounded-2xl ring-1 ring-neutral-200 bg-white shadow-sm overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${nickname} 아바타`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-neutral-500">
                {nickname.slice(0, 1)}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] ring-1 ring-neutral-200">
              {selectedEmoji}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-neutral-900">
              <FontAwesomeIcon icon={faMessage} className="opacity-60" />
              <span>오늘의 기분</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-neutral-600">
              <span className="font-medium text-neutral-800 truncate">
                {nickname}
              </span>
              <span>·</span>
              <span className="tabular-nums">{updatedLabel}</span>
            </div>
          </div>
        </div>

        {/* ✅ 이모지 뱃지가 곧 드롭다운 트리거 */}
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="이모지 선택"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/90 px-2.5 py-1.5 text-xs shadow-sm hover:bg-white"
            >
              <Badge
                variant="outline"
                className="rounded-full px-2 py-0.5 text-base"
              >
                {selectedEmoji}
              </Badge>
              <span className="text-neutral-600">변경</span>
            </button>
          </PopoverTrigger>

          {/* 드롭다운 형태의 이모지 표 */}
          <PopoverContent
            side="bottom"
            align="end"
            className={cn(
              "w-[min(320px,90vw)] rounded-xl p-2",
              "border border-neutral-200/70 bg-white/95 backdrop-blur",
              "shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]",
            )}
          >
            <div className="grid grid-cols-8 gap-1.5">
              {EMOJI_CANDIDATES.map((e) => {
                const active = selectedEmoji === e;
                return (
                  <button
                    key={e}
                    onClick={() => {
                      setSelectedEmoji(e);
                      setEmojiOpen(false); // 선택 즉시 닫힘
                    }}
                    className={cn(
                      "aspect-square rounded-md text-xl flex items-center justify-center transition",
                      active
                        ? "ring-1 ring-neutral-900 bg-white"
                        : "hover:bg-neutral-50",
                    )}
                    aria-label={`이모지 ${e}`}
                  >
                    <span className="text-2xl leading-none">{e}</span>
                  </button>
                );
              })}
            </div>

            {/* 하단: 랜덤 */}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  const rnd =
                    EMOJI_CANDIDATES[
                      Math.floor(Math.random() * EMOJI_CANDIDATES.length)
                    ] ?? EMOJI_CANDIDATES[0];
                  setSelectedEmoji(rnd);
                  setEmojiOpen(false);
                }}
              >
                <FontAwesomeIcon icon={faShuffle} className="mr-1" />
                랜덤
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 본문 */}
      <div className="relative z-10 px-4 sm:px-6 pb-5 space-y-3">
        {/* 텍스트 입력 */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white/85 p-3 sm:p-4 space-y-2.5">
          {loadingMy ? (
            <Skeleton className="h-28 w-full rounded-xl" />
          ) : (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="오늘의 기분과 한마디를 적어주세요…"
              className={cn(
                "min-h-[110px] resize-y rounded-xl bg-white",
                "border-neutral-200 focus-visible:ring-1 focus-visible:ring-neutral-300",
                "text-[15px] leading-relaxed",
              )}
              maxLength={maxLen}
            />
          )}

          {/* 하단 메타 + 저장 */}
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-2.5 py-1 text-xs tabular-nums",
                remain < 0
                  ? "border-red-200 text-red-500"
                  : "border-neutral-200 text-neutral-600",
              )}
            >
              {charCount}/{maxLen}
            </Badge>

            <Button
              onClick={onSave}
              disabled={!canSave}
              className="h-9 rounded-xl bg-neutral-900 px-4 hover:bg-neutral-800"
            >
              <FontAwesomeIcon icon={faPaperPlane} className="mr-2 text-xs" />
              저장
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
