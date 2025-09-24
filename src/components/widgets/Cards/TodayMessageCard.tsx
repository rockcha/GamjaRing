// src/components/TodayMessageCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { cn } from "@/lib/utils";

/* shadcn/ui */
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faMessage,
  faCommentDots,
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
  const { partnerId } = useCoupleContext();

  const [myMsg, setMyMsg] = useState<UserMessage | null>(null);
  const [partnerMsg, setPartnerMsg] = useState<UserMessage | null>(null);

  const [loadingMy, setLoadingMy] = useState(true);
  const [loadingPartner, setLoadingPartner] = useState(true);
  const [saving, setSaving] = useState(false);

  const [myName, setMyName] = useState<string>("");
  const [partnerName, setPartnerName] = useState<string>("연인");

  // 작성중 상태
  const [draft, setDraft] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string>(
    EMOJI_CANDIDATES[0]
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(true); // 선택 후 false

  const charCount = draft.length;
  const remain = maxLen - charCount;

  /* 닉네임 셋업 */
  useEffect(() => {
    if (user?.nickname) setMyName(user.nickname);
    else if (user?.id) setMyName("내 메시지");
  }, [user?.nickname, user?.id]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!partnerId) return;
      const { data, error } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", partnerId)
        .maybeSingle<{ nickname: string }>();
      if (!ignore) {
        if (!error && data?.nickname) setPartnerName(data.nickname);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [partnerId]);

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
            setShowEmojiPicker(true); // 처음 작성이면 피커 표시
          }
        }
        setLoadingMy(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [user?.id]);

  /* 연인 메시지 불러오기 – (RLS 허용 시 direct select) */
  useEffect(() => {
    if (!partnerId) {
      setLoadingPartner(false);
      setPartnerMsg(null);
      return;
    }
    let ignore = false;

    (async () => {
      setLoadingPartner(true);

      // 권장: RPC(get_user_message_by_partner) 사용 가능 시 교체
      const { data, error } = await supabase
        .from("user_message")
        .select("*")
        .eq("author_id", partnerId)
        .maybeSingle<UserMessage>();

      if (!ignore) {
        if (error) {
          console.error("[TodayMessageCard] partner load error:", error);
          setPartnerMsg(null);
        } else {
          setPartnerMsg((data as UserMessage) ?? null);
        }
        setLoadingPartner(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [partnerId]);

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
      toast.success("저장되었습니다!"); // ✅ 저장 토스트
    } catch (e) {
      console.error("[TodayMessageCard] save error:", e);
      toast.error("저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-sm border border-neutral-200/70">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold tracking-tight">
            <FontAwesomeIcon icon={faCommentDots} className="mr-2 opacity-80" />
            오늘의 메시지
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* ───────────── 연인 메시지 ───────────── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              className="opacity-70 text-purple-500"
              icon={faMessage}
            />
            <h3 className="font-medium text-purple-700">{partnerName}</h3>
          </div>

          <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4">
            {loadingPartner ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : partnerMsg ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-neutral-600">오늘의 기분:</span>
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1 text-base bg-white"
                  >
                    {partnerMsg.emoji}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap bg-white/70 rounded-md p-3 border border-white">
                  {partnerMsg.content}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-500">
                  아직 메시지가 없어요.
                </p>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            )}
          </div>
        </section>

        <Separator />

        {/* ───────────── 내 메시지 (항상 펼침) ───────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                className="opacity-70 text-blue-500"
                icon={faMessage}
              />
              <h3 className="font-medium text-blue-700">
                {myName || "내 메시지"}
              </h3>
            </div>

            {/* 선택된 이모지 요약 + 변경 */}
            {!showEmojiPicker && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">오늘의 기분:</span>
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-base"
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

          {/* 본문(항상 노출) */}
          <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
            {/* 이모지 선택 or 단일 노출 */}
            {showEmojiPicker ? (
              <div className="grid grid-cols-6 md:grid-cols-9 lg:grid-cols-12 gap-2 rounded-xl p-2 bg-white border border-neutral-200">
                {EMOJI_CANDIDATES.map((e) => {
                  const active = selectedEmoji === e;
                  return (
                    <button
                      key={e}
                      onClick={() => {
                        setSelectedEmoji(e);
                        setShowEmojiPicker(false); // 선택 즉시 그리드 숨김
                      }}
                      className={cn(
                        "aspect-square rounded-lg border text-xl flex items-center justify-center transition",
                        active
                          ? "border-neutral-900 bg-white shadow-sm"
                          : "border-neutral-200 bg-white hover:bg-neutral-50"
                      )}
                      aria-label={`이모지 ${e}`}
                    >
                      <span className="text-2xl leading-none">{e}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">오늘의 기분:</span>
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-base"
                >
                  {selectedEmoji}
                </Badge>
              </div>
            )}

            {/* 텍스트 입력 */}
            <div className="space-y-2">
              {loadingMy ? (
                <Skeleton className="h-24 w-full rounded-xl" />
              ) : (
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="오늘의 기분과 한마디를 적어주세요…"
                  className="min-h-[96px] resize-y bg-white"
                  maxLength={maxLen}
                />
              )}

              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "text-xs",
                    remain < 0 ? "text-red-500" : "text-neutral-500"
                  )}
                >
                  {remain < 0
                    ? `글자수가 ${-remain}자 초과되었어요.`
                    : `최대 ${maxLen}자`}
                </div>
                <Button
                  onClick={onSave}
                  disabled={!canSave}
                  className="gap-2"
                  variant="default"
                  size="sm"
                >
                  <FontAwesomeIcon icon={faPaperPlane} />
                  저장
                </Button>
              </div>
            </div>
          </div>
        </section>
      </CardContent>

      <CardFooter className="pt-0" />
    </Card>
  );
}
