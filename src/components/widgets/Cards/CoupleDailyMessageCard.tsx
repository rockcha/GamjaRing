// src/components/CoupleDailyMessageCard.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

/* shadcn/ui */
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCommentDots,
  faUser,
  faUsers,
  faFaceSmile,
  faPen,
  faFloppyDisk,
  faCheckCircle,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

/* (선택) 아바타가 있으면 더 이쁨 */
import AvatarWidget from "@/components/widgets/AvatarWidget";

type Row = {
  id: string;
  author_id: string;
  content: string;
  emoji_type_id: number | null;
  message_date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
  is_edited: boolean;
};

type EmojiRow = { id: number; char: string };

type SaveStatus = "idle" | "saving" | "saved" | "error";

function todayKST() {
  return new Date()
    .toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })
    .slice(0, 10);
}

export default function CoupleDailyMessageCard() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const [my, setMy] = useState<Row | null>(null);
  const [partner, setPartner] = useState<Row | null>(null);
  const [partnerNickname, setPartnerNickname] = useState<string>("파트너");

  // 편집 상태(내 메시지)
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [emojiList, setEmojiList] = useState<EmojiRow[]>([]);
  const [emojiId, setEmojiId] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const dateLabel = useMemo(() => {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "long",
      timeZone: "Asia/Seoul",
    }).format(new Date());
  }, []);

  /* ─────────────────────────────────────────────────────────────
   * 데이터 로드: 오늘(KST) 기준, 나/파트너 메시지 + 이모지 목록
   */
  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const kst = todayKST();

    // 이모지(전체)
    const { data: emojis } = await supabase
      .from("emoji_type")
      .select("id,char")
      .order("id");
    setEmojiList((emojis ?? []) as EmojiRow[]);

    // 파트너 닉네임
    if (user.partner_id) {
      const { data: p } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", user.partner_id)
        .maybeSingle();
      if (p?.nickname) setPartnerNickname(p.nickname);
    }

    // 오늘 메시지(나+파트너). RLS가 같은 커플만 허용한다고 가정
    const authorIds = [user.id, user.partner_id].filter(Boolean);
    const { data: rows, error } = await supabase
      .from("couple_daily_message")
      .select("*")
      .in("author_id", authorIds as string[])
      .eq("message_date", kst)
      .order("created_at", { ascending: true });

    if (!error && rows) {
      const mine = rows.find((r) => r.author_id === user.id) ?? null;
      const yours = rows.find((r) => r.author_id === user.partner_id) ?? null;
      setMy(mine as Row | null);
      setPartner(yours as Row | null);

      // 편집 버퍼 업데이트
      if (mine) {
        setContent(mine.content);
        setEmojiId(mine.emoji_type_id);
        setEditing(false);
      } else {
        setContent("");
        setEmojiId(null);
        setEditing(true); // 처음에는 작성 모드로
      }
    }
    setLoading(false);
  }, [user?.id, user?.partner_id]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* ─────────────────────────────────────────────────────────────
   * 저장: RPC 우선, 실패 시 fallback(upsert)
   */
  const save = useCallback(
    async (body: { content: string; emoji_type_id: number | null }) => {
      if (!user?.id) return false;
      const kst = todayKST();
      setSaveStatus("saving");

      // 1) RPC 시도
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "upsert_today_couple_message",
        {
          p_content: body.content,
          p_emoji_type_id: body.emoji_type_id,
          p_message_date: kst,
        }
      );

      if (!rpcErr && rpcData) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1000);
        await refresh();
        return true;
      }

      // 2) fallback: couple_id 조회 -> upsert
      //   (RLS 정책에서 couple_members 접근 허용이 되어 있어야 함)
      const { data: cm, error: cmErr } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (cmErr || !cm?.couple_id) {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 1500);
        return false;
      }

      const { error: upErr } = await supabase
        .from("couple_daily_message")
        .upsert(
          [
            {
              couple_id: cm.couple_id,
              author_id: user.id,
              message_date: kst,
              content: body.content,
              emoji_type_id: body.emoji_type_id,
            },
          ],
          { onConflict: "couple_id,author_id,message_date" }
        );

      if (upErr) {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 1500);
        return false;
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1000);
      await refresh();
      return true;
    },
    [user?.id, refresh]
  );

  /* ─────────────────────────────────────────────────────────────
   * 렌더
   */
  if (!user?.id) return null;

  return (
    <Card className="bg-white/90 border shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCommentDots} className="text-amber-600" />
            <CardTitle className="text-lg md:text-xl">오늘의 한마디</CardTitle>
          </div>
          <Badge
            variant="secondary"
            className="bg-amber-50 text-amber-800 border"
          >
            {dateLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
          <>
            <Skeleton className="h-9 w-40" />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-[160px] w-full rounded-xl" />
                <Skeleton className="h-9 w-28" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-[160px] w-full rounded-xl" />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 상단: 사용자/파트너 아바타 라벨 */}
            <div className="flex items-center justify-center gap-4 text-[12px]">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/70 border text-amber-900">
                <AvatarWidget type="user" />
                <FontAwesomeIcon icon={faUser} />내 메시지
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/70 border text-blue-900">
                <AvatarWidget type="partner" />
                <FontAwesomeIcon icon={faUsers} />
                {partnerNickname}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* 내 메시지 */}
              <section className="rounded-2xl border bg-[#FAF7F2]/60 p-4">
                <header className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={faUser}
                      className="text-neutral-700"
                    />
                    <span className="font-semibold">내 메시지</span>
                    {my?.is_edited && (
                      <Badge variant="outline" className="ml-1 text-[11px]">
                        수정됨
                      </Badge>
                    )}
                  </div>

                  {/* 이모지 선택 */}
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => setEditing(true)}
                          >
                            <FontAwesomeIcon icon={faPen} className="mr-2" />
                            {my ? "수정하기" : "작성하기"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          내용을 입력하거나 수정합니다
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </header>

                {/* 보기/편집 전환 */}
                {editing ? (
                  <div className="space-y-3">
                    {/* 이모지 피커 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        className="rounded-full h-9"
                        onClick={() => setEmojiId(null)}
                      >
                        <FontAwesomeIcon icon={faFaceSmile} className="mr-2" />
                        {emojiId != null
                          ? emojiList.find((e) => e.id === emojiId)?.char ??
                            "이모지 선택"
                          : "이모지 선택"}
                      </Button>

                      {/* 간단한 목록(스크롤) */}
                      <div className="flex gap-1 overflow-x-auto max-w-full py-1">
                        {emojiList.map((e) => (
                          <button
                            key={e.id}
                            onClick={() => setEmojiId(e.id)}
                            className={cn(
                              "h-9 w-9 grid place-items-center rounded-xl border bg-white hover:bg-amber-100",
                              emojiId === e.id ? "ring-2 ring-amber-400" : ""
                            )}
                            aria-label={`이모지 ${e.char}`}
                          >
                            <span className="text-[18px]">{e.char}</span>
                          </button>
                        ))}
                        <button
                          onClick={() => setEmojiId(null)}
                          className="h-9 px-3 ml-1 rounded-xl border text-xs text-neutral-600 hover:bg-neutral-100 whitespace-nowrap"
                        >
                          이모지 해제
                        </button>
                      </div>
                    </div>

                    <Textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className={cn(
                        "min-h-[160px] rounded-xl",
                        "bg-[linear-gradient(transparent_29px,rgba(0,0,0,0.04)_30px)] bg-[length:100%_30px] bg-blue-50/40",
                        "border-amber-200 focus-visible:ring-amber-300"
                      )}
                      placeholder="오늘의 한마디를 적어주세요…"
                    />
                    <div className="text-right text-[11px] text-neutral-600 -mt-2">
                      {content.length.toLocaleString("ko-KR")} 자
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={async () => {
                          const trimmed = content.trim();
                          if (!trimmed) return;
                          const ok = await save({
                            content: trimmed,
                            emoji_type_id: emojiId,
                          });
                          if (ok) setEditing(false);
                        }}
                        disabled={saveStatus === "saving"}
                        className="bg-neutral-700 hover:bg-amber-600 text-white"
                      >
                        <FontAwesomeIcon icon={faFloppyDisk} className="mr-2" />
                        {saveStatus === "saving" ? "저장 중…" : "저장하기"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditing(false);
                          setContent(my?.content ?? "");
                          setEmojiId(my?.emoji_type_id ?? null);
                        }}
                        disabled={saveStatus === "saving"}
                      >
                        취소
                      </Button>
                    </div>

                    <div className="min-h-[18px] text-[12px]">
                      {saveStatus === "saved" && (
                        <span className="text-emerald-600">
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="mr-1"
                          />
                          저장됨
                        </span>
                      )}
                      {saveStatus === "error" && (
                        <span className="text-red-600">
                          <FontAwesomeIcon
                            icon={faTriangleExclamation}
                            className="mr-1"
                          />
                          저장 실패 — 잠시 후 재시도
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "rounded-xl border bg-white p-4",
                      !my && "text-neutral-400 italic"
                    )}
                  >
                    {my ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {my.emoji_type_id != null && (
                            <span className="text-2xl">
                              {emojiList.find((e) => e.id === my.emoji_type_id)
                                ?.char ?? "😊"}
                            </span>
                          )}
                          <span className="text-xs text-neutral-500">
                            {new Date(my.updated_at).toLocaleString("ko-KR", {
                              timeZone: "Asia/Seoul",
                            })}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
                          {my.content}
                        </div>
                      </div>
                    ) : (
                      <>
                        아직 작성한 메시지가 없습니다. “작성하기”를 눌러
                        시작해보세요.
                      </>
                    )}
                  </div>
                )}
              </section>

              {/* 파트너 메시지 (읽기 전용) */}
              <section className="rounded-2xl border bg-white p-4">
                <header className="mb-2 flex items-center gap-2">
                  <AvatarWidget type="partner" size="sm" />
                  <span className="font-semibold">
                    {partnerNickname}의 메시지
                  </span>
                  {partner?.is_edited && (
                    <Badge variant="outline" className="ml-1 text-[11px]">
                      수정됨
                    </Badge>
                  )}
                </header>

                <div
                  className={cn(
                    "rounded-xl border p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/60",
                    !partner && "text-neutral-400 italic"
                  )}
                >
                  {partner ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {partner.emoji_type_id != null && (
                          <span className="text-3xl">
                            {emojiList.find(
                              (e) => e.id === partner.emoji_type_id
                            )?.char ?? "😊"}
                          </span>
                        )}
                        <span className="text-xs text-neutral-500">
                          {new Date(partner.updated_at).toLocaleString(
                            "ko-KR",
                            {
                              timeZone: "Asia/Seoul",
                            }
                          )}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
                        {partner.content}
                      </div>
                    </div>
                  ) : (
                    <>
                      아직 파트너 메시지가 없어요. 조금 뒤에 다시 확인해보세요.
                    </>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Separator className="w-full" />
        <div className="w-full text-[12px] text-center text-neutral-500 py-3">
          서로의 오늘을 가볍게 공유해 보세요 🌟
        </div>
      </CardFooter>
    </Card>
  );
}
