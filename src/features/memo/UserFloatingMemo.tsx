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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faNoteSticky, faSpinner } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/* -------------------- Types & Props -------------------- */
type Mode = "view" | "edit";

type Props = {
  /** 카드 헤더 왼쪽 아이콘 (FontAwesome) */
  icon?: IconDefinition;
  /** 외부에서 여백/정렬 조정용 */
  className?: string;
  /** 접근성 및 SR 전용 라벨 */
  label?: string;
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

/* -------------------- Component -------------------- */
export default function UserMemoEmojiButton({
  icon = faNoteSticky,
  className = "",
  label = "메모장",
}: Props) {
  const { user } = useUser(); // { id: string, ... }

  // 기본 보기 모드
  const [mode, setMode] = useState<Mode>("view");

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false); // fetch 진행중
  const [saving, setSaving] = useState(false); // 저장 진행중
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

  /** 저장: 스위치로만 저장(편집→꺼짐) */
  const save = useCallback(
    async (next?: string) => {
      if (!user?.id) {
        toast.error("로그인이 필요해요.");
        return false;
      }
      const body = typeof next === "string" ? next : content;

      // 변경 없으면 보기 모드로만 전환
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

  /** 마운트 시 로드 */
  useEffect(() => {
    fetchOrEnsure();
  }, [fetchOrEnsure]);

  /** 글머리/이모지 퀵바 */
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

  /** 스위치 전환 로직
   * checked = true  → 편집모드 시작 (“수정하기”)
   * checked = false → 저장 실행 후 보기모드 (“저장하기”)
   */
  const handleModeSwitch = async (checked: boolean) => {
    if (saving || loading) return;

    if (checked) {
      // 보기 → 편집 시작
      setMode("edit");
      requestAnimationFrame(() => taRef.current?.focus());
    } else {
      // 편집 → 저장 후 보기
      const ok = await save();
      if (!ok) {
        // 저장 실패 시 스위치 다시 켜서 편집 유지
        setMode("edit");
      }
    }
  };

  const isEditing = mode === "edit";

  return (
    <Card
      className={["p-4 sm:p-5 space-y-3", className].join(" ")}
      aria-label={label}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xl text-neutral-900">
          <FontAwesomeIcon icon={icon} aria-hidden />
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-xl font-bold">메모장</span>
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

        {/* 모드 스위치: 좌측 '수정하기' | 스위치 | 우측 '저장하기' (항상 노출, 아이콘 없음) */}
        <div className="flex items-center gap-3">
          <span
            className={
              "text-sm sm:text-base " +
              (isEditing ? "text-muted-foreground" : "font-medium")
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
              "text-sm sm:text-base " +
              (isEditing ? "font-medium" : "text-muted-foreground")
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
            className="min-h-[260px] resize-y mt-2"
            disabled={loading || saving}
          />
        </>
      ) : (
        <div className="min-h-[200px] rounded-md border p-3">
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
