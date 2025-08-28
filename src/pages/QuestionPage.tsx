// src/pages/QuestionPage.tsx
"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { GetQuestionById } from "@/utils/GetQuestionById";
import { useUser } from "@/contexts/UserContext";
import { useCompleteTask } from "@/utils/tasks/CompleteTask";
import { useToast } from "@/contexts/ToastContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import supabase from "@/lib/supabase";

// shadcn/ui
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { CoolMode } from "@/components/magicui/cool-mode";
// ✅ 추가: 파트너 아바타 위젯

import AvatarWidget from "@/components/widgets/AvatarWidget";

// icons
import {
  Loader2,
  CheckCircle2,
  Ban,
  Smile,
  ChevronDown,
  PencilLine,
  Save as SaveIcon,
} from "lucide-react";

const EMOJIS_5x6 = [
  "😀", // 기본 웃음
  "😁",
  "😂",
  "🤣",
  "😄",
  "😅",
  "😆",
  "😉",
  "😊",
  "😋",
  "😎",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😙",
  "😚",
  "🙂",
  "🤗",
  "🤩",
  "🤔",
  "😏",
  "😮",
  "😢",
  "🥺",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
] as const;

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ✅ 표시용 질문 ID 계산: 완료면 이전 질문, 아니면 오늘 질문
const getDisplayId = (currentId: number | null, completed: boolean) => {
  if (currentId == null) return null;
  if (!completed) return currentId;
  const prev = currentId - 1;
  return prev >= 0 ? prev : null;
};

export default function QuestionPage() {
  const { user } = useUser();
  const { completeTask } = useCompleteTask();
  const { open } = useToast();

  const [question, setQuestion] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<number | null>(null); // 오늘의 id
  const [answer, setAnswer] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false); // 오늘 제출 여부
  const [loading, setLoading] = useState(true);

  // 제출 완료 상태에서만 "수정하기"로 편집 허용
  const [editing, setEditing] = useState(false);
  const canEdit = useMemo(() => !submitted || editing, [submitted, editing]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 이모지 dropdown
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiBtnRef = useRef<HTMLButtonElement | null>(null);
  const emojiMenuRef = useRef<HTMLDivElement | null>(null);

  const loadQuestionText = useCallback(async (qid: number | null) => {
    if (qid == null || qid < 0) return null;
    return await GetQuestionById(qid);
  }, []);

  const loadMyAnswer = useCallback(
    async (qid: number | null) => {
      if (!qid || !user?.id) return null;
      const { data, error } = await supabase
        .from("answer")
        .select("content")
        .eq("user_id", user.id)
        .eq("question_id", qid)
        .maybeSingle();
      if (error) return null;
      return data?.content ?? null;
    },
    [user?.id]
  );

  // 현재 상태(questionId, submitted) 기준으로 화면에 보여줄 질문/답변 새로고침
  const refreshDisplayContent = useCallback(async () => {
    const displayId = getDisplayId(questionId, submitted);
    if (displayId == null) {
      setQuestion("표시할 이전 질문이 없습니다.");
      setAnswer("");
      return;
    }
    const [qText, myAns] = await Promise.all([
      loadQuestionText(displayId),
      loadMyAnswer(displayId),
    ]);
    setQuestion(qText ?? "");
    setAnswer(myAns ?? "");
  }, [questionId, submitted, loadQuestionText, loadMyAnswer]);

  // 초기 로드
  useEffect(() => {
    const fetchQuestion = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("daily_task")
        .select("question_id, completed")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      setQuestionId(data.question_id);
      setSubmitted(data.completed);
      setEditing(false);

      const displayId = getDisplayId(data.question_id, data.completed);
      if (displayId == null) {
        setQuestion("표시할 이전 질문이 없습니다.");
        setAnswer("");
        setLoading(false);
        return;
      }
      const [qText, myAns] = await Promise.all([
        loadQuestionText(displayId),
        loadMyAnswer(displayId),
      ]);
      setQuestion(qText ?? "");
      setAnswer(myAns ?? "");
      setLoading(false);
    };

    fetchQuestion();
  }, [user, loadQuestionText, loadMyAnswer]);

  // 드롭다운 외부 클릭/ESC 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        emojiOpen &&
        !emojiBtnRef.current?.contains(t) &&
        !emojiMenuRef.current?.contains(t)
      ) {
        setEmojiOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (emojiOpen && e.key === "Escape") setEmojiOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [emojiOpen]);

  // 저장(버튼 클릭 시만)
  const persistAnswer = useCallback(
    async (content: string) => {
      if (!user) return false;
      const displayId = getDisplayId(questionId, submitted);
      if (displayId == null) return false;

      setSaveStatus("saving");
      try {
        const { data: updated, error: upErr } = await supabase
          .from("answer")
          .update({ content })
          .eq("user_id", user.id)
          .eq("question_id", displayId)
          .select("user_id")
          .maybeSingle();

        if (upErr || !updated) {
          const { error: insErr } = await supabase.from("answer").insert({
            user_id: user.id,
            question_id: displayId,
            content,
          });
          if (insErr) throw insErr;
        }

        setSaveStatus("saved");
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(
          () => setSaveStatus("idle"),
          1500
        );
        return true;
      } catch {
        setSaveStatus("error");
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(
          () => setSaveStatus("idle"),
          2000
        );
        return false;
      }
    },
    [user, questionId, submitted]
  );

  // 단일 버튼 동작
  const onPrimaryClick = useCallback(async () => {
    if (submitted && !editing) {
      setEditing(true);
      requestAnimationFrame(() => textareaRef.current?.focus());
      return;
    }

    const trimmed = answer.trim();
    if (!trimmed) return;

    const ok = await persistAnswer(trimmed);
    if (!ok) return;

    if (!submitted) {
      if (user?.partner_id) {
        await sendUserNotification({
          senderId: user.id,
          receiverId: user.partner_id,
          type: "답변등록",
          description: `${user.nickname}님이 답변을 등록했어요! `,
          isRequest: false,
        }).catch(() => {});
      }
      await completeTask().catch(() => {});
      setSubmitted(true);
      setEditing(false);
      await refreshDisplayContent();
    } else {
      setEditing(false);
      await refreshDisplayContent();
    }
  }, [
    submitted,
    editing,
    answer,
    persistAnswer,
    user,
    completeTask,
    refreshDisplayContent,
  ]);

  // 커서 위치에 이모지 삽입(편집 가능 시만)
  const insertAtCursor = (token: string) => {
    if (!canEdit) return;
    const el = textareaRef.current;
    if (!el) {
      setAnswer((prev) => (prev ?? "") + token);
      return;
    }
    const start = el.selectionStart ?? answer.length;
    const end = el.selectionEnd ?? start;
    const next =
      (answer ?? "").slice(0, start) + token + (answer ?? "").slice(end);
    setAnswer(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <main className="mx-auto w-full max-w-screen-lg px-4 md:px-6 ">
      <Card className="relative mx-auto bg-white border shadow-sm max-w-3xl">
        {loading ? (
          <CardContent className="p-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            로딩 중...
          </CardContent>
        ) : (
          <>
            <CardHeader className=" text-center items-center" />

            <CardContent className="space-y-5">
              {/* 질문 본문 */}
              <p className="text-lg md:text-xl text-[#5b3d1d] whitespace-pre-line text-center leading-relaxed">
                {question ? `"${question}"` : "표시할 질문이 없습니다."}
              </p>

              <Separator />

              {/* 안내줄 + 파트너 감시(?) 위젯 */}
              <div className="mx-auto w-full md:w-[80%] lg:w-[70%]">
                {/* 중앙 정렬 안내 텍스트 */}
                <div className="mb-2 text-center text-xs text-[#6b533b]">
                  {canEdit ? (
                    <>버튼을 눌러 이모지를 선택하면 현재 커서에 삽입돼요</>
                  ) : (
                    <>
                      제출 완료 상태입니다. 수정하려면 아래에서 ‘수정하기’를
                      누르세요.
                    </>
                  )}
                </div>

                {/* 이모지 버튼 + (오른쪽) 파트너 위젯 */}
                <div className="flex items-center justify-center">
                  {/* 버튼 + 드롭다운을 위한 상대 컨테이너 */}
                  <div className="relative">
                    <Button
                      ref={emojiBtnRef}
                      type="button"
                      variant="outline"
                      className={`active:scale-95 transition mr-2 ${
                        canEdit ? "hover:cursor-pointer" : "pointer-events-none"
                      }`}
                      onClick={() => canEdit && setEmojiOpen((o) => !o)}
                      aria-expanded={emojiOpen}
                      aria-haspopup="menu"
                    >
                      <Smile className="h-4 w-4" />
                      이모지 선택
                      <ChevronDown className="h-4 w-4" />
                    </Button>

                    {emojiOpen && (
                      <div
                        ref={emojiMenuRef}
                        role="menu"
                        className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2  w-[280px] rounded-lg border bg-white p-3 shadow-xl"
                      >
                        <div className="grid grid-cols-5 gap-2">
                          {EMOJIS_5x6.map((e) => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => {
                                insertAtCursor(e);
                                setEmojiOpen(false);
                              }}
                              className="h-10 w-full rounded-md border bg-white hover:bg-amber-50 hover:shadow active:scale-95 transition text-2xl flex items-center justify-center hover:cursor-pointer"
                              aria-label={`${e} 삽입`}
                              title={`${e} 삽입`}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 버튼 오른쪽에 붙는 파트너 아바타 + 말풍선 */}
                  <div className="hidden sm:flex items-center gap-2 ml-3">
                    <AvatarWidget type="partner" size="sm" />
                    <span className="text-[12px] font-semibold">잘 써조!</span>
                  </div>
                </div>
              </div>

              {/* 내 답변 */}
              <div className="mx-auto w-full md:w-[80%] lg:w-[70%] space-y-2 text-center">
                <Textarea
                  ref={textareaRef}
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  readOnly={!canEdit}
                  placeholder={
                    submitted
                      ? editing
                        ? "수정 중입니다. 저장하기를 눌러 반영합니다."
                        : "제출 완료 상태입니다. 수정하려면 ‘수정하기’를 누르세요."
                      : "이곳에 답변을 입력해주세요..."
                  }
                  className="mx-auto min-h-[220px] md:min-h-[260px] resize-none bg-blue-50 text-base md:text-lg leading-relaxed"
                />
              </div>
            </CardContent>

            {/* 단일 버튼 */}
            <CardFooter className="justify-center">
              <CoolMode options={{ particle: "💙", particleCount: 3, size: 4 }}>
                {" "}
                <Button
                  onClick={onPrimaryClick}
                  className="min-w-[120px] hover:cursor-pointer active:scale-95 transition"
                >
                  {submitted ? (
                    editing ? (
                      <>
                        <SaveIcon className="mr-2 h-4 w-4" />
                        저장하기
                      </>
                    ) : (
                      <>
                        <PencilLine className="mr-2 h-4 w-4" />
                        수정하기
                      </>
                    )
                  ) : (
                    <>
                      <SaveIcon className="mr-2 h-4 w-4" />
                      저장하기
                    </>
                  )}
                </Button>
              </CoolMode>
            </CardFooter>
          </>
        )}
      </Card>
    </main>
  );
}
