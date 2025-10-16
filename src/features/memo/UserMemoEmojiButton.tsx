// src/components/UserMemoEmojiButton.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

/* shadcn/ui */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* Font Awesome (보기/빈 상태 표시용) */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faNoteSticky, faSpinner } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/* utils */
import { cn } from "@/lib/utils";

/* -------------------- Types & Props -------------------- */
type Mode = "view" | "edit";

type Props = {
  /** 트리거 이모지 (기본: 🗒️) */
  label?: string;
  /** 버튼 크기 */
  size?: "icon" | "sm" | "default" | "lg";
  /** 모달 제목 */
  caption?: string;
  /** 트리거 외부 클래스 */
  className?: string;
  /** 내부 패널 헤더 아이콘 (보기/비었을 때만 사용) */
  icon?: IconDefinition;
  /** 이모지 폰트 크기 (px) */
  emojiSizePx?: number;
};

/* -------------------- URL 자동 링크 -------------------- */
const urlSplitRe = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi;
const urlExactRe = /^(https?:\/\/[^\s)]+|www\.[^\s)]+)$/i;
function renderWithAutoLinks(text: string) {
  const lines = text.split("\n");
  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      {lines.map((line, i) => {
        const parts = line.split(urlSplitRe);
        return (
          <p key={i} className="mb-2 last:mb-0">
            {parts.map((part, j) => {
              if (urlExactRe.test(part)) {
                const href = part.startsWith("http") ? part : `https://${part}`;
                return (
                  <a
                    key={j}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {part}
                  </a>
                );
              }
              return <React.Fragment key={j}>{part}</React.Fragment>;
            })}
          </p>
        );
      })}
    </div>
  );
}

/* -------------------- 줄 맨 앞 접두사 삽입 -------------------- */
function insertPrefixAtCurrentLine(
  textarea: HTMLTextAreaElement,
  prefix: string
) {
  const { selectionStart } = textarea;
  const value = textarea.value;
  const prevNL = value.lastIndexOf("\n", Math.max(0, selectionStart - 1));
  const lineStart = prevNL === -1 ? 0 : prevNL + 1;
  const nextValue =
    value.slice(0, lineStart) + `${prefix} ` + value.slice(lineStart);
  const nextCursor = selectionStart + prefix.length + 1;
  return { nextValue, nextCursor };
}

/* ========================================================================== */
/*                               Memo Panel                                   */
/* ========================================================================== */
function MemoPanel({ icon = faNoteSticky }: { icon?: IconDefinition }) {
  const { user } = useUser();
  const [mode, setMode] = useState<Mode>("view");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const bullets = useMemo(
    () => ["•", "✅", "☑️", "⭐", "📌", "🚨", "❗", "⚠️"],
    []
  );

  const fetchOrEnsure = useCallback(async () => {
    if (!user?.id) {
      toast.error("로그인이 필요해요.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_memo")
        .select("content")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;

      if (!data) {
        const { data: created, error: insErr } = await supabase
          .from("user_memo")
          .upsert({ user_id: user.id, content: "" }, { onConflict: "user_id" })
          .select("content")
          .single();
        if (insErr) throw insErr;
        setContent(created?.content ?? "");
      } else {
        setContent(data.content ?? "");
      }
      setDirty(false);
    } catch (e: any) {
      console.error("fetchOrEnsure error:", e);
      toast.error(e?.message || "메모를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const save = useCallback(
    async (next?: string) => {
      if (!user?.id) {
        toast.error("로그인이 필요해요.");
        return false;
      }
      const body = typeof next === "string" ? next : content;

      if (!dirty && next === undefined) {
        setMode("view");
        return true;
      }

      setSaving(true);
      try {
        const { error } = await supabase
          .from("user_memo")
          .upsert(
            { user_id: user.id, content: body },
            { onConflict: "user_id" }
          )
          .select("content")
          .single();
        if (error) throw error;
        setDirty(false);
        setMode("view");
        toast.success("메모를 저장했어요.");
        return true;
      } catch (e: any) {
        console.error("save error:", e);
        toast.error(e?.message || "메모 저장에 실패했어요.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [user?.id, content, dirty]
  );

  useEffect(() => {
    fetchOrEnsure();
  }, [fetchOrEnsure]);

  const handleBullet = (b: string) => {
    if (!taRef.current) return;
    const { nextValue, nextCursor } = insertPrefixAtCurrentLine(
      taRef.current,
      b
    );
    setContent(nextValue);
    setDirty(true);
    requestAnimationFrame(() => {
      if (taRef.current) {
        taRef.current.selectionStart = taRef.current.selectionEnd = nextCursor;
        taRef.current.focus();
      }
    });
  };

  const handleModeSwitch = async (checked: boolean) => {
    if (saving || loading) return;

    if (checked) {
      setMode("edit");
      requestAnimationFrame(() => taRef.current?.focus());
    } else {
      const ok = await save();
      if (!ok) setMode("edit");
    }
  };

  const isEditing = mode === "edit";

  return (
    <Card className="p-0 border-none shadow-none bg-transparent space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-neutral-900">
          <div className="flex items-center gap-2">
            {loading && (
              <FontAwesomeIcon
                icon={faSpinner}
                className="h-4 w-4 animate-spin text-muted-foreground"
                title="불러오는 중"
              />
            )}
            {!loading && dirty && isEditing && (
              <Badge variant="secondary" className="ml-1">
                수정됨
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-sm",
              isEditing ? "text-muted-foreground" : "font-medium"
            )}
          >
            저장하기
          </span>
          <Switch
            checked={isEditing}
            onCheckedChange={handleModeSwitch}
            aria-label="수정하기/저장하기 전환"
            disabled={loading || saving}
          />
          <span
            className={cn(
              "text-sm",
              isEditing ? "font-medium" : "text-muted-foreground"
            )}
          >
            수정하기
          </span>
        </div>
      </div>

      {/* 본문 */}
      {isEditing ? (
        <>
          {/* 글머리 퀵바 */}
          <div className="flex flex-wrap items-center gap-2">
            {bullets.map((b) => (
              <Button
                key={b}
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={() => handleBullet(b)}
                title={`${b} 글머리`}
                aria-label={`${b} 글머리`}
              >
                <span className="text-base">{b}</span>
              </Button>
            ))}
          </div>

          {/* 깔끔한 텍스트영역 */}
          <Textarea
            ref={taRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
            }}
            placeholder="오늘의 생각, 해야 할 일, 링크 등을 자유롭게 적어보세요."
            disabled={loading || saving}
            className={cn(
              "mt-3 min-h-[280px] md:min-h-[320px] resize-y",
              // 배경/보더
              "rounded-2xl border border-neutral-200 bg-white shadow-[inset_0_1px_0_rgba(0,0,0,0.02)]",
              // 패딩/타이포
              "px-4 py-3 text-[15px] leading-7 tracking-[-0.005em]",
              "placeholder:text-neutral-400",
              // 인터랙션
              "transition-colors focus-visible:outline-none",
              "focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:border-rose-200",
              "hover:border-neutral-300"
            )}
          />

          {/* 하단 보조 라벨 + 글자수 */}
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="select-none">이모지/링크 자동 인식</span>
            <span>{content.length.toLocaleString()}자</span>
          </div>
        </>
      ) : (
        <div className="min-h-[200px] p-1">
          {content.trim().length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FontAwesomeIcon icon={faNoteSticky} className="h-4 w-4" />
              <span>
                메모가 비어 있어요. 스위치를 켜서 ‘수정하기’로 작성해보세요.
              </span>
            </div>
          ) : (
            renderWithAutoLinks(content)
          )}
        </div>
      )}
    </Card>
  );
}

/* ========================================================================== */
/*                        Trigger Button + Dialog (Emoji)                      */
/* ========================================================================== */
export default function UserMemoEmojiButton({
  label = "🗒️",
  size = "icon",
  caption = "메모",
  className,
  icon = faNoteSticky,
  emojiSizePx = 22, // 트리거 이모지 크기(기본 ↑)
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 트리거 버튼: PartnerActionButton과 동일한 감성 */}
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-flex")} onClick={() => setOpen(true)}>
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
                aria-label={`${caption} 열기`}
              >
                <span
                  style={{ fontSize: size === "icon" ? emojiSizePx : 18 }}
                  className={size !== "icon" ? "font-medium" : ""}
                >
                  {label}
                </span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            {caption}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            // 넓이 확장 + 반응형
            "sm:max-w-[640px] md:max-w-[760px] w-[min(96vw,760px)]",
            "max-h-[88svh]",
            // 시각 스타일
            "rounded-2xl",
            "border border-border",
            "shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)]"
          )}
        >
          <DialogHeader>
            <DialogTitle>{caption}</DialogTitle>
            <DialogDescription>
              간단한 메모, 할 일, 링크를 자유롭게 기록해보세요.{" "}
              <br className="hidden sm:block" />줄 맨 앞에 이모지/기호를 빠르게
              넣어 글머리를 만들 수도 있어요.
            </DialogDescription>
          </DialogHeader>

          {/* 내용 스크롤 영역 */}
          <div className="mt-1">
            <ScrollArea className="max-h-[62svh] md:max-h-[66svh] pr-1">
              <MemoPanel icon={icon} />
            </ScrollArea>
          </div>

          <Separator className="bg-neutral-200/60" />

          <DialogFooter className="pt-1">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="rounded-lg px-5 transition-all hover:-translate-y-0.5"
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
