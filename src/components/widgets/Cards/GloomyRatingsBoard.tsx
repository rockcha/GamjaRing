// src/components/GloomyRatingsBoard.tsx
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faFloppyDisk,
  faComment,
  faTrash,
  faPen,
} from "@fortawesome/free-solid-svg-icons";

/* Toast */
import { toast } from "sonner";

/* Notification */
import { sendUserNotification } from "@/utils/notification/sendUserNotification";

/* Types */
type GloomyRating = {
  id: number;
  author_id: string;
  content: string;
  author_score: number | null;
  partner_score: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type Props = {
  maxLen?: number;
  maxItems?: number;
};

export default function GloomyRatingsBoard({
  maxLen = 200,
  maxItems = 100,
}: Props) {
  const { user } = useUser();
  const { partnerId } = useCoupleContext();

  const [items, setItems] = useState<GloomyRating[]>([]);
  const [loading, setLoading] = useState(true);

  // 새 항목 모달
  const [createOpen, setCreateOpen] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newMyScore, setNewMyScore] = useState<string>("");

  // 상세/편집 모달
  const [detailOpen, setDetailOpen] = useState(false);
  const [active, setActive] = useState<GloomyRating | null>(null);
  const [myScoreDraft, setMyScoreDraft] = useState<string>("");
  const [contentDraft, setContentDraft] = useState<string>("");

  // 삭제 확인 모달
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GloomyRating | null>(null);

  const myName = user?.nickname || "나";
  const [partnerName, setPartnerName] = useState<string>("연인");

  /* 내가 수정 가능한 필드 */
  const myScoreField = useMemo(() => {
    if (!user?.id) return null;
    return (row: GloomyRating) =>
      row.author_id === user.id ? "author_score" : "partner_score";
  }, [user?.id]);

  /* 점수 매핑 */
  const resolveScores = (row: GloomyRating) => {
    if (!user?.id)
      return { my: null as number | null, partner: null as number | null };
    if (row.author_id === user.id) {
      return { my: row.author_score, partner: row.partner_score };
    } else {
      return { my: row.partner_score, partner: row.author_score };
    }
  };

  /* 닉네임 */
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

  /* 최초 로드 */
  useEffect(() => {
    if (!user?.id) return;
    let ignore = false;
    (async () => {
      setLoading(true);
      const ids: string[] = [user.id, partnerId].filter(Boolean) as string[];
      const { data, error } = await supabase
        .from("gloomy_ratings")
        .select("*")
        .in("author_id", ids)
        .order("created_at", { ascending: false })
        .limit(maxItems);
      if (!ignore) {
        if (error) {
          console.error("[GloomyRatings] load error:", error);
          toast.error("목록을 불러오는 중 오류가 발생했어요.");
        } else {
          setItems((data as GloomyRating[]) ?? []);
        }
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [user?.id, partnerId, maxItems]);

  /* Realtime */
  useEffect(() => {
    if (!user?.id) return;

    const chMine = supabase
      .channel(`gloomy_ratings:author:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gloomy_ratings",
          filter: `author_id=eq.${user.id}`,
        },
        (payload) => applyRealtime(payload)
      )
      .subscribe();

    let chPartner: ReturnType<typeof supabase.channel> | null = null;
    if (partnerId) {
      chPartner = supabase
        .channel(`gloomy_ratings:author:${partnerId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "gloomy_ratings",
            filter: `author_id=eq.${partnerId}`,
          },
          (payload) => applyRealtime(payload)
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(chMine);
      if (chPartner) supabase.removeChannel(chPartner);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, partnerId]);

  const applyRealtime = (payload: any) => {
    setItems((prev) => {
      const cp = [...prev];
      if (payload.eventType === "INSERT") {
        const row = payload.new as GloomyRating;
        return [row, ...cp];
      }
      if (payload.eventType === "UPDATE") {
        const row = payload.new as GloomyRating;
        const idx = cp.findIndex((x) => x.id === row.id);
        if (idx >= 0) {
          cp[idx] = row;
          return [...cp];
        }
        return [row, ...cp];
      }
      if (payload.eventType === "DELETE") {
        const row = payload.old as GloomyRating;
        return cp.filter((x) => x.id !== row.id);
      }
      return cp;
    });
  };

  /* 항상 표시하되, 양쪽 점수 모두 채워진 건 숨김 */
  const visibleItems = useMemo(() => {
    return items.filter(
      (row) => !(row.author_score != null && row.partner_score != null)
    );
  }, [items]);

  /* 생성 (내 점수 입력 가능) + 알림 */
  const onCreate = async () => {
    if (!user?.id) return;
    const text = newContent.trim();
    if (!text) {
      toast.message("내용을 입력해주세요.");
      return;
    }
    if (text.length > maxLen) {
      toast.error(`최대 ${maxLen}자를 넘길 수 없어요.`);
      return;
    }

    let myScore: number | null = null;
    const trimmedScore = newMyScore.trim();
    if (trimmedScore !== "") {
      const n = Number(trimmedScore);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        toast.error("점수는 1~100 사이의 정수여야 해요.");
        return;
      }
      myScore = n;
    }

    try {
      const payload = {
        author_id: user.id,
        content: text,
        author_score: myScore,
      };

      const { data, error } = await supabase
        .from("gloomy_ratings")
        .insert(payload)
        .select()
        .maybeSingle<GloomyRating>();
      if (error) throw error;

      if (data) setItems((p) => [data, ...p]);
      setNewContent("");
      setNewMyScore("");
      setCreateOpen(false);
      toast.success("새 항목을 만들었어요.");

      // ✅ 파트너에게 알림 (파트너가 있을 때만)
      if (partnerId) {
        await sendUserNotification({
          senderId: user.id,
          receiverId: partnerId,
          type: "음침한말",
        });
      }
    } catch (e) {
      console.error("[GloomyRatings] create error:", e);
      toast.error("생성 중 오류가 발생했어요.");
    }
  };

  /* 상세 모달 열기 */
  const openDetail = (row: GloomyRating) => {
    setActive(row);
    const which = myScoreField?.(row);
    const myVal =
      which === "author_score" ? row.author_score : row.partner_score;
    setMyScoreDraft(myVal == null ? "" : String(myVal));
    setContentDraft(row.content ?? "");
    setDetailOpen(true);
  };

  /* 저장 (내용 + 내 점수 동시 반영) */
  const onSaveMyScoreAndContent = async () => {
    if (!active || !user?.id) return;
    const which = myScoreField?.(active);
    if (!which) return;

    // 내용 검증: 작성자만 수정 가능
    const isMine = active.author_id === user.id;
    const trimmedContent = contentDraft.trim();
    if (isMine) {
      if (!trimmedContent) {
        toast.error("내용을 비울 수 없어요.");
        return;
      }
      if (trimmedContent.length > maxLen) {
        toast.error(`내용은 최대 ${maxLen}자까지 가능해요.`);
        return;
      }
    }

    // 점수 검증
    const trimmed = myScoreDraft.trim();
    let value: number | null = null;
    if (trimmed !== "") {
      const n = Number(trimmed);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        toast.error("점수는 1~100 사이의 정수여야 해요.");
        return;
      }
      value = n;
    }

    try {
      const payload: Partial<GloomyRating> =
        which === "author_score"
          ? { author_score: value }
          : { partner_score: value };

      if (isMine && trimmedContent !== active.content) {
        (payload as any).content = trimmedContent;
      }

      if (Object.keys(payload).length === 0) {
        toast.message("변경된 내용이 없어요.");
        return;
      }

      const { data, error } = await supabase
        .from("gloomy_ratings")
        .update(payload)
        .eq("id", active.id)
        .select()
        .maybeSingle<GloomyRating>();
      if (error) throw error;

      if (data) {
        setActive(data);
        setItems((prev) => {
          const idx = prev.findIndex((x) => x.id === data.id);
          if (idx < 0) return prev;
          const cp = [...prev];
          cp[idx] = data;
          return cp;
        });
        // 양쪽 점수 모두 채워졌으면 visibleItems에서 사라짐
        setDetailOpen(false);
      }
      toast.success("저장했어요.");
    } catch (e) {
      console.error("[GloomyRatings] update error:", e);
      toast.error("저장 중 오류가 발생했어요.");
    }
  };

  /* 삭제: 작성자만 */
  const requestDelete = (row: GloomyRating) => {
    if (row.author_id !== user?.id) {
      toast.error("작성한 사람만 삭제할 수 있어요.");
      return;
    }
    setDeleteTarget(row);
    setDeleteOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from("gloomy_ratings")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;

      setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteOpen(false);
      setDeleteTarget(null);
      // 상세 창이 열려 그 항목을 보고 있었다면 닫기
      if (active?.id === deleteTarget.id) setDetailOpen(false);

      toast.success("삭제했어요.");
    } catch (e) {
      console.error("[GloomyRatings] delete error:", e);
      toast.error("삭제 중 오류가 발생했어요.");
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-sm border border-neutral-200/70">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xl font-semibold tracking-tight">
            <FontAwesomeIcon icon={faComment} className="mr-2 opacity-80" />
            이런 말 어때?
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <FontAwesomeIcon icon={faPlus} /> 추가하기
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* 스크롤 영역 */}
        <div className="max-h-[56vh] md:max-h-[62vh] overflow-y-auto pr-1 space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-neutral-200 bg-white p-3"
              >
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-10 w-full mb-2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            ))
          ) : visibleItems.length === 0 ? (
            <div className="text-sm text-neutral-500 py-10 text-center">
              표시할 항목이 없어요. 상단의 새 항목 버튼으로 시작해보세요.
            </div>
          ) : (
            visibleItems.map((row) => {
              const { my, partner } = resolveScores(row);
              const isMine = row.author_id === user?.id;

              return (
                <div
                  key={row.id}
                  className={cn(
                    "relative rounded-lg border transition overflow-hidden",
                    isMine
                      ? "border-blue-100 bg-blue-50/40 hover:bg-blue-50"
                      : "border-purple-100 bg-purple-50/40 hover:bg-purple-50",
                    "focus-within:ring-2 focus-within:ring-neutral-300"
                  )}
                >
                  {/* 우측 상단: 액션 버튼 (작성자만) */}
                  {isMine && (
                    <div className="absolute right-2 top-2 z-10 flex gap-1">
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-7 w-7"
                        title="삭제"
                        onClick={() => requestDelete(row)}
                      >
                        <FontAwesomeIcon
                          icon={faTrash}
                          className="h-3.5 w-3.5"
                        />
                      </Button>
                    </div>
                  )}

                  {/* 클릭 영역: 상세 보기 (누구나 열기) */}
                  <button
                    onClick={() => openDetail(row)}
                    className="w-full text-left p-0"
                    title="클릭하여 상세 보기"
                  >
                    {/* 상단 패딩 (아이콘과 겹치지 않게 약간 여백) */}
                    <div className="px-3 pt-3 pb-2 text-xs font-medium">
                      <span
                        className={cn(
                          isMine ? "text-blue-700" : "text-purple-700"
                        )}
                      >
                        {isMine ? myName : partnerName}
                      </span>
                      <span className="text-neutral-400"> · </span>
                      <span className="text-neutral-500">
                        점수 입력/수정하려면 클릭
                      </span>
                    </div>

                    {/* 본문 */}
                    <div className="px-3 pb-2 text-sm whitespace-pre-wrap">
                      {row.content}
                    </div>

                    <Separator />

                    {/* 하단: 점수 */}
                    <div className="px-3 py-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "px-2",
                              isMine
                                ? "bg-blue-100 text-blue-700"
                                : "bg-purple-100 text-purple-700"
                            )}
                          >
                            {myName}
                          </Badge>
                          <span
                            className={cn(
                              "min-w-[1.5rem] text-base font-semibold tabular-nums text-center",
                              isMine ? "text-blue-700" : "text-purple-700"
                            )}
                          >
                            {my ?? ""}
                          </span>
                        </div>

                        <Separator orientation="vertical" className="h-4" />

                        <div className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "px-2",
                              isMine
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            )}
                          >
                            {partnerName}
                          </Badge>
                          <span
                            className={cn(
                              "min-w-[1.5rem] text-base font-semibold tabular-nums text-center",
                              isMine ? "text-purple-700" : "text-blue-700"
                            )}
                          >
                            {partner ?? ""}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-neutral-500">
                        클릭하여 점수 입력/수정
                      </div>
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </CardContent>

      <CardFooter />

      {/* ───────────── 새 항목 생성 모달 ───────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>새 음침한 말 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="newContent">내용</Label>
            <Textarea
              id="newContent"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={`한 줄로 남겨봐… (최대 ${maxLen}자)`}
              maxLength={maxLen}
              className="min-h-[120px]"
            />
            <div className="text-xs text-neutral-500 text-right">
              {newContent.length}/{maxLen}
            </div>

            {/* 내 점수만 입력 (상대 칸 없음) */}
            <div>
              <Label>{myName} 점수 (선택)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={newMyScore}
                onChange={(e) => setNewMyScore(e.target.value)}
                placeholder="(미입력 시 빈칸)"
                className="mt-1"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                1~100 정수. 비우면 아직 미입력 상태예요.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              취소
            </Button>
            <Button className="gap-2" onClick={onCreate}>
              <FontAwesomeIcon icon={faPlus} />
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────── 상세/수정 모달 ───────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>상세 보기 & 편집</DialogTitle>
          </DialogHeader>

          {active ? (
            <div className="space-y-4">
              {/* 내용: 작성자만 편집 가능 */}
              <div>
                <div className="text-xs font-medium text-neutral-500 mb-1">
                  내용
                </div>
                {active.author_id === user?.id ? (
                  <>
                    <Textarea
                      value={contentDraft}
                      onChange={(e) => setContentDraft(e.target.value)}
                      maxLength={maxLen}
                      className="min-h-[120px]"
                    />
                    <div className="text-right text-[11px] text-neutral-500 mt-1">
                      {contentDraft.length}/{maxLen}
                    </div>
                  </>
                ) : (
                  <div className="rounded-md border border-neutral-200 bg-white p-3 whitespace-pre-wrap">
                    {active.content}
                  </div>
                )}
              </div>

              {/* 점수 입력 (내 점수만 활성) */}
              <div>
                <div className="text-xs font-medium text-neutral-500 mb-2">
                  점수
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{myName} 점수</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={myScoreDraft}
                      onChange={(e) => setMyScoreDraft(e.target.value)}
                      placeholder="(미입력)"
                      className="mt-1"
                    />
                    <p className="text-[11px] text-neutral-500 mt-1">
                      1~100 정수. 비워두면 아직 미입력 상태예요.
                    </p>
                  </div>

                  <div>
                    <Label>{partnerName} 점수</Label>
                    <Input
                      type="text"
                      readOnly
                      value={
                        active.author_id === user?.id
                          ? active.partner_score ?? ""
                          : active.author_score ?? ""
                      }
                      className="mt-1 bg-neutral-100"
                    />
                    <p className="text-[11px] text-neutral-500 mt-1">
                      상대 점수는 상대만 수정할 수 있어요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setDetailOpen(false)}>
                닫기
              </Button>
              <Button className="gap-2" onClick={onSaveMyScoreAndContent}>
                <FontAwesomeIcon icon={faFloppyDisk} />
                저장
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────── 삭제 확인 모달 ───────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>정말 삭제할까요?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-neutral-600 whitespace-pre-wrap">
            {deleteTarget?.content}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={onConfirmDelete}
            >
              <FontAwesomeIcon icon={faTrash} />
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
