// src/components/widgets/Cards/OneLinerCard.tsx
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";
import { Loader2, MessageCircle, Smile } from "lucide-react";

import AvatarWidget from "@/components/widgets/AvatarWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";
import supabase from "@/lib/supabase";

const EMOJI_CANDIDATES = [
  "🙂",
  "😀",
  "😄",
  "😁",
  "😆",
  "😂",
  "🤣",
  "😉",
  "😊",
  "😇",
  "🥰",
  "😍",
  "😘",
  "😚",
  "😌",
  "😎",
  "🥳",
  "🥺",
  "🥹",
  "😴",
  "🤗",
  "🤭",
  "🤔",
  "🫶",
  "👍",
  "👏",
  "🙌",
  "💪",
  "🙏",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🩷",
  "🤍",
  "🩶",
  "🖤",
  "🤎",
  "💖",
  "💗",
  "💓",
  "💕",
  "💞",
  "💘",
  "💝",
  "💟",
  "❣️",
  "💌",
  "✨",
  "⭐",
  "🌟",
  "💫",
  "🌈",
  "☀️",
  "🌤️",
  "☁️",
  "🌧️",
  "❄️",
  "🌙",
  "🌸",
  "🌷",
  "🌹",
  "🌻",
  "🌼",
  "🌿",
  "🍃",
  "🍀",
  "🌊",
  "🏝️",
  "🔥",
  "🍎",
  "🍓",
  "🍑",
  "🍒",
  "🥔",
  "🍟",
  "🍕",
  "🍗",
  "🍜",
  "🍙",
  "🍪",
  "🍩",
  "🍰",
  "☕",
  "🍵",
  "🎂",
  "🎁",
  "🎈",
  "🎀",
  "🎉",
  "🎊",
  "🎧",
  "🎵",
  "🎬",
  "🎮",
  "📷",
  "📚",
  "📝",
  "🚗",
  "🏠",
  "🛌",
];

const MAX_LENGTH = 140;
const DEFAULT_EMOJI = "🙂";

type OneLiner = {
  id: number;
  author_id: string;
  content: string;
  emoji: string;
  created_at: string;
  updated_at: string;
};

function getNickname(user: any) {
  return (
    user?.user_metadata?.nickname ??
    user?.nickname ??
    user?.profile?.nickname ??
    user?.email?.split?.("@")?.[0] ??
    "나"
  );
}

export default function OneLinerCard({ className }: { className?: string }) {
  const { user } = useUser();
  const { partnerId: couplePartnerId } = useCoupleContext();

  const myId = user?.authId ?? user?.id ?? null;
  const myNickname = getNickname(user);
  const partnerId = couplePartnerId ?? user?.partner_id ?? null;

  return (
    <Card
      className={cn("overflow-hidden rounded-xl shadow-sm", className)}
      role="region"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-5 text-muted-foreground" />
            <CardTitle className="text-xl">오늘의 한마디</CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <SelfSection myId={myId} nickname={myNickname} />
        {partnerId && <PartnerSection partnerId={partnerId} />}
      </CardContent>
    </Card>
  );
}

function SelfSection({
  myId,
  nickname,
}: {
  myId: string | null;
  nickname: string;
}) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<OneLiner | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emojiInteractionRef = useRef(false);

  const loadMessage = useCallback(async () => {
    if (!myId) {
      setMessage(null);
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

    if (error) console.error("[OneLinerCard] self load error:", error);
    setMessage(data ?? null);
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    loadMessage();
  }, [loadMessage]);

  useEffect(() => {
    if (!myId) return;

    const channel = supabase
      .channel(`one_liner_live:${myId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_message",
          filter: `author_id=eq.${myId}`,
        },
        (payload: any) => {
          if (editing) return;
          if (payload?.new) setMessage(payload.new as OneLiner);
          if (payload?.eventType === "DELETE") setMessage(null);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [editing, myId]);

  const saveToDb = useCallback(
    async (nextContent: string, nextEmoji: string) => {
      if (!myId) return;
      const content = nextContent.trim();
      if (!content || content.length > MAX_LENGTH) return;
      if (
        message &&
        message.content === content &&
        message.emoji === nextEmoji
      ) {
        return;
      }

      setSaving("saving");
      setMessage((prev) => ({
        id: prev?.id ?? -1,
        author_id: myId,
        content,
        emoji: nextEmoji,
        created_at: prev?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("user_message").upsert(
        {
          author_id: myId,
          content,
          emoji: nextEmoji,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "author_id" },
      );

      if (error) {
        console.error("[OneLinerCard] save error:", error);
        setSaving("idle");
        return;
      }

      setSaving("saved");
      window.setTimeout(() => setSaving("idle"), 1000);
    },
    [message, myId],
  );

  useEffect(() => {
    if (!editing) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      saveToDb(draft, emoji);
    }, 700);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, editing, emoji, saveToDb]);

  const startEditing = () => {
    setDraft(message?.content ?? "");
    setEmoji(message?.emoji ?? DEFAULT_EMOJI);
    setEditing(true);
  };

  const finishEditing = async (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    if (emojiInteractionRef.current) return;
    if (emojiOpen) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await saveToDb(draft, emoji);
    setEditing(false);
  };

  const markEmojiInteraction = useCallback(() => {
    emojiInteractionRef.current = true;
    window.setTimeout(() => {
      emojiInteractionRef.current = false;
    }, 250);
  }, []);

  const status =
    saving === "saving" ? "저장 중" : saving === "saved" ? "저장됨" : "";

  return (
    <section className="rounded-lg border bg-card p-4">
      <PersonHeader
        avatar={<AvatarWidget type="user" size="md" enableMenu={false} />}
        nickname={nickname}
        label="내 한마디"
        status={status}
        saving={saving === "saving"}
        emojiDisplay={!editing ? message?.emoji ?? DEFAULT_EMOJI : undefined}
        emojiControl={
          editing ? (
            <EmojiPickerButton
              emoji={emoji}
              open={emojiOpen}
              onOpenChange={setEmojiOpen}
              onEmojiChange={setEmoji}
              onInteract={markEmojiInteraction}
            />
          ) : undefined
        }
      />

      {editing ? (
        <EditableMessage
          className="mt-3"
          draft={draft}
          onBlur={finishEditing}
          onDraftChange={setDraft}
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="mt-3 block w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MessageBubble
            loading={loading}
            content={message?.content ?? "오늘의 한마디를 남겨보세요."}
            muted={!message}
          />
        </button>
      )}
    </section>
  );
}

function PartnerSection({ partnerId }: { partnerId: string }) {
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("상대방");
  const [message, setMessage] = useState<OneLiner | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadPartner() {
      setLoading(true);
      const [{ data: userData }, { data: messageData, error }] =
        await Promise.all([
          supabase
            .from("users")
            .select("nickname")
            .eq("id", partnerId)
            .maybeSingle<{ nickname: string }>(),
          supabase
            .from("user_message")
            .select("*")
            .eq("author_id", partnerId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle<OneLiner>(),
        ]);

      if (!alive) return;
      if (error) console.error("[OneLinerCard] partner load error:", error);
      setNickname(userData?.nickname || "상대방");
      setMessage(messageData ?? null);
      setLoading(false);
    }

    loadPartner();
    return () => {
      alive = false;
    };
  }, [partnerId]);

  useEffect(() => {
    const channel = supabase
      .channel(`one_liner_live:${partnerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_message",
          filter: `author_id=eq.${partnerId}`,
        },
        (payload: any) => {
          if (payload?.new) setMessage(payload.new as OneLiner);
          if (payload?.eventType === "DELETE") setMessage(null);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerId]);

  return (
    <section className="rounded-lg border bg-muted/30 p-4">
      <PersonHeader
        avatar={<AvatarWidget type="partner" size="md" enableMenu={false} />}
        nickname={nickname}
        label="상대 한마디"
        emojiDisplay={message?.emoji ?? DEFAULT_EMOJI}
      />
      <div className="mt-3">
        <MessageBubble
          loading={loading}
          content={message?.content ?? "아직 남긴 한마디가 없어요."}
          muted={!message}
        />
      </div>
    </section>
  );
}

function PersonHeader({
  avatar,
  nickname,
  label,
  status,
  saving,
  emojiDisplay,
  emojiControl,
}: {
  avatar: ReactNode;
  nickname: string;
  label: string;
  status?: string;
  saving?: boolean;
  emojiDisplay?: string;
  emojiControl?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {avatar}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{nickname}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {status && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {saving && <Loader2 className="size-3 animate-spin" />}
            {status}
          </div>
        )}
        {emojiControl}
        {emojiDisplay && (
          <span className="text-4xl leading-none" aria-hidden>
            {emojiDisplay}
          </span>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  loading,
  content,
  muted,
}: {
  loading: boolean;
  content: string;
  muted?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3 rounded-md border bg-background p-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background p-4">
      {muted && (
        <div className="mb-3 text-xs text-muted-foreground">눌러서 작성</div>
      )}
      <p
        className={cn(
          "min-h-12 whitespace-pre-wrap break-words text-sm leading-6",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {content}
      </p>
    </div>
  );
}

function EditableMessage({
  className,
  draft,
  onBlur,
  onDraftChange,
}: {
  className?: string;
  draft: string;
  onBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onDraftChange: (value: string) => void;
}) {
  const remaining = MAX_LENGTH - draft.length;
  const tooLong = remaining < 0;

  return (
    <div className={cn("rounded-md border bg-background p-4", className)} onBlur={onBlur}>
      <div className="mb-3 flex justify-end">
        <span
          className={cn(
            "text-xs",
            tooLong ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {remaining}
        </span>
      </div>

      <Textarea
        autoFocus
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        rows={4}
        maxLength={MAX_LENGTH + 20}
        placeholder="오늘 마음에 남은 말을 적어보세요."
        className="resize-none border-0 bg-transparent p-0 text-sm leading-6 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}

function EmojiPickerButton({
  emoji,
  open,
  onOpenChange,
  onEmojiChange,
  onInteract,
}: {
  emoji: string;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onEmojiChange: (value: string) => void;
  onInteract: () => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex size-12 items-center justify-center rounded-md border bg-background text-3xl leading-none hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="이모지 선택"
          onMouseDownCapture={onInteract}
          onTouchStartCapture={onInteract}
        >
          {emoji || <Smile className="size-5 text-muted-foreground" />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-2"
        align="end"
        onMouseDownCapture={onInteract}
        onTouchStartCapture={onInteract}
      >
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CANDIDATES.map((candidate) => (
            <button
              key={candidate}
              type="button"
              className="flex size-8 items-center justify-center rounded-md text-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                onInteract();
                onEmojiChange(candidate);
                onOpenChange(false);
              }}
            >
              {candidate}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
