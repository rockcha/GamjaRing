// src/components/TodayMessageCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

/* shadcn/ui */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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

/** 😊 기본 + 🫤 우울/다운 계열 확장(+4) */
const EMOJI_CANDIDATES = [
  "😀",
  "🥰",
  "😌",
  "🤗",
  "😎",
  "🤩",
  "😞",
  "😔",
  "😟",
  "😢",
  "😭",
  "😕",
  "😣",
  "😖",
  "😫",
  "🥺",
  "😩",
  "😮‍💨",
  "😶‍🌫️",
  "😬",
] as const;

type Props = { maxLen?: number };

export default function TodayMessageCard({ maxLen = 140 }: Props) {
  const { user } = useUser();

  const [myMsg, setMyMsg] = useState<UserMessage | null>(null);
  const [loadingMy, setLoadingMy] = useState(true);
  const [saving, setSaving] = useState(false);

  // 작성중 상태
  const [draft, setDraft] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string>(
    EMOJI_CANDIDATES[0]
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(true); // 첫 작성 시만 노출

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
            setShowEmojiPicker(false); // 기존 값 있으면 피커 숨김
          } else {
            setShowEmojiPicker(true);
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
      setShowEmojiPicker(false);
      toast.success("저장되었습니다!");
    } catch (e) {
      console.error("[TodayMessageCard] save error:", e);
      toast.error("저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-neutral-200/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold tracking-tight">
            <FontAwesomeIcon icon={faMessage} className="mr-2 opacity-70" />
            나의 한마디
          </CardTitle>

          {/* 선택 이모지 요약 + 변경 */}
          {!showEmojiPicker && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full px-2.5 py-1 text-base"
              >
                {selectedEmoji}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setShowEmojiPicker(true)}
              >
                변경
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 이모지 피커 (필요할 때만 표시) */}
        {showEmojiPicker && (
          <div className="rounded-lg border border-neutral-200 p-2">
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
              {EMOJI_CANDIDATES.map((e) => {
                const active = selectedEmoji === e;
                return (
                  <button
                    key={e}
                    onClick={() => {
                      setSelectedEmoji(e);
                      setShowEmojiPicker(false);
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

            {/* 랜덤 선택 (깔끔 유틸) */}
            <div className="flex justify-end">
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
                  setShowEmojiPicker(false);
                }}
              >
                <FontAwesomeIcon icon={faShuffle} className="mr-1" />
                랜덤
              </Button>
            </div>
          </div>
        )}

        {/* 텍스트 입력 */}
        <div className="space-y-1">
          {loadingMy ? (
            <Skeleton className="h-24 w-full rounded-md" />
          ) : (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="오늘의 기분과 한마디를 적어주세요…"
              className="min-h-[96px] resize-y bg-white"
              maxLength={maxLen}
            />
          )}

          {/* 하단 메타 + 저장 */}
          <div className="flex items-center justify-between pt-1">
            <span
              className={cn(
                "text-xs tabular-nums",
                remain < 0 ? "text-red-500" : "text-neutral-500"
              )}
            >
              {charCount}/{maxLen}
            </span>

            <Button onClick={onSave} disabled={!canSave} className="h-9">
              <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
              저장
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
