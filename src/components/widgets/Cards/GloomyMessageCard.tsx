// src/components/GloomyMessageCard.tsx
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
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";

/* Toast */
import { toast } from "sonner";

/* 타입 */
type GloomyMessage = {
  id: number;
  author_id: string;
  content: string;
  created_at: string | null;
  updated_at: string | null;
};

type Props = { maxLen?: number };

export default function GloomyMessageCard({ maxLen = 160 }: Props) {
  const { user } = useUser();
  const { partnerId } = useCoupleContext();

  const [myMsg, setMyMsg] = useState<GloomyMessage | null>(null);
  const [partnerMsg, setPartnerMsg] = useState<GloomyMessage | null>(null);

  const [loadingMy, setLoadingMy] = useState(true);
  const [loadingPartner, setLoadingPartner] = useState(true);
  const [saving, setSaving] = useState(false);

  const [myName, setMyName] = useState<string>("내 한마디");
  const [partnerName, setPartnerName] = useState<string>("연인");

  // 작성중
  const [draft, setDraft] = useState("");

  const remain = maxLen - draft.length;
  const canSave = useMemo(
    () => !saving && draft.trim().length > 0 && draft.length <= maxLen,
    [saving, draft, maxLen]
  );

  /* 닉네임 셋업 */
  useEffect(() => {
    if (user?.nickname) setMyName(user.nickname);
    else if (user?.id) setMyName("내 한마디");
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
      if (!ignore && !error && data?.nickname) setPartnerName(data.nickname);
    })();
    return () => {
      ignore = true;
    };
  }, [partnerId]);

  /* 내 메시지 최초 로드 */
  useEffect(() => {
    if (!user?.id) return;
    let ignore = false;
    (async () => {
      setLoadingMy(true);
      const { data, error } = await supabase
        .from("gloomy_messages")
        .select("*")
        .eq("author_id", user.id)
        .maybeSingle<GloomyMessage>();
      if (!ignore) {
        if (error) {
          console.error("[GloomyCard] my load error:", error);
        } else {
          setMyMsg(data ?? null);
          setDraft(data?.content ?? "");
        }
        setLoadingMy(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [user?.id]);

  /* 파트너 메시지 로드 */
  useEffect(() => {
    if (!partnerId) {
      setLoadingPartner(false);
      setPartnerMsg(null);
      return;
    }
    let ignore = false;
    (async () => {
      setLoadingPartner(true);
      const { data, error } = await supabase
        .from("gloomy_messages")
        .select("*")
        .eq("author_id", partnerId)
        .maybeSingle<GloomyMessage>();
      if (!ignore) {
        if (error) {
          console.error("[GloomyCard] partner load error:", error);
          setPartnerMsg(null);
        } else {
          setPartnerMsg(data ?? null);
        }
        setLoadingPartner(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [partnerId]);

  /* Realtime: 파트너 메시지 변경 감지 */
  useEffect(() => {
    if (!partnerId) return;
    const channel = supabase
      .channel(`gloomy_messages:partner:${partnerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gloomy_messages",
          filter: `author_id=eq.${partnerId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setPartnerMsg(null);
            return;
          }
          setPartnerMsg((payload.new as GloomyMessage) ?? null);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerId]);

  /* Realtime: 내 메시지도(다른 탭/기기 수정 동기화) */
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`gloomy_messages:me:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gloomy_messages",
          filter: `author_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setMyMsg(null);
            setDraft("");
            return;
          }
          const row = payload.new as GloomyMessage;
          setMyMsg(row ?? null);
          setDraft(row?.content ?? "");
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  /* 저장 */
  const onSave = async () => {
    if (!user?.id || !canSave) return;
    setSaving(true);
    try {
      // 이미 있으면 update, 없으면 insert (author_id 하나만 유지)
      if (myMsg?.id) {
        const { data, error } = await supabase
          .from("gloomy_messages")
          .update({ content: draft.trim() })
          .eq("id", myMsg.id)
          .select()
          .maybeSingle<GloomyMessage>();
        if (error) throw error;
        setMyMsg(data ?? null);
      } else {
        const { data, error } = await supabase
          .from("gloomy_messages")
          .insert({ author_id: user.id, content: draft.trim() })
          .select()
          .maybeSingle<GloomyMessage>();
        if (error) throw error;
        setMyMsg(data ?? null);
      }
      toast.success("저장했어요.");
    } catch (e) {
      console.error("[GloomyCard] save error:", e);
      toast.error("저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  };

  const resetMyDraft = () => {
    setDraft(myMsg?.content ?? "");
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-sm border border-neutral-200/70">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold tracking-tight">
            <FontAwesomeIcon icon={faCommentDots} className="mr-2 opacity-80" />
            음침한 한마디
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* ───────────── 파트너 카드 (상단) ───────────── */}
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
              <div className="space-y-2">
                <p className="text-sm leading-relaxed whitespace-pre-wrap bg-white/70 rounded-md p-3 border border-white">
                  {partnerMsg.content}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-500">
                  아직 메시지가 없어요.
                </p>
                <Skeleton className="h-6 w-20 rounded-md" />
              </div>
            )}
          </div>
        </section>

        <Separator />

        {/* ───────────── 내 카드 (하단) ───────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                className="opacity-70 text-blue-500"
                icon={faMessage}
              />
              <h3 className="font-medium text-blue-700">{myName}</h3>
              {myMsg && (
                <Badge variant="outline" className="ml-1 rounded-full">
                  작성됨
                </Badge>
              )}
            </div>
            {myMsg && draft !== (myMsg.content ?? "") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={resetMyDraft}
                title="작성 중인 내용을 원래대로 되돌리기"
              >
                <FontAwesomeIcon icon={faRotateRight} className="mr-1" />
                되돌리기
              </Button>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
            <div className="space-y-2">
              {loadingMy ? (
                <Skeleton className="h-24 w-full rounded-xl" />
              ) : (
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="한 줄로 속삭여봐… (예: '오늘은 문틈 사이로 바람이 들어왔어')"
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
                  size="sm"
                >
                  <FontAwesomeIcon icon={faPaperPlane} />
                  {saving ? "저장 중…" : "저장"}
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
