// src/features/mini_games/RecipeMemoryGame.tsx
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
  RotateCcw,
  HelpCircle,
  CheckCircle2,
  XCircle,
  UtensilsCrossed,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { INGREDIENTS } from "@/features/kitchen/type";

/* Canvas 2D 시퀀스 뷰 */
import CanvasSequenceView from "@/features/mini_games/canvas/CanvasSequenceView";
import type { CanvasSequenceViewHandle } from "@/features/mini_games/canvas/CanvasSequenceView";

/* ====== 미니게임 메타 ====== */
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
type GameMode = "plain"; // 확장 여지(plain/reverse/odd-hide 등), 현재는 미니멀로 plain만

type LevelPreset = {
  len: number; // 시퀀스 길이
  showMs: number; // 공개 시간
  holdMs: number; // 홀드 시간
  inputMs: number; // 입력 제한시간(0=무제한)
  modes: GameMode[]; // 사용 모드(여러 개면 랜덤으로 1개 선택)
};

/** -------------------------------------------------------
 * 난이도 프리셋(레벨 1~5)
 * - 길이: 4,5,6,7,8
 * - show/hold/input: 레벨 4,5는 레벨 3과 동일 고정
 * ------------------------------------------------------ */
const LEVEL_PRESETS: LevelPreset[] = [
  { len: 4, showMs: 3000, holdMs: 2000, inputMs: 0, modes: ["plain"] },
  { len: 5, showMs: 3000, holdMs: 2000, inputMs: 0, modes: ["plain"] },
  { len: 6, showMs: 3000, holdMs: 2000, inputMs: 0, modes: ["plain"] },
  { len: 7, showMs: 3000, holdMs: 2000, inputMs: 0, modes: ["plain"] }, // 레벨 4 = 레벨3과 동일
  { len: 8, showMs: 3000, holdMs: 2000, inputMs: 0, modes: ["plain"] }, // 레벨 5 = 레벨3과 동일
];

/** 보상(간단 확장: 기존 3단계에서 5단계로만 확장) */
const REWARDS = [1, 3, 6, 10, 15];

export function RecipeMemoryGame({ onExit }: Props) {
  const { addPotatoes, fetchCoupleData } = useCoupleContext();

  // 단계/보상
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

  // UI/도움말
  const [showHowTo, setShowHowTo] = useState(false);
  const canvasRef = useRef<CanvasSequenceViewHandle | null>(null);

  // 현재 프리셋/파생값
  const preset = LEVEL_PRESETS[levelIdx];
  const totalSteps = LEVEL_PRESETS.length;
  const currentStep = levelIdx + 1;
  const need = preset.len;

  // 모드(미니멀: 항상 plain)
  const [mode, setMode] = useState<GameMode>("plain");

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

  // 라운드 시작
  const startRound = () => {
    const seq = makeSequence(need);
    // 모드는 프리셋에서 선택(현재는 plain만)
    const m =
      preset.modes[Math.floor(Math.random() * preset.modes.length)] ?? "plain";
    setMode(m);

    setSequence(seq);
    setInputs([]);
    setPhase("show");
    setProgress(0);
  };

  // 단계 변경 시 새 라운드 시작
  useEffect(() => {
    startRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIdx]);

  /** 공개 → 홀드 → 입력 타이밍 */
  useEffect(() => {
    if (phase !== "show") return;
    let t = 0;
    const total = preset.showMs;
    const step = 30;
    const intId = window.setInterval(() => {
      t += step;
      setProgress(Math.min(100, Math.round((t / total) * 100)));
      if (t >= total) {
        window.clearInterval(intId);
        setPhase("hold");
        const holdId = window.setTimeout(() => {
          setPhase("input");
        }, preset.holdMs);
        return () => window.clearTimeout(holdId);
      }
    }, step);
    return () => window.clearInterval(intId);
  }, [phase, preset]);

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

    // (미니멀) plain 모드 비교
    const target = sequence;
    const ok = inputs.every((t, i) => t === target[i]);
    await new Promise((r) => setTimeout(r, 120));

    if (!ok) {
      canvasRef.current?.shake(140, 10);
      setChecking(false);
      setFinalOpen({
        open: true,
        success: false,
        reward: 0,
        message: "틀린 재료 또는 순서가 있어요. 다음엔 더 잘할 수 있어요!",
      });
      return;
    }

    canvasRef.current?.hitStop(90, 0.05);
    canvasRef.current?.emitBurst();

    const reward = REWARDS[levelIdx];

    if (levelIdx === LEVEL_PRESETS.length - 1) {
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

  // 중간 다이얼로그: 그만(보상 수령)
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

  // 계속
  const continueNext = () => {
    setBetweenOpen(false);
    setLevelIdx((i) => i + 1);
  };

  // 최종 모달 닫기 → 종료 콜백
  const handleFinalDialogOpenChange = (o: boolean) => {
    setFinalOpen((s) => ({ ...s, open: o }));
    if (!o) onExit?.();
  };

  const isShowingAny = phase === "show" || phase === "hold";
  const disableInputs = isShowingAny || checking;

  return (
    <TooltipProvider>
      <div className="space-y-4 w-full">
        {/* 헤더: 미니멀 */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            레시피 기억 게임
          </h2>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              레벨 {currentStep} / {totalSteps}
            </Badge>
            <Popover open={showHowTo} onOpenChange={setShowHowTo}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <HelpCircle className="h-4 w-4" />
                  설명
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm whitespace-pre-line leading-relaxed">
                1) {preset.showMs / 1000}초 동안 재료가 순서대로 나타나요.
                {"\n"}2) {preset.holdMs / 1000}초 유지 후 전부 가려집니다.
                {"\n"}3) 순서대로 정확히 선택해 제출하세요.
                {"\n"}※ 레벨 4,5의 시간은 레벨 3과 동일하게 고정됩니다.
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* 시퀀스 표시 영역 */}
        <Card className="p-4 w-full">
          {isShowingAny ? (
            <div>
              <Progress value={progress} />
              <div className="mt-4">
                <CanvasSequenceView
                  ref={canvasRef}
                  titles={sequence}
                  emojisByTitle={emojisByTitle}
                  phase={phase}
                  className="w-full"
                  style={{ aspectRatio: "3 / 1" }}
                  onPick={onCanvasPick}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              시퀀스가 가려졌어요. 아래에서 <b>순서대로</b> 재료를 선택하세요.
            </div>
          )}
        </Card>

        {/* 입력 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 w-full">
          {/* 왼쪽: 재료 선택 */}
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

          {/* 오른쪽: 답안 */}
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

        {/* 성공 후 계속/그만 (미니멀) */}
        <Dialog open={betweenOpen} onOpenChange={setBetweenOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-500" />
                성공! 계속 진행할까요?
              </DialogTitle>
              <DialogDescription>
                이번 단계 보상은 <b>{REWARDS[levelIdx]} 감자</b>입니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-between">
              <Button variant="secondary" onClick={stopAndClaim}>
                그만하기(보상 수령)
              </Button>
              <Button onClick={continueNext}>계속하기</Button>
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
    "1) 화면에 3초 동안 재료들이 순서대로 나타납니다.\n2) 이후 2초 유지 후 가려집니다.\n3) 같은 순서로 정확히 제출하세요.\n※ 레벨 4,5의 시간은 레벨 3과 동일하게 고정됩니다.",
  Component: RecipeMemoryGame,
};
