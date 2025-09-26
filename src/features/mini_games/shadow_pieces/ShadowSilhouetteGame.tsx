"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import supabase from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCoupleContext } from "@/contexts/CoupleContext";

import {
  STAGES,
  ENTRY_FEE,
  PENALTY_ON_FAIL,
  normalizeRarity,
  type StageSpec,
  type RarityKey,
} from "./stageConfig";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faCircleXmark,
  faCoins,
  faLayerGroup,
  faImage,
  faLock,
  faArrowRight,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";

/* shadcn tooltip */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ----------------------------- 타입 ----------------------------- */
type Entity = { id: string; name_ko: string | null; rarity: string | null };
type RoundState = {
  stage: StageSpec;
  answer: Entity;
  options: Entity[];
  imageUrl: string;
  pickedId?: string;
  submitted?: boolean;
  isCorrect?: boolean;
  rewardDelta?: number;
  revealLabel?: string; // 정답 라벨
};
type ResultRow = { stage: number; isCorrect: boolean; rewardDelta: number };

/* ----------------------------- 유틸 ----------------------------- */
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
function getImageUrlByEntity(e: Entity): string {
  const rarityFolder: RarityKey = normalizeRarity(e.rarity);
  return `/aquarium/${rarityFolder}/${encodeURIComponent(e.id)}.png`;
}

/* ------------------------- 캔버스 Halo ------------------------- */
function CanvasTimeHalo({
  progress,
  danger,
}: {
  progress: number;
  danger: DangerKey;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-2xl",
        dangerToRingClass[danger]
      )}
      style={{
        background: `conic-gradient(var(--ring) ${
          progress * 3.6
        }deg, transparent 0)`,
        mask: "radial-gradient(farthest-side, transparent calc(100% - 8px), #000 0)",
      }}
      aria-hidden
    />
  );
}

type DangerKey = "safe" | "d1" | "d2" | "d3";
const dangerToRingClass: Record<DangerKey, string> = {
  safe: "ring-safe",
  d1: "ring-d1",
  d2: "ring-d2",
  d3: "ring-d3",
};

/* ------------------------- Supabase 풀 로딩 ------------------------- */
const POOL_SIZE = 120;
async function loadEntityPool(): Promise<Entity[]> {
  const { data, error } = await supabase
    .from("aquarium_entities")
    .select("id,name_ko,rarity")
    .not("name_ko", "is", null)
    .limit(POOL_SIZE);
  if (error) throw error;

  const seen = new Set<string>();
  const cleaned: Entity[] = [];
  for (const row of data ?? []) {
    if (!row.id || !row.name_ko) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    cleaned.push(row as Entity);
  }
  return cleaned;
}

/* ---------------------------- 메인 컴포넌트 ---------------------------- */
export default function ShadowSilhouetteGame({
  onExit,
}: {
  onExit?: () => void;
}) {
  const { addGold, fetchCoupleData } = useCoupleContext();

  const [rounds, setRounds] = useState<RoundState[]>([]);
  const [stageIdx, setStageIdx] = useState(0);

  const [isLoadingPool, setIsLoadingPool] = useState(true);

  // 타이머
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const deadlineRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // 프리필(0→100)
  const [progressVal, setProgressVal] = useState(0);
  const prefillRAF = useRef<number | null>(null);
  const isPrefillRef = useRef(false);

  // 진행/결과
  const [running, setRunning] = useState(true);
  const [rewardAcc, setRewardAcc] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);

  const [showReveal, setShowReveal] = useState<null | { ok: boolean }>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const claimedRef = useRef(false);
  const [claiming, setClaiming] = useState(false);

  // 캔버스 & 이미지
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const [showColorImage, setShowColorImage] = useState(false);

  const totalStages = STAGES.length;

  /** 현재 스테이지/라운드 */
  const curStage: StageSpec | null = useMemo(
    () => STAGES[stageIdx] ?? null,
    [stageIdx]
  );
  const curRound: RoundState | null = useMemo(
    () => rounds[stageIdx] ?? null,
    [rounds, stageIdx]
  );

  /* -------------- 위험도 계산(링 컬러/효과 용) -------------- */
  const danger: DangerKey =
    progressVal <= 7
      ? "d3"
      : progressVal <= 15
      ? "d2"
      : progressVal <= 30
      ? "d1"
      : "safe";

  /* ------------------------- 공용 RAF 정지 ------------------------- */
  const stopAllRAF = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (prefillRAF.current) cancelAnimationFrame(prefillRAF.current);
    prefillRAF.current = null;
  }, []);

  /* ------------------------- resetTimer ------------------------- */
  const resetTimer = useCallback((sec: number) => {
    const ms = Math.max(1, Math.floor(sec * 1000));
    deadlineRef.current = Date.now() + ms;
    setTimeLeftMs(ms);
    setProgressVal(100);
  }, []);

  /* ------------------------- startPrefillThenTimer ------------------------- */
  const startPrefillThenTimer = useCallback(
    (sec: number) => {
      stopAllRAF();
      setShowReveal(null);

      const DURATION = 600;
      const start = performance.now();
      isPrefillRef.current = true;
      setProgressVal(0);

      const step = (t: number) => {
        const e = Math.min(1, (t - start) / DURATION);
        setProgressVal(e * 100);
        if (e < 1) {
          prefillRAF.current = requestAnimationFrame(step);
        } else {
          isPrefillRef.current = false;
          resetTimer(sec);
          rafRef.current = requestAnimationFrame(tickRef.current);
        }
      };
      prefillRAF.current = requestAnimationFrame(step);
    },
    [resetTimer, stopAllRAF]
  );

  /* ------------------------- 초기 라운드 구성 ------------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setIsLoadingPool(true);
        const p = await loadEntityPool();
        if (!alive) return;

        if (!p.length) {
          toast.error("문제를 생성할 수 있는 엔티티가 없습니다.");
          setRounds([]);
          return;
        }

        const nextRounds: RoundState[] = STAGES.map((stage) => {
          const fallback = p[(Math.random() * p.length) | 0]!;
          const answer = sample(p, 1)[0] ?? fallback;
          const distractorPool = p.filter((e) => e.id !== answer.id);
          const distractors = sample(
            distractorPool,
            Math.max(0, stage.optionsCount - 1)
          );
          const options = shuffle([answer, ...distractors]);
          const imageUrl = getImageUrlByEntity(answer);
          return {
            stage,
            answer,
            options,
            imageUrl,
            revealLabel: answer.name_ko ?? answer.id,
          };
        });

        setRounds(nextRounds);
        startPrefillThenTimer(STAGES[0].timeSec);
      } catch (e) {
        console.error(e);
        toast.error("엔티티 불러오기 실패");
        setRounds([]);
      } finally {
        setIsLoadingPool(false);
      }
    })();
    return () => {
      alive = false;
      stopAllRAF();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------- 타이머 tick ------------------------- */
  const tickRef = useRef(() => {});
  tickRef.current = () => {
    if (isPrefillRef.current) return;
    const left = Math.max(0, deadlineRef.current - Date.now());
    setTimeLeftMs(left);
    if (curStage) {
      const p = Math.max(
        0,
        Math.min(100, (left / (curStage.timeSec * 1000)) * 100)
      );
      setProgressVal(p);
    }
    if (left <= 0) {
      handleTimeoutAutoSubmit();
      return;
    }
    rafRef.current = requestAnimationFrame(tickRef.current);
  };

  useEffect(() => {
    if (!running || !curRound) return;
    if (!isPrefillRef.current && !curRound.submitted) {
      rafRef.current = requestAnimationFrame(tickRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, curRound]);

  /* ------------------------- 이미지 로드 & 렌더 ------------------------- */
  useEffect(() => {
    if (!curRound) return;
    setShowColorImage(false);

    let cancelled = false;
    (async () => {
      const url = curRound.imageUrl;
      let img: HTMLImageElement | undefined = imgCacheRef.current[url];
      if (!img) {
        try {
          img = await loadImage(url);
          imgCacheRef.current[url] = img;
        } catch {
          img = undefined;
        }
      }
      if (!img || cancelled) return;
      drawSilhouette(canvasRef.current, img);
    })();

    return () => {
      cancelled = true;
    };
  }, [curRound?.imageUrl]);

  // 리사이즈 반영
  useEffect(() => {
    let rAF = 0;
    function onResize() {
      cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(() => {
        if (!curRound) return;
        const img = imgCacheRef.current[curRound.imageUrl];
        if (!img) return;
        if (showColorImage) drawOriginal(canvasRef.current, img);
        else drawSilhouette(canvasRef.current, img);
      });
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rAF);
    };
  }, [curRound, showColorImage]);

  /* ------------------------- 선택 & 제출 ------------------------- */
  const freezeTimer = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const pickAndSubmit = useCallback(
    (id: string) => {
      if (!curRound || curRound.submitted) return;

      const snapshot = rounds.slice();
      snapshot[stageIdx] = { ...curRound, pickedId: id };
      setRounds(snapshot);

      const ok = id === curRound.answer.id;

      setRewardAcc((prev) => {
        if (ok) return prev + curRound.stage.rewardOnSuccess;
        const penalty = Math.min(PENALTY_ON_FAIL, prev);
        return prev - penalty;
      });

      if (ok) setCorrect((c) => c + 1);
      else setWrong((w) => w + 1);

      // 정답 공개: 오답/시간초과 포함
      const next = snapshot.slice();
      next[stageIdx] = {
        ...snapshot[stageIdx],
        submitted: true,
        isCorrect: ok,
        rewardDelta: ok
          ? curRound.stage.rewardOnSuccess
          : -Math.min(PENALTY_ON_FAIL, rewardAcc),
      };
      setRounds(next);

      const img = imgCacheRef.current[curRound.imageUrl];
      if (img) {
        setShowColorImage(true);
        drawOriginal(canvasRef.current, img);
      }
      setShowReveal({ ok });

      freezeTimer();
    },
    [curRound, rounds, stageIdx, freezeTimer, rewardAcc]
  );

  const handleTimeoutAutoSubmit = useCallback(() => {
    if (!curRound || curRound.submitted) return;

    setRewardAcc((prev) => prev - Math.min(PENALTY_ON_FAIL, prev));
    setWrong((w) => w + 1);

    const next = rounds.slice();
    next[stageIdx] = {
      ...curRound,
      submitted: true,
      isCorrect: false,
      rewardDelta: -Math.min(PENALTY_ON_FAIL, rewardAcc),
    };
    setRounds(next);

    // 정답 공개
    const img = imgCacheRef.current[curRound.imageUrl];
    if (img) {
      setShowColorImage(true);
      drawOriginal(canvasRef.current, img);
    }
    setShowReveal({ ok: false });
    freezeTimer();
  }, [curRound, rounds, stageIdx, freezeTimer, rewardAcc]);

  const goNextStage = useCallback(() => {
    setShowReveal(null);

    if (stageIdx >= STAGES.length - 1) {
      setRunning(false);
      setResultOpen(true);
      return;
    }
    const nextIdx = stageIdx + 1;
    setStageIdx(nextIdx);
    startPrefillThenTimer(STAGES[nextIdx].timeSec);
  }, [stageIdx, startPrefillThenTimer]);

  /* ------------------------- 최종 지급 ------------------------- */
  const totalGold = rewardAcc;

  const onResultClose = useCallback(
    async (open: boolean) => {
      if (open) return;
      if (claimedRef.current) {
        onExit?.();
        return;
      }
      try {
        setClaiming(true);
        if (totalGold > 0) {
          const ok = await addGold?.(totalGold);
          if (ok) {
            await fetchCoupleData?.();
            toast.success(`${totalGold}G 획득!`, { duration: 1200 });
          } else {
            toast.error("보상 지급 실패", { duration: 1200 });
          }
        }
        claimedRef.current = true;
      } catch (e) {
        console.error(e);
        toast.error("보상 지급 오류", { duration: 1200 });
      } finally {
        setClaiming(false);
        onExit?.();
      }
    },
    [addGold, fetchCoupleData, onExit, totalGold]
  );

  /* ------------------------- 렌더 ------------------------- */
  const stageLabelHUD = curStage
    ? `${curStage.index}/${totalStages}`
    : `-/\${totalStages}`;
  const results: ResultRow[] = useMemo(
    () =>
      rounds.map((r) => ({
        stage: r.stage.index,
        isCorrect: !!r.isCorrect,
        rewardDelta: r.rewardDelta ?? 0,
      })),
    [rounds]
  );

  const optionCount = curStage?.optionsCount ?? 4;
  const cols = optionCount >= 8 ? 4 : optionCount >= 6 ? 3 : 2;
  const gridColsClass =
    cols === 4
      ? "md:grid-cols-4"
      : cols === 3
      ? "md:grid-cols-3"
      : "md:grid-cols-2";

  // 스테이지 O/X 라인
  const StageOX = (
    <div className="flex items-center gap-1.5">
      {STAGES.map((s, i) => {
        const r = rounds[i];
        const submitted = r?.submitted;
        const ok = !!r?.isCorrect;
        return (
          <div
            key={s.index}
            className={cn(
              "grid place-items-center text-base md:text-lg w-7 h-7 md:w-8 md:h-8 rounded-lg border",
              !submitted && "text-muted-foreground bg-muted/30",
              submitted && ok && "bg-emerald-600 text-white border-emerald-600",
              submitted && !ok && "bg-rose-600 text-white border-rose-600"
            )}
            aria-label={
              !submitted
                ? `${s.index} 미응답`
                : ok
                ? `${s.index} 정답`
                : `${s.index} 오답`
            }
          >
            {!submitted ? "-" : ok ? "O" : "X"}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* 상단 HUD */}
      <Card className="rounded-3xl p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-2">
              <FontAwesomeIcon icon={faLayerGroup} className="h-4 w-4" />
              스테이지 {stageLabelHUD}
            </Badge>
            <div className="hidden md:flex items-center">{StageOX}</div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-2">
              <FontAwesomeIcon icon={faLock} className="h-4 w-4" />
              참가비 {ENTRY_FEE} G
            </Badge>
            <Badge variant="secondary" className="gap-2">
              <FontAwesomeIcon icon={faCoins} className="h-4 w-4" />
              {rewardAcc} G
            </Badge>
          </div>
        </div>
        <div className="mt-3 md:hidden">{StageOX}</div>
      </Card>

      <Separator className="my-5" />

      {/* 메인 카드 */}
      <Card className="rounded-3xl overflow-hidden">
        <div className="grid md:grid-cols-[minmax(280px,520px),1fr] gap-6 md:gap-8 p-5 md:p-7">
          {/* 캔버스 영역 */}
          <div className="relative">
            <div
              className={cn(
                "relative rounded-2xl border overflow-hidden shadow-sm bg-gradient-to-b from-background to-muted/40",
                (isLoadingPool || isPrefillRef.current) &&
                  "animate-pulse ring-1 ring-primary/10"
              )}
            >
              {isLoadingPool ? (
                <div className="aspect-square w-full grid place-items-center text-muted-foreground">
                  불러오는 중...
                </div>
              ) : (
                <>
                  <canvas
                    ref={canvasRef}
                    className="block w-full aspect-square"
                    aria-label="정답 이미지 프리뷰"
                  />
                  {/* Sweep 타이머 */}
                  <CanvasTimeHalo progress={progressVal} danger={danger} />
                </>
              )}

              {/* 좌측 상단: 스테이지 진행 표시 */}
              {curStage && (
                <div className="absolute top-2 left-2">
                  <Badge className="backdrop-blur bg-white/80 text-foreground font-semibold px-3 py-1 rounded-xl">
                    {curStage.index} / {totalStages}
                  </Badge>
                </div>
              )}

              {/* 우측 상단: 이번 스테이지 보상 금액 */}
              {curStage && (
                <div className="absolute top-2 right-2">
                  <Badge
                    variant="secondary"
                    className="gap-1.5 px-3 py-1 rounded-xl shadow-sm"
                  >
                    <FontAwesomeIcon icon={faCoins} className="h-4 w-4" />
                    <span className="font-bold text-foreground">
                      +{curStage.rewardOnSuccess} G
                    </span>
                  </Badge>
                </div>
              )}

              {/* 중앙 상단: 정/오답 배지 */}
              {showReveal && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
                  <Badge
                    className={cn(
                      "px-4 py-2 rounded-full shadow-md text-base",
                      showReveal.ok
                        ? "bg-emerald-600 text-white"
                        : "bg-rose-600 text-white"
                    )}
                  >
                    <FontAwesomeIcon
                      icon={showReveal.ok ? faCheckCircle : faCircleXmark}
                      className="mr-2"
                    />
                    {showReveal.ok ? "정답!" : "오답! 정답 공개"}
                  </Badge>
                </div>
              )}

              {/* 우하단: 정답 라벨 */}
              {curRound?.submitted && curRound?.revealLabel && (
                <div className="absolute bottom-2 right-2 z-20">
                  <Badge variant="secondary" className="px-3 py-1 rounded-xl">
                    정답:{" "}
                    <span className="ml-2 font-semibold">
                      {curRound.revealLabel}
                    </span>
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* 보기 + CTA */}
          <div className="flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-5 flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faImage}
                  className="h-5 w-5 text-muted-foreground"
                />
                그림자의 주인공을 맞춰보세요
              </h3>

              {/* 옵션 리스트 + Tooltip */}
              <TooltipProvider delayDuration={150}>
                {isLoadingPool ? (
                  <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-12 rounded-xl border bg-muted/40 animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "grid gap-2.5 grid-cols-1 sm:grid-cols-2",
                      gridColsClass
                    )}
                  >
                    {curRound?.options.map((opt) => {
                      const active = curRound.pickedId === opt.id;
                      const isAnswer =
                        !!curRound.submitted && opt.id === curRound.answer.id;
                      const isWrongActive =
                        !!curRound.submitted &&
                        opt.id !== curRound.answer.id &&
                        active;

                      const disabled = !!curRound?.submitted;

                      return (
                        <Tooltip key={opt.id}>
                          <TooltipTrigger asChild>
                            {/* 버튼은 클릭 방지만 하고 disabled 속성은 쓰지 않아 Tooltip이 항상 작동하게 */}
                            <Button
                              aria-disabled={disabled}
                              onClick={() => {
                                if (disabled) return;
                                pickAndSubmit(opt.id);
                              }}
                              variant={active ? "default" : "outline"}
                              className={cn(
                                "h-12 rounded-xl justify-start transition-all",
                                disabled && "opacity-75 cursor-not-allowed",
                                active &&
                                  "ring-2 ring-primary/40 shadow-sm -translate-y-[1px]",
                                isAnswer &&
                                  "bg-emerald-600 text-white border-emerald-600",
                                isWrongActive &&
                                  "bg-rose-600 text-white border-rose-600"
                              )}
                            >
                              <span className="line-clamp-2 text-left">
                                {opt.name_ko}
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            <p className="max-w-[260px] break-keep">
                              {opt.name_ko ?? opt.id}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                )}
              </TooltipProvider>
            </div>

            {/* 누적 보상 (플로팅 제거) */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-5">
                <FontAwesomeIcon
                  icon={faCoins}
                  className="h-5 w-5 text-muted-foreground"
                />
                누적 보상
              </h3>
              <div className="flex items-center justify-between p-4 rounded-2xl border bg-muted/30">
                <div className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {rewardAcc} G
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-8 sticky bottom-0 bg-gradient-to-t from-background via-background/70 to-transparent pt-4">
              {curRound?.submitted ? (
                <Button
                  size="lg"
                  className="w-full h-12 rounded-xl font-semibold gap-2"
                  onClick={goNextStage}
                >
                  {stageIdx < totalStages - 1 ? (
                    <>
                      다음 스테이지로 <FontAwesomeIcon icon={faArrowRight} />
                    </>
                  ) : (
                    <>
                      결과 보기 <FontAwesomeIcon icon={faTrophy} />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full h-12 rounded-xl"
                  aria-disabled
                >
                  선택 후 결과가 표시되면 진행할 수 있어요
                </Button>
              )}

              <div className="mt-3 text-sm text-muted-foreground">
                제한시간 내 선택하지 않으면 <b>-{PENALTY_ON_FAIL}G</b> 패널티가
                적용됩니다.
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 결과 다이얼로그 */}
      <Dialog open={resultOpen} onOpenChange={onResultClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">결과</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex justify-center items-center mt-2 gap-3">
              <Badge variant="secondary" className="text-lg gap-2">
                ✅ 정답 {correct}개
              </Badge>
              <Badge variant="secondary" className="text-lg gap-2">
                ❌ 실패 {wrong}개
              </Badge>
              <Badge variant="secondary" className="text-xl gap-2">
                <FontAwesomeIcon icon={faCoins} className="h-4 w-4" />
                최종 보상 {totalGold} G
              </Badge>
            </div>

            <ul className="divide-y rounded-xl border bg-muted/20">
              {results.map((r) => (
                <li
                  key={r.stage}
                  className="flex items-center justify-between py-2 px-3 text-sm"
                >
                  <span className="text-muted-foreground">{r.stage} 단계</span>
                  <span
                    className={cn(
                      "font-medium",
                      r.isCorrect ? "text-emerald-600" : "text-rose-600"
                    )}
                  >
                    {r.isCorrect ? "정답" : "실패"}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums font-semibold",
                      r.rewardDelta >= 0 ? "text-emerald-700" : "text-rose-700"
                    )}
                  >
                    {r.rewardDelta >= 0 ? `+${r.rewardDelta}` : r.rewardDelta}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* 링 컬러 단계 */}
      <style>{`
        .ring-safe { --ring: rgba(16,185,129,0.85); }   /* emerald-500 */
        .ring-d1   { --ring: rgba(245,158,11,0.90); }   /* amber-500 */
        .ring-d2   { --ring: rgba(234,88,12,0.92); }    /* orange-600 */
        .ring-d3   { --ring: rgba(225,29,72,0.95); }    /* rose-600 */
      `}</style>
    </div>
  );
}

/* ------------------------- 이미지/캔버스 보조 ------------------------- */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawSilhouette(
  canvas: HTMLCanvasElement | null,
  img: HTMLImageElement
) {
  if (!canvas) return;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const W = Math.max(320, Math.floor(rect.width));
  const H = W;

  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const { dx, dy, dw, dh } = fitContain(
    img.naturalWidth,
    img.naturalHeight,
    W,
    H
  );

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, dw, dh);

  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#0f172a"; // slate-900
  ctx.fillRect(0, 0, W, H);

  // 바닥 그림자
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  const shadowW = Math.floor(W * 0.6);
  const shadowH = Math.floor(H * 0.08);
  ctx.beginPath();
  ctx.ellipse(
    W / 2,
    Math.floor(H * 0.78),
    shadowW / 2,
    shadowH / 2,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // 비네팅
  const grad = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.45,
    W / 2,
    H / 2,
    Math.min(W, H) * 0.65
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 테두리
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  ctx.restore();
}

function drawOriginal(canvas: HTMLCanvasElement | null, img: HTMLImageElement) {
  if (!canvas) return;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const W = Math.max(320, Math.floor(rect.width));
  const H = W;

  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const { dx, dy, dw, dh } = fitContain(
    img.naturalWidth,
    img.naturalHeight,
    W,
    H
  );

  ctx.fillStyle = "rgba(246,246,248,1)";
  ctx.fillRect(0, 0, W, H);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, dw, dh);

  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  ctx.restore();
}

function fitContain(sw: number, sh: number, dw: number, dh: number) {
  const sr = sw / sh;
  const dr = dw / dh;
  let w = dw,
    h = dh;
  if (sr > dr) h = Math.round(dw / sr);
  else w = Math.round(dh * sr);
  const x = Math.round((dw - w) / 2);
  const y = Math.round((dh - h) / 2);
  return { dx: x, dy: y, dw: w, dh: h };
}
