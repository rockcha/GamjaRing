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
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faNoteSticky, faSpinner } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/* -------------------- Types & Props -------------------- */
type Mode = "view" | "edit";

type Props = {
  icon?: IconDefinition; // 메모 패널 아이콘
  className?: string; // 트리거 버튼 외부 클래스
  caption?: string; // 접근성 라벨
  iconSize?: number; // 트리거 PNG 크기 (기본 48)
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
/*                             Memo Panel (Card)                               */
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
      {/* 헤더 (미니멀) */}
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
            className={
              "text-sm " + (isEditing ? "text-muted-foreground" : "font-medium")
            }
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
            className={
              "text-sm " + (isEditing ? "font-medium" : "text-muted-foreground")
            }
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

          <Textarea
            ref={taRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
            }}
            placeholder="오늘의 생각, 해야 할 일, 링크 등을 자유롭게 적어보세요."
            className="min-h-[260px] resize-y mt-2 bg-white"
            disabled={loading || saving}
          />
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
/*                      Trigger Button + Dialog (PNG)                          */
/* ========================================================================== */
export default function UserMemoEmojiButton({
  icon = faNoteSticky,
  className = "",
  caption = "메모",
  iconSize = 48,
}: Props) {
  const [open, setOpen] = useState(false);

  // 아이콘 리소스 (/memo.png)
  const iconSrc = "/memo.png";
  const [imgLoaded, setImgLoaded] = useState(false);

  const wrapperSize = Math.max(40, iconSize);
  const imageSize = Math.round(wrapperSize * 0.9);

  return (
    <>
      {/* 트리거 버튼 (NotificationDropdown 스타일과 동일) */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={caption}
        className={["p-0 grid place-items-center", className].join(" ")}
        style={{ width: wrapperSize + 20, height: wrapperSize + 20 }}
      >
        <span className="relative inline-grid place-items-center">
          <img
            src={iconSrc}
            alt={caption}
            className="object-contain transition-transform duration-200 hover:scale-110 active:scale-95"
            style={{ width: imageSize, height: imageSize }}
            draggable={false}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
          />
          {!imgLoaded && (
            <Skeleton
              className="rounded-full absolute"
              style={{ width: imageSize, height: imageSize }}
            />
          )}
        </span>
      </Button>

      {/* 미니멀 중앙 모달 + 은은한 구분선 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={[
            "p-0 border-none rounded-2xl bg-white",
            "shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)]",
            "sm:max-w-md w-[min(92vw,560px)]",
            "max-h-[85svh]",
          ].join(" ")}
        >
          {/* 헤더 */}
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {caption}
            </DialogTitle>
          </DialogHeader>

          {/* 상단 헤어라인(아주 은은하게) */}
          <Separator className="mx-5 bg-neutral-200/60" />

          {/* 내용 스크롤 */}
          <div className="px-5 py-3">
            <ScrollArea className="max-h-[60svh] pr-1">
              <MemoPanel icon={icon} />
            </ScrollArea>
          </div>

          {/* 하단 헤어라인 */}
          <Separator className="mx-5 bg-neutral-200/60" />

          {/* 푸터 */}
          <DialogFooter className="px-5 py-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-lg px-5 shadow-sm hover:shadow transition-all"
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
