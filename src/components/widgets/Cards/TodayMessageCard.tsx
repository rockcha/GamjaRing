// src/components/TodayMessageCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

/* shadcn/ui */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
    EMOJI_CANDIDATES[0]
  );
  const [emojiOpen, setEmojiOpen] = useState(false); // ✅ 드롭다운(팝오버) 제어

  const charCount = draft.length;
  const remain = maxLen - charCount;

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
        "mx-auto w-full max-w-2xl rounded-2xl border border-neutral-200/60",
        "bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85",
        "shadow-[0_10px_30px_-16px_rgba(0,0,0,0.25)]"
      )}
    >
      {/* 헤더: 좌 타이틀, 우 이모지 요약/변경 트리거 */}
      <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-neutral-900">
          <FontAwesomeIcon icon={faMessage} className="opacity-60" />
          <span>오늘의 기분</span>
        </div>

        {/* ✅ 이모지 뱃지가 곧 드롭다운 트리거 */}
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="이모지 선택"
              className="inline-flex items-center gap-2"
            >
              <Badge
                variant="outline"
                className="rounded-full px-2.5 py-1 text-base bg-white/70"
              >
                {selectedEmoji}
              </Badge>
              <span className="text-xs text-neutral-500 hover:text-neutral-700">
                변경
              </span>
            </button>
          </PopoverTrigger>

          {/* 드롭다운 형태의 이모지 표 */}
          <PopoverContent
            side="bottom"
            align="end"
            className={cn(
              "w-[min(320px,90vw)] rounded-xl p-2",
              "border border-neutral-200/70 bg-white/95 backdrop-blur",
              "shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]"
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
                        : "hover:bg-neutral-50"
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
                    ];
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
      <div className="px-4 sm:px-5 py-4 space-y-3">
        {/* 텍스트 입력 */}
        <div className="space-y-2">
          {loadingMy ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="오늘의 기분과 한마디를 적어주세요…"
              className={cn(
                "min-h-[100px] resize-y bg-white rounded-xl",
                "border-neutral-200 focus-visible:ring-1 focus-visible:ring-neutral-300"
              )}
              maxLength={maxLen}
            />
          )}

          {/* 하단 메타 + 저장 */}
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-xs tabular-nums",
                remain < 0 ? "text-red-500" : "text-neutral-500"
              )}
            >
              {charCount}/{maxLen}
            </span>

            <Button
              onClick={onSave}
              disabled={!canSave}
              className="h-9 rounded-lg"
            >
              <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
              저장
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
