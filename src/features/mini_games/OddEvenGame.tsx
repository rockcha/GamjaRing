"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import supabase from "@/lib/supabase";
import { RotateCcw, Trophy, Loader2 } from "lucide-react";

/* Font Awesome (메타 아이콘용) */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDice } from "@fortawesome/free-solid-svg-icons";

/** ─────────────────────────────────────────────────────────
 *  MiniGame 인터페이스 (RecipeMemoryGame과 동일)
 *  ───────────────────────────────────────────────────────── */
export type MiniGameDef = {
  id: string;
  title: string;
  icon: React.ReactNode;
  entryFee: number;
  howTo: string | React.ReactNode;
  /** 'page' = MiniGamePage가 spendGold로 참가비 차감
   *  'backend' = 게임 자체가 RPC에서 참가비를 차감(중복 차감 방지용) */
  chargeMode?: "page" | "backend";
  Component: (p: { onExit?: () => void }) => JSX.Element;
};

/** 게임 기본 상수: 참가비(원하는 대로 바꿔도 됨) */
const ODD_EVEN_ENTRY_FEE = 100;

/** 백엔드 세션 타입 */
type Session = { id: string; bet: number; reward: number; step: number };
type GuessChoice = "odd" | "even";

/** ─────────────────────────────────────────────────────────
 *  본 게임 컴포넌트
 *  - MiniGamePage에서 isRunning 상태일 때만 마운트됨
 *  - 시작 시 RPC(odd_even_start) 호출해 서버 세션 생성
 *  - 라운드 승리 → step_up/claim, 패배 → fail
 *  - 포기하기 버튼은 페이지에서 제공(언마운트 시 서버세션 유지)
 *    ※ 원하면 언마운트 시 odd_even_fail을 호출하도록 바꿀 수 있음
 *  ───────────────────────────────────────────────────────── */
export function OddEvenGame({ onExit }: { onExit?: () => void }) {
  const [session, setSession] = useState<Session | null>(null);

  const [guessing, setGuessing] = useState(false);
  const [win, setWin] = useState<boolean | null>(null);
  const [lastRoll, setLastRoll] = useState<"odd" | "even" | null>(null);

  const [revealing, setRevealing] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [rolledNumber, setRolledNumber] = useState<number | null>(null);
  const [rolledParity, setRolledParity] = useState<"odd" | "even" | null>(null);
  const [failedThisRound, setFailedThisRound] = useState(false);

  const rewardRef = useRef<HTMLDivElement | null>(null);
  const lastRewardRef = useRef<number | null>(null);

  // 보상 변화 애니메이션
  useEffect(() => {
    if (!session) return;
    if (lastRewardRef.current == null) {
      lastRewardRef.current = session.reward;
      return;
    }
    if (lastRewardRef.current !== session.reward) {
      lastRewardRef.current = session.reward;
      rewardRef.current?.classList.remove("reward-bounce");
      requestAnimationFrame(() => {
        rewardRef.current?.classList.add("reward-bounce");
        setTimeout(
          () => rewardRef.current?.classList.remove("reward-bounce"),
          450
        );
      });
    }
  }, [session?.reward]);

  /** 서버 진행 중 세션 불러오기 (새로고침/복귀 대비) */
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("odd_even_is_playing");
      if (error) throw error;

      if (data?.is_playing && data?.session) {
        const s = data.session;
        setSession({
          id: s.id,
          bet: Number(s.bet ?? 0),
          step: Number(s.step ?? 1),
          reward: Number(s.reward ?? 0),
        });
      } else {
        setSession(null);
      }
    } catch (e) {
      console.error(e);
      setSession(null);
    }
  }, []);

  /** 컴포넌트 마운트 시: 서버 세션 없으면 시작 시도 */
  useEffect(() => {
    (async () => {
      await refreshSession();
      // 세션 없으면 새로 시작
      const hasSession = !!session;
      if (!hasSession) {
        try {
          const { data, error } = await supabase.rpc("odd_even_start", {
            p_bet: ODD_EVEN_ENTRY_FEE,
          });
          if (error) throw error;

          if (data?.ok) {
            setSession({
              id: data.session_id,
              bet: Number(data.bet ?? ODD_EVEN_ENTRY_FEE),
              step: Number(data.step ?? 1),
              reward: Number(data.reward ?? ODD_EVEN_ENTRY_FEE),
            });
            toast.success(
              `홀짝 게임 시작! 베팅: ${Number(
                ODD_EVEN_ENTRY_FEE
              ).toLocaleString("ko-KR")}G`
            );
          } else {
            const code = data?.error ?? "unknown";
            if (code === "not_enough_gold") toast.error("골드가 부족해요.");
            else toast.error("게임 시작에 실패했어요.");
            onExit?.(); // 시작 실패 시 목록으로 복귀
          }
        } catch (e) {
          console.error(e);
          toast.error("게임 시작 중 오류가 발생했어요.");
          onExit?.();
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 유도 라벨/계산값 */
  const stepLabel = useMemo(() => {
    if (!session) return "";
    return session.step === 1 ? "첫 번째 라운드" : `${session.step}번째 라운드`;
  }, [session]);

  const rewardMultiplier = useMemo(() => {
    if (!session) return 1;
    const mul = session.bet ? session.reward / session.bet : 1;
    return Number.isInteger(mul) ? mul : Number(mul.toFixed(2));
  }, [session]);

  /** 라운드 진행 */
  const onGuess = useCallback(
    async (choice: GuessChoice) => {
      if (!session || guessing || win !== null) return;

      setResultOpen(true);
      setRevealing(true);
      setRolledNumber(null);
      setRolledParity(null);
      setFailedThisRound(false);

      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      await wait(1200 + Math.random() * 800); // 주사위 연출

      const n = Math.floor(Math.random() * 6) + 1;
      const parity: "odd" | "even" = n % 2 === 0 ? "even" : "odd";
      const success = parity === choice;

      setRolledNumber(n);
      setRolledParity(parity);
      setLastRoll(parity);
      setRevealing(false);

      if (!success) {
        setFailedThisRound(true);
        try {
          const { error } = await supabase.rpc("odd_even_fail");
          if (error) throw error;
        } catch (e) {
          console.error(e);
          toast.error("실패 처리 중 오류가 발생했어요.");
        }
      } else {
        setWin(true);
        setResultOpen(false);
        toast.success(`정답! (결과: ${parity === "odd" ? "홀" : "짝"})`);
      }
    },
    [session, guessing, win]
  );

  const onStepUp = useCallback(async () => {
    if (!session || win !== true) return;
    try {
      const { data, error } = await supabase.rpc("odd_even_step_up");
      if (error) throw error;

      if (data?.ok) {
        setSession((s) =>
          s
            ? {
                ...s,
                step: Number(data.step ?? s.step + 1),
                reward: Number(data.reward ?? s.reward * 2),
              }
            : s
        );
        setWin(null);
        setLastRoll(null);
        toast.success("단계 상승! 보상이 2배가 되었습니다.");
      } else {
        toast.error("단계 상승에 실패했어요.");
      }
    } catch (e) {
      console.error(e);
      toast.error("단계 상승 중 오류가 발생했어요.");
    }
  }, [session, win]);

  const onClaim = useCallback(async () => {
    if (!session || win !== true) return;
    try {
      const { data, error } = await supabase.rpc("odd_even_claim");
      if (error) throw error;

      if (data?.ok) {
        toast.success(
          `보상 획득 +${Number(data.gained ?? session.reward).toLocaleString(
            "ko-KR"
          )}G`
        );
        setSession(null);
        onExit?.();
      } else {
        toast.error("보상 수령에 실패했어요.");
      }
    } catch (e) {
      console.error(e);
      toast.error("보상 수령 중 오류가 발생했어요.");
    }
  }, [session, win, onExit]);

  const closeFailModal = useCallback(async () => {
    setResultOpen(false);
    setFailedThisRound(false);
    setWin(null);
    setLastRoll(null);
    setRolledNumber(null);
    setRolledParity(null);
    await refreshSession(); // 서버 상태와 동기화
  }, [refreshSession]);

  if (!session) {
    // 서버 세션 생성 중
    return (
      <div className="grid place-items-center gap-2 text-sm text-muted-foreground h-[420px]">
        <Loader2 className="h-5 w-5 animate-spin" />
        게임 준비 중…
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 상단: 베팅/보상 */}
      <div className="grid w-full max-w-xl mx-auto grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            베팅액
          </div>
          <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
            🪙 {session.bet.toLocaleString("ko-KR")}
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <div className="text-xs font-medium uppercase tracking-wide text-amber-700">
            현재 보상
          </div>
          <div
            ref={rewardRef}
            className="mt-1 text-3xl font-extrabold tracking-tight text-amber-900"
          >
            💰 {session.reward.toLocaleString("ko-KR")}
          </div>
          <div className="mt-1 text-xs font-semibold text-amber-700/80">
            x{rewardMultiplier}
          </div>
        </div>
      </div>

      {/* 라운드 안내 */}
      {win === null ? (
        <>
          <div className="mt-6 text-center text-lg font-semibold text-slate-800">
            {stepLabel}
          </div>
          <div className="mt-1 text-center text-slate-600">
            홀/짝을 선택하세요. (50%)
          </div>

          <div className="mx-auto mt-6 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              disabled={guessing}
              onClick={() => onGuess("odd")}
              className={cn(
                "rounded-2xl bg-indigo-600 px-8 py-6 text-xl font-extrabold text-white shadow-sm transition",
                "hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.99]"
              )}
              aria-label="홀 선택 (⚀⚂⚄)"
            >
              <span className="mr-2">홀</span>
              <span className="text-2xl leading-none">⚀⚂⚄</span>
            </Button>
            <Button
              disabled={guessing}
              onClick={() => onGuess("even")}
              className={cn(
                "rounded-2xl bg-blue-600 px-8 py-6 text-xl font-extrabold text-white shadow-sm transition",
                "hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99]"
              )}
              aria-label="짝 선택 (⚁⚃⚅)"
            >
              <span className="mr-2">짝</span>
              <span className="text-2xl leading-none">⚁⚃⚅</span>
            </Button>
          </div>
        </>
      ) : win === true ? (
        <div className="mx-auto mt-8 grid max-w-xl place-items-center gap-5">
          <div className="text-center">
            <span className="text-xl font-bold text-emerald-700">정답! </span>
            <span className="text-xl font-extrabold text-amber-700">
              결과:&nbsp;{lastRoll === "odd" ? "홀" : "짝"}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={onStepUp}
              className="rounded-xl bg-amber-600 text-white shadow-sm transition hover:bg-amber-700"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              한번 더 <span className="ml-1 opacity-80">(보상 2배)</span>
            </Button>
            <Button
              onClick={onClaim}
              variant="outline"
              className="rounded-xl border-emerald-300 text-emerald-700 transition hover:bg-emerald-50"
            >
              <Trophy className="mr-2 h-4 w-4" />
              보상 받기 <span className="ml-1 opacity-80">(여기까지)</span>
            </Button>
          </div>
        </div>
      ) : null}

      {/* 결과 다이얼로그(패배 시 클릭으로 닫기) */}
      <Dialog
        open={resultOpen}
        onOpenChange={(o) => !o && failedThisRound && closeFailModal()}
      >
        <DialogContent className="sm:max-w-[420px]">
          <div className="grid place-items-center gap-3 py-2">
            {revealing ? (
              <>
                <div className="text-sm text-slate-600">
                  주사위 굴리는 중...
                </div>
                <img
                  src="/odd_even/dice-rolling.gif"
                  alt="주사위 굴리는 중"
                  className="h-20 w-20 object-contain"
                />
              </>
            ) : (
              <>
                <div className="text-6xl leading-none">
                  {rolledNumber ?? "-"}
                </div>
                <div className="text-3xl leading-none">
                  <span className="mr-1">
                    {rolledNumber === 1
                      ? "⚀"
                      : rolledNumber === 2
                      ? "⚁"
                      : rolledNumber === 3
                      ? "⚂"
                      : rolledNumber === 4
                      ? "⚃"
                      : rolledNumber === 5
                      ? "⚄"
                      : rolledNumber === 6
                      ? "⚅"
                      : "🎲"}
                  </span>
                  <span className="text-slate-700">
                    ({rolledParity === "even" ? "짝" : "홀"})
                  </span>
                </div>

                {failedThisRound ? (
                  <>
                    <div className="mt-1 font-semibold text-rose-600">
                      실패! 보상을 잃었습니다.
                    </div>
                    <Button
                      onClick={closeFailModal}
                      className="mt-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
                    >
                      닫기
                    </Button>
                  </>
                ) : (
                  <div className="font-semibold text-emerald-600">
                    성공! 계속해서 선택해 주세요.
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 소소한 효과 */}
      <style>{`
        .reward-bounce { animation: reward-bounce 450ms ease-out; }
        @keyframes reward-bounce {
          0% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-6px) scale(1.02); }
          60% { transform: translateY(0) scale(0.995); }
          100% { transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/** 이 게임의 메타 (MiniGamePage에 등록해서 사용) */
export const oddEvenMeta: MiniGameDef = {
  id: "odd-even",
  title: "홀짝 게임",
  icon: <FontAwesomeIcon icon={faDice} className="h-5 w-5" />,
  entryFee: ODD_EVEN_ENTRY_FEE,
  // 백엔드에서 odd_even_start가 베팅금 차감/세션생성까지 처리하므로
  // 페이지에서 spendGold를 또 호출하면 "중복 차감" 됨.
  // 따라서 이 게임은 backend가 참가비를 처리하도록 지정.
  chargeMode: "backend",
  howTo:
    "주사위를 굴려 나오는 수의 홀/짝을 맞히는 게임입니다.\n" +
    `시작과 함께 ${ODD_EVEN_ENTRY_FEE.toLocaleString(
      "ko-KR"
    )}G가 베팅됩니다.\n` +
    "맞히면 현재 보상을 수령하거나 2배로 도전할 수 있어요. 틀리면 보상을 모두 잃습니다.",
  Component: OddEvenGame,
};
