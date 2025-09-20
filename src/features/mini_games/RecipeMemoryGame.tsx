"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { useCoupleContext } from "@/contexts/CoupleContext";
import { INGREDIENTS } from "@/features/kitchen/type";

/* Font Awesome (아이콘 메타용) */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUtensils } from "@fortawesome/free-solid-svg-icons";

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

export function RecipeMemoryGame({ onExit }: Props) {
  const { addPotatoes, fetchCoupleData } = useCoupleContext();

  const LEVELS = useMemo(() => [4, 5, 6], []);
  const REWARDS = useMemo(() => [1, 3, 6], []);

  const [levelIdx, setLevelIdx] = useState<number>(0);
  const [sequence, setSequence] = useState<string[]>([]);
  const [showing, setShowing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [inputs, setInputs] = useState<string[]>([]);
  const [checking, setChecking] = useState<boolean>(false);
  const [betweenOpen, setBetweenOpen] = useState<boolean>(false);
  const [finalOpen, setFinalOpen] = useState<{
    open: boolean;
    success: boolean;
    reward: number;
    message?: string;
  }>({ open: false, success: false, reward: 0 });

  const need = LEVELS[levelIdx];

  /* ✅ 재료 버튼 깨짐 원인 & 대응
     - 가변 컬럼 + 가변 높이(h-20)라 카드/텍스트 줄바꿈에 따라 셀 크기가 달라짐 → 그리드가 '줄갈림/깨짐'처럼 보임
     - 해결: (1) 컬럼 수 고정(15개 = 5×3, 좁은 화면 3×5) (2) 타일을 aspect-square로 통일 (3) 텍스트 줄바꿈 방지
  */

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
    setShowing(true);
    setProgress(0);
  };

  useEffect(() => {
    startRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIdx]);

  // 3초 동안 공개 + progress
  useEffect(() => {
    if (!showing) return;
    let t = 0;
    const total = 3000;
    const step = 30;
    const id = window.setInterval(() => {
      t += step;
      setProgress(Math.min(100, Math.round((t / total) * 100)));
      if (t >= total) {
        window.clearInterval(id);
        setShowing(false);
      }
    }, step);
    return () => window.clearInterval(id);
  }, [showing]);

  const addInput = (title: string) => {
    if (showing || checking) return;
    if (inputs.length >= need) return;
    setInputs((prev) => [...prev, title]);
  };
  const undo = () => setInputs((prev) => prev.slice(0, -1));
  const clear = () => setInputs([]);

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

  const submit = async () => {
    if (inputs.length !== need) return;
    setChecking(true);

    const ok = inputs.every((t, i) => t === sequence[i]);
    await new Promise((r) => setTimeout(r, 160));

    if (!ok) {
      setChecking(false);
      setFinalOpen({
        open: true,
        success: false,
        reward: 0,
        message: "아쉽지만 실패!",
      });
      return;
    }

    const reward = REWARDS[levelIdx];
    if (levelIdx === LEVELS.length - 1) {
      await grantPotato(reward);
      setChecking(false);
      setFinalOpen({
        open: true,
        success: true,
        reward,
        message: "모든 단계를 완수했어요!",
      });
    } else {
      setChecking(false);
      setBetweenOpen(true);
    }
  };

  const stopAndClaim = async () => {
    const reward = REWARDS[levelIdx];
    await grantPotato(reward);
    setBetweenOpen(false);
    setFinalOpen({
      open: true,
      success: true,
      reward,
      message: "보상을 수령했어요!",
    });
  };

  const continueNext = () => {
    setBetweenOpen(false);
    setLevelIdx((i) => i + 1);
  };

  // 시퀀스 카드 그리드: 단계별 고정 cols
  const seqGridCols =
    need >= 6 ? "grid-cols-6" : need === 5 ? "grid-cols-5" : "grid-cols-4";

  return (
    <div className="space-y-4 w-full">
      {/* 상단 상태 */}
      <div className="flex items-center gap-2">
        <Badge>단계 {levelIdx + 1} / 3</Badge>
        <span className="text-sm text-muted-foreground">
          {need}개의 재료를 3초간 보여드려요. 순서를 기억했다가 입력하세요.
        </span>
      </div>

      {/* 시퀀스 표시 */}
      <Card className="p-4 w-full">
        {showing ? (
          <div>
            <Progress value={progress} />
            <div
              className={cn(
                "mt-4 grid gap-3 justify-items-center",
                seqGridCols
              )}
            >
              {sequence.map((t, i) => (
                <div
                  key={i}
                  className="rounded-lg border p-3 text-center bg-amber-50/60 w-full"
                >
                  <div className="text-3xl leading-none">
                    {INGREDIENTS.find((x) => x.title === t)?.emoji}
                  </div>
                  <div className="text-xs mt-1 whitespace-nowrap">{t}</div>
                </div>
              ))}
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
        <Card className="p-3">
          <h3 className="text-sm font-semibold mb-2">재료 선택</h3>
          {/* 15개가 5×3 또는 3×5로만 보이도록 고정 */}
          <ScrollArea className="h-[320px] pr-2">
            <div className="grid gap-2 grid-cols-3 sm:grid-cols-5">
              {INGREDIENTS.map((ing) => (
                <button
                  key={ing.title}
                  onClick={() => addInput(ing.title)}
                  className={cn(
                    "rounded-md border bg-white hover:bg-muted/60 transition select-none",
                    "aspect-square p-2 grid place-items-center",
                    inputs.includes(ing.title) && "bg-muted"
                  )}
                  disabled={showing || checking || inputs.length >= need}
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
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="p-3">
          <h3 className="text-sm font-semibold mb-2">
            내 답안 ({inputs.length}/{need})
          </h3>
          <div className="min-h-[120px] rounded-md border p-3 bg-slate-50">
            {inputs.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                선택한 재료가 없어요.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {inputs.map((t, i) => (
                  <span
                    key={`${t}-${i}`}
                    className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-1 text-xs"
                  >
                    <span className="text-base leading-none">
                      {INGREDIENTS.find((x) => x.title === t)?.emoji}
                    </span>
                    {t}
                  </span>
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
            >
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
              disabled={inputs.length !== need || showing || checking}
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
            <DialogTitle>성공! 계속 진행할까요?</DialogTitle>
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
        onOpenChange={(o) => setFinalOpen((s) => ({ ...s, open: o }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {finalOpen.success ? "축하해요!" : "실패했어요"}
            </DialogTitle>
            <DialogDescription>
              {finalOpen.message}
              <br />
              최종 보상: <b>{finalOpen.reward}</b> 감자
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button onClick={onExit}>게임 목록으로</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* 메타 */
export const recipeMemoryMeta: MiniGameDef = {
  id: "recipe-memory",
  title: "레시피 기억 게임",
  icon: <FontAwesomeIcon icon={faUtensils} className="h-5 w-5" />,
  entryFee: 30,
  howTo:
    "화면에 3초 동안 재료들이 순서대로 나타납니다. 가려진 뒤 같은 순서로 재료를 골라 제출하세요.\n" +
    "1단계(4개) 성공 시 감자1 수령 후 계속/그만 선택, 2단계(5개) 성공 시 감자3, 3단계(6개) 성공 시 감자6 보상.\n" +
    "중간에 계속을 선택했다가 실패하면 보상은 0입니다.",
  Component: RecipeMemoryGame,
};
