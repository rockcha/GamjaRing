// src/components/GloomyRatingsCompletedBoard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { cn } from "@/lib/utils";

/* shadcn/ui */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/* Icons */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faRankingStar } from "@fortawesome/free-solid-svg-icons";

/* Toast */
import { toast } from "sonner";

/* 타입 */
type GloomyRating = {
  id: number;
  author_id: string;
  content: string;
  author_score: number | null;
  partner_score: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type SortKey = "avg" | "partner" | "me";

export default function GloomyRatingsCompletedBoard() {
  const { user } = useUser();
  const { partnerId } = useCoupleContext();

  const [rows, setRows] = useState<GloomyRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("avg");

  const myName = user?.nickname || "나";
  const [partnerName, setPartnerName] = useState("연인");

  // 상세/수정 모달
  const [detailOpen, setDetailOpen] = useState(false);
  const [active, setActive] = useState<(GloomyRating & DecoratedExtra) | null>(
    null
  );
  const [myScoreDraft, setMyScoreDraft] = useState("");

  /* 닉네임 로드 */
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

  /* 데이터 로드 (둘 다 점수 있는 항목만) */
  useEffect(() => {
    if (!user?.id) return;
    let ignore = false;
    (async () => {
      setLoading(true);
      const ids = [user.id, partnerId].filter(Boolean) as string[];
      const { data, error } = await supabase
        .from("gloomy_ratings")
        .select("*")
        .in("author_id", ids)
        .not("author_score", "is", null)
        .not("partner_score", "is", null)
        .order("created_at", { ascending: false });
      if (!ignore) {
        if (error) {
          console.error("[CompletedBoard] load error:", error);
          setRows([]);
        } else {
          setRows((data as GloomyRating[]) ?? []);
        }
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [user?.id, partnerId]);

  /* Realtime 구독 (완료 항목 변화 반영) */
  useEffect(() => {
    if (!user?.id) return;
    const ids = [user.id, partnerId].filter(Boolean) as string[];

    const chMine = supabase
      .channel(`gloomy_completed:mine:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gloomy_ratings",
          filter: `author_id=eq.${user.id}`,
        },
        (p) => handleRealtime(p)
      )
      .subscribe();

    let chPartner: ReturnType<typeof supabase.channel> | null = null;
    if (partnerId) {
      chPartner = supabase
        .channel(`gloomy_completed:partner:${partnerId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "gloomy_ratings",
            filter: `author_id=eq.${partnerId}`,
          },
          (p) => handleRealtime(p)
        )
        .subscribe();
    }

    function handleRealtime(payload: any) {
      setRows((prev) => {
        const cp = [...prev];
        if (payload.eventType === "INSERT") {
          const row = payload.new as GloomyRating;
          if (
            row.author_score != null &&
            row.partner_score != null &&
            ids.includes(row.author_id)
          ) {
            return [row, ...cp];
          }
          return cp;
        }
        if (payload.eventType === "UPDATE") {
          const row = payload.new as GloomyRating;
          const idx = cp.findIndex((x) => x.id === row.id);
          const isCompleted =
            row.author_score != null &&
            row.partner_score != null &&
            ids.includes(row.author_id);
          if (idx >= 0) {
            if (isCompleted) {
              cp[idx] = row;
              return [...cp];
            } else {
              cp.splice(idx, 1);
              return [...cp];
            }
          } else {
            if (isCompleted) return [row, ...cp];
          }
          return cp;
        }
        if (payload.eventType === "DELETE") {
          const row = payload.old as GloomyRating;
          return cp.filter((x) => x.id !== row.id);
        }
        return cp;
      });
    }

    return () => {
      supabase.removeChannel(chMine);
      if (chPartner) supabase.removeChannel(chPartner);
    };
  }, [user?.id, partnerId]);

  /* ‘내 점수/연인 점수/평균’ 계산 */
  type DecoratedExtra = {
    myScore: number;
    partnerScore: number;
    avg: number;
    isMine: boolean;
  };

  const decorated = useMemo<(GloomyRating & DecoratedExtra)[]>(() => {
    if (!user?.id) return [];
    return rows.map((r) => {
      const isMine = r.author_id === user.id;
      const myScore = isMine ? r.author_score ?? 0 : r.partner_score ?? 0;
      const partnerScore = isMine ? r.partner_score ?? 0 : r.author_score ?? 0;
      return {
        ...r,
        myScore,
        partnerScore,
        avg: (myScore + partnerScore) / 2,
        isMine,
      };
    });
  }, [rows, user?.id]);

  /* 정렬 */
  const sorted = useMemo(() => {
    const cp = [...decorated];
    if (sortKey === "avg") {
      cp.sort((a, b) => b.avg - a.avg);
    } else if (sortKey === "partner") {
      cp.sort((a, b) => b.partnerScore - a.partnerScore);
    } else {
      cp.sort((a, b) => b.myScore - a.myScore);
    }
    return cp;
  }, [decorated, sortKey]);

  /* 편집: 내가 수정 가능한 필드 */
  const myScoreField = useMemo(() => {
    if (!user?.id) return null;
    return (row: GloomyRating & DecoratedExtra) =>
      row.author_id === user.id ? "author_score" : "partner_score";
  }, [user?.id]);

  /* 카드 클릭 → 상세 모달 */
  const openDetail = (row: GloomyRating & DecoratedExtra) => {
    setActive(row);
    const which = myScoreField?.(row);
    const myVal =
      which === "author_score" ? row.author_score : row.partner_score;
    setMyScoreDraft(myVal == null ? "" : String(myVal));
    setDetailOpen(true);
  };

  /* 저장(내 점수만) */
  const onSaveMyScore = async () => {
    if (!active || !user?.id) return;
    const which = myScoreField?.(active);
    if (!which) return;

    const trimmed = myScoreDraft.trim();
    let value: number | null = null;
    if (trimmed !== "") {
      const n = Number(trimmed);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        toast.error("점수는 1~100 사이의 정수여야 해요.");
        return;
      }
      value = n;
    } else {
      value = null; // 비우면 완료 상태 깨질 수 있음
    }

    try {
      const payload =
        which === "author_score"
          ? { author_score: value }
          : { partner_score: value };

      const { data, error } = await supabase
        .from("gloomy_ratings")
        .update(payload)
        .eq("id", active.id)
        .select()
        .maybeSingle<GloomyRating>();
      if (error) throw error;

      if (data) {
        setRows((prev) => {
          const idx = prev.findIndex((x) => x.id === data.id);
          if (idx < 0) return prev;
          const cp = [...prev];
          const completed =
            data.author_score != null && data.partner_score != null;
          if (completed) {
            cp[idx] = data;
          } else {
            cp.splice(idx, 1);
          }
          return cp;
        });
      }
      setDetailOpen(false);
      toast.success("점수를 저장했어요.");
    } catch (e) {
      console.error("[CompletedBoard] update score error:", e);
      toast.error("점수 저장 중 오류가 발생했어요.");
    }
  };

  /* ───────────────── Rank Badge Helper ───────────────── */
  const rankBadgeClasses = (rank: number) => {
    const base =
      "absolute -left-4 -top-4 h-8 w-8 rounded-full text-[11px] font-extrabold " +
      "flex items-center justify-center shadow-md ring-2 ring-white " +
      "after:content-[''] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 " +
      "after:border-t-8 after:border-x-8 after:border-x-transparent";

    return (
      base +
      " bg-gradient-to-br from-orange-200 to-amber-300 text-amber-900 " +
      "after:border-t-amber-300"
    );
  };

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto shadow-sm border border-neutral-200/70">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl font-semibold tracking-tight mb-4">
              <FontAwesomeIcon
                icon={faRankingStar}
                className="mr-2 opacity-80"
              />
              음침한 말 랭킹
            </CardTitle>

            {/* 정렬 라디오 */}
            <RadioGroup
              className="flex items-center gap-4"
              value={sortKey}
              onValueChange={(v) => setSortKey(v as SortKey)}
            >
              <div className="flex items-center gap-1">
                <RadioGroupItem id="sort-avg" value="avg" />
                <Label htmlFor="sort-avg" className="cursor-pointer text-sm">
                  평균
                </Label>
              </div>
              <div className="flex items-center gap-1">
                <RadioGroupItem id="sort-partner" value="partner" />
                <Label
                  htmlFor="sort-partner"
                  className="cursor-pointer text-sm"
                >
                  {partnerName}
                </Label>
              </div>
              <div className="flex items-center gap-1">
                <RadioGroupItem id="sort-me" value="me" />
                <Label htmlFor="sort-me" className="cursor-pointer text-sm">
                  {myName}
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardHeader>

        <CardContent>
          {/* ✅ 세로 1열 배치 */}
          <div className="flex flex-col gap-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-neutral-200 bg-white p-4"
                >
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-16 w-full mb-3" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              ))
            ) : sorted.length === 0 ? (
              <div className="text-sm text-neutral-500 py-12 text-center">
                아직 ‘둘 다 점수 입력된’ 항목이 없어요.
              </div>
            ) : (
              sorted.map((r, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;

                return (
                  <button
                    key={r.id}
                    onClick={() => openDetail(r)}
                    className={cn(
                      "relative w-full text-left rounded-lg border p-0  bg-white transition",
                      r.isMine
                        ? "border-blue-200 hover:bg-blue-50/40"
                        : "border-purple-200 hover:bg-purple-50/40",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                    )}
                    title="클릭하여 점수 상세/수정"
                  >
                    {/* 좌측 상단 랭크 뱃지 (Top3만) */}
                    {isTop3 && (
                      <div className={rankBadgeClasses(rank)}>{rank}</div>
                    )}

                    {/* 내용 */}
                    <div className="px-4 py-3 text-sm whitespace-pre-wrap">
                      {r.content}
                    </div>

                    <Separator />

                    {/* 점수 */}
                    <div className="px-4 py-3 flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-700"
                        >
                          {myName}
                        </Badge>
                        <span className="text-base font-semibold tabular-nums text-blue-700">
                          {r.myScore}
                        </span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Badge
                          variant="secondary"
                          className="bg-purple-100 text-purple-700"
                        >
                          {partnerName}
                        </Badge>
                        <span className="text-base font-semibold tabular-nums text-purple-700">
                          {r.partnerScore}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 상세/수정 모달 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>상세 보기 & 점수 입력</DialogTitle>
          </DialogHeader>

          {active ? (
            <div className="space-y-4">
              {/* 내용 */}
              <div>
                <div className="text-xs font-medium text-neutral-500 mb-1">
                  내용
                </div>
                <div className="rounded-md border border-neutral-200 bg-white p-3 whitespace-pre-wrap">
                  {active.content}
                </div>
              </div>

              {/* 점수 */}
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
                      1~100 정수. 비워두면 완료 상태가 해제될 수 있어요.
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

          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetailOpen(false)}>
              닫기
            </Button>
            <Button className="gap-2" onClick={onSaveMyScore}>
              <FontAwesomeIcon icon={faFloppyDisk} />
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
