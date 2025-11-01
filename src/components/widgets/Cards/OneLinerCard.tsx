// src/components/widgets/Cards/OneLinerCard.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import supabase from "@/lib/supabase";
import AvatarWidget from "@/components/widgets/AvatarWidget";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCommentDots, faFaceSmile } from "@fortawesome/free-solid-svg-icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** 프로젝트의 기존 이모지 목록이 있다면 이 배열을 교체하세요 */
const EMOJI_CANDIDATES = [
  "😀",
  "😁",
  "😄",
  "😊",
  "🙂",
  "😉",
  "😍",
  "😘",
  "😚",
  "😇",
  "🤗",
  "🤭",
  "😅",
  "😂",
  "🤣",
  "🙃",
  "🤔",
  "😐",
  "😴",
  "🥱",
  "😤",
  "😮‍💨",
  "😢",
  "😭",
  "😡",
  "🤯",
  "😱",
  "😳",
  "😌",
  "😎",
  "🤤",
  "🤩",
  "🥰",
  "🥹",
  "🤝",
  "👍",
  "🙏",
  "💪",
  "💖",
  "💛",
  "💚",
  "💙",
  "💜",
  "🧡",
  "🖤",
  "🤍",
  "🤎",
  "✨",
  "🌟",
  "🔥",
];

type OneLiner = {
  id: number;
  author_id: string;
  content: string;
  emoji: string;
  created_at: string;
  updated_at: string;
};

function getMyNickname(user: any): string {
  return (
    user?.user_metadata?.nickname ??
    user?.nickname ??
    user?.profile?.nickname ??
    user?.email?.split?.("@")?.[0] ??
    "나"
  );
}

/** 외부 props 없이 <OneLinerCard /> 사용 */
export default function OneLinerCard() {
  const { user } = useUser();
  const { partnerId: couplePartnerId } = useCoupleContext();

  const myId = user?.id ?? null;
  const myNickname = getMyNickname(user);
  const partnerId = useMemo(
    () => couplePartnerId ?? user?.partner_id ?? null,
    [couplePartnerId, user?.partner_id]
  );

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-none shadow-lg",
        "px-5 sm:px-7 py-5"
      )}
      role="region"
      aria-label="오늘의 한마디 카드"
    >
      {/* 상단 헤더 */}
      <header className="mb-4 flex items-center gap-2">
        <FontAwesomeIcon
          icon={faCommentDots}
          className="text-neutral-700"
          aria-hidden
        />
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900">
          오늘의 한마디
        </h3>
      </header>

      {/* 내 한마디 → 파트너 한마디 */}
      <div className="flex flex-col gap-6">
        <SelfSection myId={myId} myNickname={myNickname} />
        {partnerId && <PartnerSection partnerId={partnerId} />}
      </div>
    </Card>
  );
}

/* ─────────────────────────────────────────────
 * 공통 말풍선 (보기용)
 * ──────────────────────────────────────────── */
function Bubble({
  loading,
  content,
  emoji,
  clamp = 6,
}: {
  loading: boolean;
  content: string;
  emoji: string;
  clamp?: number;
}) {
  return (
    <div className="relative">
      <div
        className={cn(
          "rounded-2xl border border-neutral-200/80 bg-white/95",
          "px-5 sm:px-6 py-5 sm:py-6",
          "shadow-[0_1px_0_rgba(0,0,0,0.02)]"
        )}
      >
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
          </div>
        ) : (
          <p
            className={cn(
              "text-[17px] sm:text-[18px] leading-relaxed text-neutral-800 whitespace-pre-wrap",
              "break-words",
              "line-clamp-[var(--clamp)] font-hand"
            )}
            style={{ ["--clamp" as any]: String(clamp) }}
          >
            “{content}”
          </p>
        )}
      </div>

      {/* 말풍선 꼬리 */}
      <span
        aria-hidden
        className={cn(
          "absolute left-8 -bottom-1.5 h-[14px] w-[14px] rotate-45",
          "bg-white/95 border-l border-b border-neutral-200/80"
        )}
      />
      {/* 이모지 배지 */}
      {!loading && (
        <span
          className={cn(
            "absolute -top-3 right-3",
            "rounded-full border border-neutral-200/70 bg-white/90 px-2 py-0.5 text-base"
          )}
          title={`오늘의 기분: ${emoji}`}
          aria-label={`오늘의 기분: ${emoji}`}
        >
          {emoji}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
 * 섹션 헤더 (아바타 + 닉네임 + 우측 상태)
 * ──────────────────────────────────────────── */
function SectionHeader({
  nickname,
  tone = "emerald",
  rightAddon,
  avatar,
}: {
  nickname: string;
  tone?: "emerald" | "rose";
  rightAddon?: React.ReactNode;
  avatar: React.ReactNode;
}) {
  const toneClass = tone === "emerald" ? "text-emerald-800" : "text-rose-800";
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {avatar}
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-[15px] sm:text-[16px] font-semibold",
              toneClass
            )}
          >
            {nickname}
          </span>
          <span className="text-neutral-700 text-[15px] sm:text-[16px] font-medium">
            의 한마디
          </span>
        </div>
      </div>
      {rightAddon}
    </div>
  );
}

/* ─────────────────────────────────────────────
 * “나” 섹션 — 카드 클릭 → 인라인 편집, 자동저장
 * ──────────────────────────────────────────── */
function SelfSection({
  myId,
  myNickname,
}: {
  myId: string | null;
  myNickname: string;
}) {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<OneLiner | null>(null);

  // 인라인 편집 상태
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [emoji, setEmoji] = useState("🙂");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 이모지 팝오버 제어 (중요: blur 가드)
  const [emojiOpen, setEmojiOpen] = useState(false);

  const MAX = 140;

  const reload = useCallback(async () => {
    if (!myId) {
      setMsg(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_message")
      .select("*")
      .eq("author_id", myId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<OneLiner>();
    if (error) console.error("[SelfSection] load error:", error);
    setMsg(data ?? null);
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // realtime
  const channelName = useMemo(
    () => (myId ? `one_liner_live:${myId}` : "one_liner_live"),
    [myId]
  );
  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_message",
          filter: `author_id=eq.${myId}`,
        },
        (payload: any) => {
          // 편집 중이면 외부 갱신 무시
          if (editing) return;
          if (payload?.new) setMsg(payload.new as OneLiner);
          else if (payload?.eventType === "DELETE") setMsg(null);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [myId, channelName, editing]);

  // 저장 로직 (오토세이브 / blur)
  const saveToDb = useCallback(
    async (nextContent: string, nextEmoji: string) => {
      if (!myId) return;
      const trimmed = nextContent.trim();
      if (trimmed.length === 0 || trimmed.length > MAX) return;

      setSaving("saving");

      // 낙관적 업데이트
      setMsg((prev) => {
        const base: OneLiner = prev ?? {
          id: -1,
          author_id: myId,
          content: trimmed,
          emoji: nextEmoji || "🙂",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return {
          ...base,
          content: trimmed,
          emoji: nextEmoji || "🙂",
          updated_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase.from("user_message").upsert(
        {
          id: msg?.id,
          author_id: myId,
          content: trimmed,
          emoji: nextEmoji || "🙂",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (error) {
        console.error("[SelfSection] save error:", error);
        setSaving("idle");
        return;
      }
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 1000);
    },
    [myId, MAX, msg?.id]
  );

  // 디바운스 오토세이브
  useEffect(() => {
    if (!editing) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveToDb(draft, emoji);
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, emoji, editing, saveToDb]);

  // 편집 시작: 카드 클릭
  const startEdit = useCallback(() => {
    if (editing) return;
    setDraft(msg?.content ?? "");
    setEmoji(msg?.emoji ?? "🙂");
    setEditing(true);
  }, [editing, msg?.content, msg?.emoji]);

  // blur 시 저장 및 읽기 모드 전환 (이모지 팝오버 열림일 때는 종료 금지)
  const onBlurContainer = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      if (emojiOpen) return; // 🔒 팝오버 열림 중엔 종료 금지
      if (!editing) return;
      void saveToDb(draft, emoji);
      setEditing(false);
    },
    [editing, draft, emoji, saveToDb, emojiOpen]
  );

  const content = msg?.content ?? "오늘 한마디를 남겨보세요.";
  const statusText =
    saving === "saving" ? "저장 중..." : saving === "saved" ? "저장됨" : "";

  return (
    <section
      className={cn(
        "rounded-2xl p-4 sm:p-5",
        "bg-gradient-to-b from-emerald-50/50 to-transparent",
        "transition-colors"
      )}
    >
      <SectionHeader
        nickname={myNickname}
        tone="emerald"
        avatar={<AvatarWidget type="user" size="md" enableMenu={false} />}
        rightAddon={
          <span
            aria-live="polite"
            className={cn(
              "text-xs",
              saving === "saving"
                ? "text-neutral-500"
                : saving === "saved"
                ? "text-emerald-600"
                : "text-transparent"
            )}
          >
            {statusText}
          </span>
        }
      />

      {/* 보기 모드: 카드 클릭 → 편집 모드 */}
      {!editing ? (
        <button
          type="button"
          onClick={startEdit}
          className="mt-3 block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 rounded-2xl"
          aria-label="오늘의 한마디 편집 모드로 전환"
        >
          <Bubble
            loading={loading}
            content={content}
            emoji={msg?.emoji ?? "🙂"}
          />
        </button>
      ) : (
        <EditableBubble
          className="mt-3"
          draft={draft}
          setDraft={setDraft}
          emoji={emoji}
          setEmoji={setEmoji}
          maxLen={MAX}
          onBlurContainer={onBlurContainer}
          emojiOpen={emojiOpen}
          setEmojiOpen={setEmojiOpen}
        />
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────
 * 인라인 편집용 말풍선 (오토세이브 + 이모지 팝오버, 제어형)
 * ──────────────────────────────────────────── */
function EditableBubble({
  className,
  draft,
  setDraft,
  emoji,
  setEmoji,
  maxLen,
  onBlurContainer,
  emojiOpen,
  setEmojiOpen,
}: {
  className?: string;
  draft: string;
  setDraft: (v: string) => void;
  emoji: string;
  setEmoji: (v: string) => void;
  maxLen: number;
  onBlurContainer: (e: React.FocusEvent<HTMLDivElement>) => void;
  emojiOpen: boolean;
  setEmojiOpen: (v: boolean) => void;
}) {
  const remain = maxLen - draft.length;
  const tooLong = remain < 0;

  return (
    <div className={cn("relative", className)} onBlur={onBlurContainer}>
      <div
        className={cn(
          "rounded-2xl border border-neutral-200/80 bg-white/95",
          "px-5 sm:px-6 py-5 sm:py-6",
          "shadow-[0_1px_0_rgba(0,0,0,0.02)]"
        )}
      >
        <div className="flex items-start gap-3">
          {/* 이모지 선택 (제어형 Popover) */}
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-10 w-12 shrink-0 rounded-xl ring-1 ring-neutral-200/70",
                  "bg-white text-center text-xl",
                  "outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70",
                  "flex items-center justify-center gap-1"
                )}
                // 클릭 직전 blur로 편집 종료되는 것 방지
                onMouseDownCapture={(e) => e.stopPropagation()}
              >
                <span>{emoji}</span>
              </button>
            </PopoverTrigger>

            <PopoverContent
              className="z-50 w-64 p-2"
              align="start"
              sideOffset={6}
              onOpenAutoFocus={() => {}}
            >
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_CANDIDATES.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="h-8 w-8 rounded-md hover:bg-neutral-100 text-lg leading-none"
                    onClick={() => {
                      setEmoji(em);
                      setEmojiOpen(false); // 선택 후 닫기
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* 텍스트 영역 */}
          <div className="min-w-0 flex-1">
            <textarea
              aria-label="오늘의 한마디 입력"
              className={cn(
                "w-full resize-none bg-transparent",
                "text-[17px] sm:text-[18px] leading-relaxed text-neutral-800",
                "outline-none placeholder:text-neutral-400"
              )}
              rows={3}
              placeholder="오늘 한마디를 남겨보세요…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />

            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[12px] text-neutral-500">
                입력 중이면 자동 저장돼요
              </span>
              <span
                className={cn(
                  "text-[12px]",
                  tooLong ? "text-rose-600 font-semibold" : "text-neutral-500"
                )}
                aria-live="polite"
              >
                {remain >= 0 ? `남은 글자수 ${remain}` : `초과 ${-remain}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 말풍선 꼬리 */}
      <span
        aria-hidden
        className={cn(
          "absolute left-8 -bottom-1.5 h-[14px] w-[14px] rotate-45",
          "bg-white/95 border-l border-b border-neutral-200/80"
        )}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
 * 파트너 섹션 (읽기 전용)
 * ──────────────────────────────────────────── */
function PartnerSection({ partnerId }: { partnerId: string }) {
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("상대");
  const [msg, setMsg] = useState<OneLiner | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: nickData } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", partnerId)
        .maybeSingle<{ nickname: string }>();
      if (alive && nickData?.nickname) setNickname(nickData.nickname ?? "상대");

      const { data: msgData } = await supabase
        .from("user_message")
        .select("*")
        .eq("author_id", partnerId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle<OneLiner>();

      if (alive) {
        setMsg(msgData ?? null);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [partnerId]);

  // realtime
  const channelName = useMemo(() => `one_liner_live:${partnerId}`, [partnerId]);
  useEffect(() => {
    const ch = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_message",
          filter: `author_id=eq.${partnerId}`,
        },
        (payload: any) => {
          if (payload?.new) setMsg(payload.new as OneLiner);
          else if (payload?.eventType === "DELETE") setMsg(null);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [channelName, partnerId]);

  const emoji = msg?.emoji ?? "🙂";
  const content = msg?.content ?? "아직 메시지가 없어요.";

  return (
    <section
      className={cn(
        "rounded-2xl p-4 sm:p-5",
        "bg-gradient-to-b from-rose-50/50 to-transparent"
      )}
    >
      <SectionHeader
        nickname={nickname}
        tone="rose"
        avatar={<AvatarWidget type="partner" size="md" enableMenu={false} />}
      />
      <div className="mt-3">
        <Bubble loading={loading} content={content} emoji={emoji} />
      </div>
    </section>
  );
}
