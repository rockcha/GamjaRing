"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Swords,
  Gift,
  RotateCcw,
  HelpCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { INGREDIENTS } from "@/features/kitchen/type";

/* 아이콘 (메타 표시용) */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUtensils } from "@fortawesome/free-solid-svg-icons";

/* Canvas 2D 시퀀스 뷰 */
import CanvasSequenceView from "@/features/mini_games/canvas/CanvasSequenceView";
import type { CanvasSequenceViewHandle } from "@/features/mini_games/canvas/CanvasSequenceView";

/* 페이지에서 사용하는 게임 메타 타입 */
export type MiniGameDef = {
  id: string;
  title: string;
  icon: React.ReactNode;
  entryFee: number;
  howTo: string | React.ReactNode;
  Component: (p: { onExit?: () => void }) => JSX.Element;
  desc?: string;
};

type Props = { onExit?: () => void };
type Phase = "show" | "hold" | "input";

export function RecipeMemoryGame({ onExit }: Props) {
  const { addPotatoes, fetchCoupleData } = useCoupleContext();

  // 단계/보상
  const LEVELS = useMemo(() => [4, 5, 6], []);
  const REWARDS = useMemo(() => [1, 3, 6], []);
  const [levelIdx, setLevelIdx] = useState<number>(0);

  // 플레이 상태
  const [sequence, setSequence] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("show");
  const [progress, setProgress] = useState<number>(0);
  const [inputs, setInputs] = useState<string[]>([]);
  const [checking, setChecking] = useState<boolean>(false);

  // 다이얼로그
  const [betweenOpen, setBetweenOpen] = useState<boolean>(false);
  const [finalOpen, setFinalOpen] = useState<{
    open: boolean;
    success: boolean;
    reward: number;
    message?: string;
  }>({ open: false, success: false, reward: 0 });

  // UI 상태
  const [showHowTo, setShowHowTo] = useState(false);
  const [motd, setMotd] = useState<string>("");

  // 캔버스 핸들
  const canvasRef = useRef<CanvasSequenceViewHandle | null>(null);

  // 파생값
  const need = LEVELS[levelIdx];
  const totalSteps = LEVELS.length;
  const currentStep = levelIdx + 1;

  const MOTD_POOL = useMemo(
    () => [
      "재료를 다 기억해야 요리 대회에 참여할 수 있어요! ✨",
      "쉿! 순서를 정확히 기억해보세요 🧠",
      "셰프의 길은 기억력에서 시작돼요 👩‍🍳👨‍🍳",
      "조용히 집중! 기억이 맛을 바꿔요 🍲",
      "완벽한 레시피를 위해, 지금이 골든타임 ⏳",
      "첫 재료가 리듬을 만든다, 시작을 잊지 마세요 🎵",
      "눈보다 마음으로 순서를 그려보세요 🪄",
      "틀려도 괜찮아, 다음엔 더 완벽해질 거예요 🌱",
      "호흡을 고르고… 하나씩 떠올려요 🌬️",
      "마지막 두 개가 제일 헷갈려요, 침착하게 🙌",
      "아이콘의 색감/모양 포인트를 떠올려보세요 🎨",
      "정답은 언제나 순서에 있어요 ↔️",
    ],
    []
  );

  // title -> emoji 매핑
  const emojisByTitle = useMemo(
    () =>
      Object.fromEntries(INGREDIENTS.map((i) => [i.title, (i as any).emoji])),
    []
  );

  // 시퀀스 n개(중복 없이)
  const makeSequence = (n: number) => {
    const pool = [...INGREDIENTS];
    const picked: string[] = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool[idx].title);
      pool.splice(idx, 1);
    }
    return picked;
  };

  const startRound = () => {
    const seq = makeSequence(need);
    setSequence(seq);
    setInputs([]);
    setPhase("show");
    setProgress(0);
    setMotd("");
  };

  // 단계 바뀌면 새 라운드 시작
  useEffect(() => {
    startRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIdx]);

  /**
   * 공개 단계 타이밍
   * - show: 3초간 진행(Progress 표시), 카드들은 순차 fade-in + 스크래치 리빌
   * - hold: 모든 카드 노출 후 2초 유지
   * - input: 전부 가려짐 (답안 입력 가능)
   */
  useEffect(() => {
    if (phase !== "show") return;
    let t = 0;
    const total = 3000;
    const step = 30;
    const intId = window.setInterval(() => {
      t += step;
      setProgress(Math.min(100, Math.round((t / total) * 100)));
      if (t >= total) {
        window.clearInterval(intId);
        setPhase("hold");
        const holdId = window.setTimeout(() => {
          setPhase("input");
          setMotd(MOTD_POOL[Math.floor(Math.random() * MOTD_POOL.length)]);
        }, 2000);
        // cleanup for hold timer
        return () => window.clearTimeout(holdId);
      }
    }, step);
    return () => window.clearInterval(intId);
  }, [phase, MOTD_POOL]);

  // 입력 조작
  const addInput = (title: string) => {
    if (phase !== "input" || checking) return;
    if (inputs.length >= need) return;
    setInputs((prev) => [...prev, title]);
  };
  const undo = () => setInputs((prev) => prev.slice(0, -1));
  const clear = () => setInputs([]);

  // 캔버스에서 카드 클릭한 경우
  const onCanvasPick = (title: string) => addInput(title);

  // 보상 지급
  const grantPotato = async (amount: number) => {
    try {
      const ok = await addPotatoes?.(amount);
      if (!ok) throw new Error("보상을 지급하지 못했어요.");
      await fetchCoupleData?.();
      toast.success(`감자 ${amount}개 획득!`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "보상 지급 오류");
    }
  };

  // 제출
  const submit = async () => {
    if (inputs.length !== need) return;
    setChecking(true);

    const ok = inputs.every((t, i) => t === sequence[i]);
    await new Promise((r) => setTimeout(r, 120));

    if (!ok) {
      canvasRef.current?.shake(140, 10); // ❌ 오답 흔들림
      setChecking(false);
      setFinalOpen({
        open: true,
        success: false,
        reward: 0,
        message: "틀린 재료 또는 순서가 있어요. 다음엔 더 잘할 수 있어요!",
      });
      return;
    }

    // ✅ 정답 — 히트스톱 + 파티클
    canvasRef.current?.hitStop(90, 0.05);
    canvasRef.current?.emitBurst();

    const reward = REWARDS[levelIdx];
    if (levelIdx === LEVELS.length - 1) {
      await grantPotato(reward);
      setChecking(false);
      setFinalOpen({
        open: true,
        success: true,
        reward,
        message: "모든 단계를 완수했어요! 완벽해요!",
      });
    } else {
      setChecking(false);
      setBetweenOpen(true);
    }
  };

  // 중간 다이얼로그: 그만하기(보상 수령)
  const stopAndClaim = async () => {
    const reward = REWARDS[levelIdx];
    await grantPotato(reward);
    canvasRef.current?.emitBurst();
    setBetweenOpen(false);
    setFinalOpen({
      open: true,
      success: true,
      reward,
      message: "보상을 수령했어요! 다음에도 도전해봐요!",
    });
  };

  // 계속하기
  const continueNext = () => {
    setBetweenOpen(false);
    setLevelIdx((i) => i + 1);
  };

  // 최종 모달 닫힘 시 항상 대기화면으로 돌아가기
  const handleFinalDialogOpenChange = (o: boolean) => {
    setFinalOpen((s) => ({ ...s, open: o }));
    if (!o) onExit?.(); // 실패, 보상 수령, 3단계 성공 모두 포함
  };

  const isShowingAny = phase === "show" || phase === "hold";
  const disableInputs = isShowingAny || checking;

  return (
    <TooltipProvider>
      <div className="space-y-4 w-full">
        {/* 헤더: 타이틀 + 설명 버튼 + 단계 스텝퍼 */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FontAwesomeIcon icon={faUtensils} className="h-5 w-5" />
              레시피 기억 게임
            </h2>

            <Popover open={showHowTo} onOpenChange={setShowHowTo}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <HelpCircle className="h-4 w-4" />
                  게임 설명
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm whitespace-pre-line leading-relaxed">
                1) 3초 동안 재료들이 순서대로 나타나요(하나씩 페이드인).
                {"\n"}2) 모두 보인 뒤 2초 후 전부 가려집니다.
                {"\n"}3) 순서대로 정확히 선택해 제출하세요.
                {"\n"}4) 성공 시 계속/그만 선택 가능(실패하면 누적 보상 사라짐).
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              단계 {currentStep} / {totalSteps}
            </Badge>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2.5 w-2.5 rounded-full transition",
                    i < currentStep ? "bg-amber-500" : "bg-slate-300"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 시퀀스 표시 영역 (Canvas 2D 렌더) */}
        <Card className="p-4 w-full">
          {isShowingAny ? (
            <div>
              <Progress value={progress} />
              <div className="mt-4">
                <CanvasSequenceView
                  ref={canvasRef}
                  titles={sequence}
                  emojisByTitle={emojisByTitle}
                  phase={phase} // "show" | "hold" | "input"
                  className="w-full"
                  style={{ aspectRatio: "3 / 1" }}
                  onPick={onCanvasPick}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                시퀀스가 가려졌어요. 아래에서 <b>순서대로</b> 재료를 선택하세요.
              </div>
              {motd && (
                <div className="rounded-md border bg-amber-50 text-amber-900 px-3 py-1.5 text-xs">
                  {motd}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* 입력 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4 w-full">
          {/* 왼쪽: 재료 선택(그리드/타일) */}
          <Card className="p-3">
            <h3 className="text-sm font-semibold mb-2">재료 선택</h3>
            <ScrollArea className="h-[320px] pr-2">
              <div className="grid gap-2 grid-cols-3 sm:grid-cols-5">
                {INGREDIENTS.map((ing) => {
                  const selectedTimes = inputs.filter(
                    (t) => t === ing.title
                  ).length;
                  return (
                    <button
                      key={ing.title}
                      onClick={() => addInput(ing.title)}
                      className={cn(
                        "rounded-md border bg-white hover:bg-amber-50 transition select-none",
                        "aspect-square p-2 grid place-items-center",
                        selectedTimes > 0 && "bg-muted"
                      )}
                      disabled={disableInputs || inputs.length >= need}
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="text-2xl leading-none">
                          {(ing as any).emoji}
                        </div>
                        <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {ing.title}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>

          {/* 오른쪽: 답안(순서 고정 입력) */}
          <Card className="p-3">
            <h3 className="text-sm font-semibold mb-2">
              내 답안 ({inputs.length}/{need})
            </h3>
            <div
              className={cn(
                "min-h-[140px] rounded-md border p-3 bg-slate-50",
                inputs.length === 0 && "grid place-items-center"
              )}
            >
              {inputs.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  선택한 재료가 없어요.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {inputs.map((t, i) => (
                    <div
                      key={`${t}-${i}`}
                      className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-1 text-xs"
                    >
                      <span className="text-base leading-none">
                        {INGREDIENTS.find((x) => x.title === t)?.emoji}
                      </span>
                      <span className="select-none">{t}</span>
                      <button
                        className="ml-1 rounded-full px-1 text-[10px] text-muted-foreground hover:bg-muted"
                        onClick={() =>
                          setInputs((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        aria-label="remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => (inputs.length ? undo() : null)}
                disabled={inputs.length === 0}
                className="gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                되돌리기
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (inputs.length ? clear() : null)}
                disabled={inputs.length === 0}
              >
                전체지우기
              </Button>
              <div className="flex-1" />
              <Button
                size="sm"
                onClick={submit}
                disabled={
                  inputs.length !== need || checking || phase !== "input"
                }
                className="gap-1"
              >
                <Swords className="h-4 w-4" />
                제출
              </Button>
            </div>
          </Card>
        </div>

        {/* 성공 후 계속/그만 */}
        <Dialog open={betweenOpen} onOpenChange={setBetweenOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-500" />
                성공! 계속 진행할까요?
              </DialogTitle>
              <DialogDescription>
                이번 단계 보상은 <b>{REWARDS[levelIdx]} 감자</b>입니다. <br />
                계속 진행하면 실패 시 <b>보상 전부를 잃습니다.</b>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-between">
              <Button variant="secondary" onClick={stopAndClaim}>
                그만하기(보상 수령)
              </Button>
              <Button onClick={continueNext}>계속하기(위험 감수)</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 최종 결과 */}
        <Dialog
          open={finalOpen.open}
          onOpenChange={handleFinalDialogOpenChange}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle
                className={cn(
                  "flex items-center gap-2",
                  finalOpen.success ? "text-emerald-600" : "text-rose-600"
                )}
              >
                {finalOpen.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" /> 축하해요!
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" /> 실패했어요
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {finalOpen.message}
                <br />
                최종 보상:{" "}
                <b
                  className={
                    finalOpen.success ? "text-emerald-600" : "text-rose-600"
                  }
                >
                  {finalOpen.reward}
                </b>{" "}
                감자
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end">
              <Button onClick={onExit}>게임 목록으로</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

/* 메타 */
export const recipeMemoryMeta: MiniGameDef = {
  id: "recipe-memory",
  title: "레시피 기억 게임",
  icon: "🧠",
  entryFee: 30,
  howTo:
    "1) 화면에 3초 동안 재료들이 순서대로 나타납니다.\n2) 이후 순서와 재료를 기억해 동일하게 제출하세요.\n3) 각 단계마다 보상이 커집니다.\n4) 성공 시 계속/그만을 선택할 수 있고, 실패 시 누적 보상은 사라집니다.",
  Component: RecipeMemoryGame,
};
