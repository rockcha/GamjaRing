"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NotebookPen, Loader2, PencilLine, Eye, Plus } from "lucide-react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

type Mode = "view" | "edit";

/** URL 자동 링크 */
const urlSplitRe = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi;
const urlExactRe = /^(https?:\/\/[^\s)]+|www\.[^\s)]+)$/i;
function renderWithAutoLinks(text: string) {
  const lines = text.split("\n");
  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      {lines.map((line, i) => {
        const parts = line.split(urlSplitRe);
        return (
          <p key={i} className="mb-2">
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

/** 줄 맨 앞에 접두사 삽입 */
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

export default function UserMemoModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useUser(); // { id: string }
  const [mode, setMode] = useState<Mode>("edit");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const bullets = useMemo(
    () => ["•", "✅", "☑️", "⭐", "📌", "🚨", "❗", "⚠️"],
    []
  );

  /** 없으면 즉시 생성해서 보여주기 */
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

  /** 저장: 항상 UPSERT */
  const save = useCallback(
    async (next?: string) => {
      if (!user?.id) return;
      const body = typeof next === "string" ? next : content;
      if (!dirty && next === undefined) return;
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
      } catch (e: any) {
        console.error("save error:", e);
        toast.error(e?.message || "메모 저장에 실패했어요.");
      } finally {
        setSaving(false);
      }
    },
    [user?.id, content, dirty]
  );

  /** 디바운스 자동 저장 */
  useEffect(() => {
    if (!open || mode !== "edit" || !dirty) return;
    const t = setTimeout(() => save(), 1200);
    return () => clearTimeout(t);
  }, [content, dirty, open, mode, save]);

  /** 열리면 보장/조회 */
  useEffect(() => {
    if (open) fetchOrEnsure();
  }, [open, fetchOrEnsure]);

  /** 닫힐 때 자동 저장 */
  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v && dirty) save();
      onOpenChange(v);
      if (v) setMode("edit");
    },
    [dirty, save, onOpenChange]
  );

  /** 글머리 버튼 */
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5" />내 메모
            {loading && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
            {!loading && dirty && (
              <Badge variant="secondary" className="ml-2">
                수정됨
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            닫을 때 자동 저장돼요. 보기 모드에서는 URL이 링크로 보입니다.
          </DialogDescription>
        </DialogHeader>

        {/* 모드 토글 */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={mode === "edit" ? "default" : "secondary"}
            onClick={() => setMode("edit")}
            className="gap-1"
          >
            <PencilLine className="h-4 w-4" />
            편집
          </Button>
          <Button
            size="sm"
            variant={mode === "view" ? "default" : "secondary"}
            onClick={() => setMode("view")}
            className="gap-1"
          >
            <Eye className="h-4 w-4" />
            보기
          </Button>
        </div>

        {/* 글머리/이모지 퀵바 */}
        {mode === "edit" && (
          <div className="flex flex-wrap items-center gap-2">
            {["•", "✅", "☑️", "⭐", "📌", "🚨", "❗", "⚠️"].map((b) => (
              <Button
                key={b}
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={() => handleBullet(b)}
                title={`${b} 글머리`}
              >
                <span className="text-base">{b}</span>
              </Button>
            ))}
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button
              size="sm"
              variant="secondary"
              className="gap-1"
              onClick={() => {
                const stamp =
                  new Date().toLocaleString(undefined, {
                    year: "2-digit",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  }) + " — ";
                const next = (content ? content + "\n" : "") + stamp;
                setContent(next);
                setDirty(true);
                requestAnimationFrame(() => taRef.current?.focus());
              }}
            >
              <Plus className="h-4 w-4" />
              타임스탬프
            </Button>
          </div>
        )}

        {/* 본문 */}
        <div className="mt-2">
          {mode === "edit" ? (
            <Textarea
              ref={taRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setDirty(true);
              }}
              onBlur={() => dirty && !saving && save()}
              placeholder="오늘의 생각, 해야 할 일, 링크 등을 자유롭게 적어보세요."
              className="min-h-[260px] resize-y"
              disabled={loading}
            />
          ) : (
            <div className="min-h-[200px] rounded-md border p-3">
              {content.trim().length === 0 ? (
                <p className="text-muted-foreground">메모가 비어 있어요.</p>
              ) : (
                renderWithAutoLinks(content)
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
