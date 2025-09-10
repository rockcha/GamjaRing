// src/app/games/odd-even/OddEvenGamesPage.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Play, X, ShieldAlert, Loader2, Trophy, RotateCcw } from "lucide-react";

type Session = {
  id: string;
  bet: number;
  reward: number;
  step: number;
};

type GuessChoice = "odd" | "even";

export default function OddEvenGamesPage() {
  const { couple } = useCoupleContext();
  const { user } = useUser();
  const coupleId = couple?.id ?? null;

  // 잔여 골드 (베팅 모달 검증용만 사용)
  const [gold, setGold] = useState<number | null>(null);
  const [loadingGold, setLoadingGold] = useState(false);

  // 세션
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(false);

  // 베팅 모달
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [bet, setBet] = useState<number>(100);
  const [starting, setStarting] = useState(false);

  // 라운드 진행 상태
  const [guessing, setGuessing] = useState(false);
  const [win, setWin] = useState<boolean | null>(null);
  const [lastRoll, setLastRoll] = useState<"odd" | "even" | null>(null);

  // 결과 모달
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [rolledNumber, setRolledNumber] = useState<number | null>(null);
  const [rolledParity, setRolledParity] = useState<"odd" | "even" | null>(null);
  const [failedThisRound, setFailedThisRound] = useState(false);

  // 보상 점프 애니메이션 트리거
  const rewardRef = useRef<HTMLDivElement | null>(null);
  const lastReward = useRef<number | null>(null);
  useEffect(() => {
    if (!session) return;
    if (lastReward.current == null) {
      lastReward.current = session.reward;
      return;
    }
    if (lastReward.current !== session.reward) {
      lastReward.current = session.reward;
      rewardRef.current?.classList.remove("reward-bounce");
      // next tick
      requestAnimationFrame(() => {
        rewardRef.current?.classList.add("reward-bounce");
        setTimeout(
          () => rewardRef.current?.classList.remove("reward-bounce"),
          450
        );
      });
    }
  }, [session?.reward]);

  /* ───────── 잔액 / 세션 동기화 ───────── */
  const refreshGold = useCallback(async () => {
    if (!coupleId) return;
    try {
      setLoadingGold(true);
      const { data, error } = await supabase
        .from("couples")
        .select("gold")
        .eq("id", coupleId)
        .maybeSingle();
      if (error) throw error;
      setGold(Number(data?.gold ?? 0));
    } catch {
      setGold(null);
    } finally {
      setLoadingGold(false);
    }
  }, [coupleId]);

  const refreshSession = useCallback(async () => {
    if (!coupleId) {
      setSession(null);
      return;
    }
    try {
      setChecking(true);
      const { data, error } = await supabase.rpc("odd_even_is_playing");
      if (error) throw error;
      if (data?.is_playing) {
        const s = data?.session;
        setSession({
          id: s?.id,
          bet: Number(s?.bet ?? 0),
          step: Number(s?.step ?? 1),
          reward: Number(s?.reward ?? 0),
        });
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setChecking(false);
    }
  }, [coupleId]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  /* ───────── 베팅 플로우 ───────── */
  const onClickBet = useCallback(async () => {
    if (!user?.id || !coupleId) {
      toast.warning("커플 연동 후 이용해 주세요.");
      return;
    }
    try {
      setChecking(true);
      const { data, error } = await supabase.rpc("odd_even_is_playing");
      if (error) throw error;

      if (data?.is_playing) {
        const s = data?.session;
        toast.error(
          `현재 진행 중입니다 (단계 ${s?.step ?? "?"}, 보상 ${Number(
            s?.reward ?? 0
          ).toLocaleString("ko-KR")}G)`
        );
        await refreshSession();
        return;
      }

      await refreshGold();
      setBet(100);
      setBetModalOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("진행 여부 확인에 실패했어요.");
    } finally {
      setChecking(false);
    }
  }, [user?.id, coupleId, refreshGold, refreshSession]);

  const betValid = useMemo(() => {
    if (!gold && gold !== 0) return false;
    if (!bet || bet <= 0) return false;
    if (bet > (gold ?? 0)) return false;
    return Number.isFinite(bet);
  }, [bet, gold]);

  const onStartGame = useCallback(async () => {
    if (!betValid) {
      toast.warning("베팅 금액을 확인해 주세요.");
      return;
    }
    try {
      setStarting(true);
      const { data, error } = await supabase.rpc("odd_even_start", {
        p_bet: bet,
      });
      if (error) throw error;

      if (data?.ok) {
        setSession({
          id: data.session_id,
          bet: Number(data.bet ?? bet),
          step: Number(data.step ?? 1),
          reward: Number(data.reward ?? bet),
        });
        setBetModalOpen(false);
        setWin(null);
        setLastRoll(null);
        toast.success(
          `게임 시작! 베팅: ${Number(bet).toLocaleString("ko-KR")}G`
        );
      } else {
        const err = data?.error ?? "unknown";
        if (err === "not_enough_gold") toast.error("골드가 부족해요.");
        else if (err === "already_playing") toast.error("이미 진행 중이에요.");
        else if (err === "invalid_bet")
          toast.error("베팅 금액이 올바르지 않아요.");
        else toast.error("게임 시작에 실패했어요.");
      }
    } catch (e) {
      console.error(e);
      toast.error("게임 시작 중 오류가 발생했어요.");
    } finally {
      setStarting(false);
      await refreshGold();
      await refreshSession();
    }
  }, [bet, betValid, refreshGold, refreshSession]);

  /* ───────── 라운드 진행 ───────── */
  const onGuess = useCallback(
    async (choice: GuessChoice) => {
      if (!session || guessing || win !== null) return;

      setResultModalOpen(true);
      setRevealing(true);
      setRolledNumber(null);
      setRolledParity(null);
      setFailedThisRound(false);

      const wait = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      await wait(3000);

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
        setResultModalOpen(false);
        toast.success(
          `정답! (결과: ${
            parity === "odd" ? "홀" : "짝"
          }) 이어서 진행할지 보상을 받을지 선택하세요.`
        );
      }
    },
    [session, guessing, win]
  );

  const onStepUp = useCallback(async () => {
    if (!session || win !== true) return;
    try {
      setGuessing(true);
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
        await refreshSession();
      }
    } catch (e) {
      console.error(e);
      toast.error("단계 상승 중 오류가 발생했어요.");
    } finally {
      setGuessing(false);
    }
  }, [session, win, refreshSession]);

  const onClaim = useCallback(async () => {
    if (!session || win !== true) return;
    try {
      setGuessing(true);
      const { data, error } = await supabase.rpc("odd_even_claim");
      if (error) throw error;

      if (data?.ok) {
        toast.success(
          `보상 획득 +${Number(data.gained ?? session.reward).toLocaleString(
            "ko-KR"
          )}G`
        );
        setSession(null);
        await refreshGold();
        await refreshSession();
      } else {
        toast.error("보상 수령에 실패했어요.");
      }
    } catch (e) {
      console.error(e);
      toast.error("보상 수령 중 오류가 발생했어요.");
    } finally {
      setGuessing(false);
    }
  }, [session, win, refreshGold, refreshSession]);

  const closeFailModal = useCallback(async () => {
    setResultModalOpen(false);
    setFailedThisRound(false);
    setWin(null);
    setLastRoll(null);
    setRolledNumber(null);
    setRolledParity(null);
    await refreshSession();
    await refreshGold();
  }, [refreshSession, refreshGold]);

  /* ───────── 파생 정보 ───────── */
  const stepLabel = useMemo(() => {
    if (!session) return "";
    if (session.step === 1) return "첫 번째 라운드";
    return `${session.step}번째 라운드`;
  }, [session]);

  const rewardMultiplier = useMemo(() => {
    if (!session) return 1;
    const mul = session.bet ? session.reward / session.bet : 1;
    return Number.isInteger(mul) ? mul : Number(mul.toFixed(2));
  }, [session]);

  const statusPill = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1",
        session
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-rose-50 text-rose-700 ring-rose-200"
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          session ? "bg-emerald-500" : "bg-rose-500"
        )}
      />
      {session ? "진행 중" : "진행 중 아님"}
    </span>
  );

  /* ───────── 렌더 ───────── */
  return (
    <div
      className="min-h-[calc(100dvh-80px)] w-full bg-fixed bg-cover bg-center"
      style={{ backgroundImage: "url(/odd_even/odd-even-background.png)" }}
    >
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6 flex flex-col items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm sm:flex-row">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              홀짝 게임
            </h1>
            <p className="text-slate-600">베팅하고 홀/짝을 맞춰보세요</p>
          </div>
          <div>{statusPill}</div>
        </div>

        {/* 세션 없을 때 */}
        {!session && (
          <>
            {!coupleId && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-center justify-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                커플 연동 후 이용할 수 있어요.
              </div>
            )}
            <div className="flex justify-center">
              <Button
                onClick={onClickBet}
                disabled={checking || !coupleId}
                className={cn(
                  "rounded-xl bg-amber-600 px-8 py-6 text-lg font-bold text-white shadow-sm transition hover:bg-amber-700",
                  !coupleId && "cursor-not-allowed opacity-60"
                )}
              >
                {checking ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    확인 중…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    베팅하기
                  </span>
                )}
              </Button>
            </div>
          </>
        )}

        {/* 진행 중 화면 */}
        {session && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            {/* 상단: 보상/배수/베팅액/단계 */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                현재 보상
              </div>

              <div
                ref={rewardRef}
                className="text-5xl font-extrabold tracking-tight text-slate-900"
              >
                {session.reward.toLocaleString("ko-KR")} G
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  베팅액의{" "}
                  <b className="ml-1 text-slate-900">{rewardMultiplier}배</b>
                </span>
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                  베팅액:{" "}
                  <b className="ml-1 text-amber-800">
                    {session.bet.toLocaleString("ko-KR")} G
                  </b>
                </span>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                  단계: <b className="ml-1 text-indigo-900">{session.step}</b>
                </span>
              </div>
            </div>

            {/* 라운드 / 선택 */}
            {win === null ? (
              <>
                <div className="mt-8 text-center text-lg font-semibold text-slate-800">
                  {stepLabel}
                </div>
                <div className="mt-2 text-center text-slate-600">
                  홀/짝을 선택하세요. (50%)
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    disabled={guessing}
                    onClick={() => onGuess("odd")}
                    className={cn(
                      "rounded-2xl bg-indigo-600 px-8 py-6 text-xl font-extrabold text-white shadow-sm transition hover:bg-indigo-700"
                    )}
                  >
                    홀
                  </Button>
                  <Button
                    disabled={guessing}
                    onClick={() => onGuess("even")}
                    className={cn(
                      "rounded-2xl bg-blue-600 px-8 py-6 text-xl font-extrabold text-white shadow-sm transition hover:bg-blue-700"
                    )}
                  >
                    짝
                  </Button>
                </div>
              </>
            ) : win === true ? (
              <>
                <div className="mt-8 text-center">
                  <span className="text-xl font-bold text-emerald-700">
                    정답!{" "}
                  </span>
                  <span className="text-xl font-extrabold text-amber-700">
                    결과:&nbsp;{lastRoll === "odd" ? "홀" : "짝"}
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    disabled={guessing}
                    onClick={onStepUp}
                    className="rounded-xl bg-amber-600 text-white shadow-sm transition hover:bg-amber-700"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    한번 더{" "}
                    <span className="ml-1 opacity-80">
                      (보상이 2배가 됩니다.)
                    </span>
                  </Button>
                  <Button
                    disabled={guessing}
                    onClick={onClaim}
                    variant="outline"
                    className="rounded-xl border-emerald-300 text-emerald-700 transition hover:bg-emerald-50"
                  >
                    <Trophy className="mr-2 h-4 w-4" />
                    보상 받기{" "}
                    <span className="ml-1 opacity-80">(여기까지 할래요)</span>
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* 베팅 모달 */}
      {betModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setBetModalOpen(false)}
          aria-hidden={!betModalOpen}
        >
          <div
            className="w-[420px] max-w-[90vw] rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                베팅 금액 입력
              </h2>
              <button
                className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-50"
                onClick={() => setBetModalOpen(false)}
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="text-sm text-slate-600">
                잔여 골드:&nbsp;
                {loadingGold ? (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    불러오는 중…
                  </span>
                ) : gold !== null ? (
                  <b className="text-slate-900">
                    {gold.toLocaleString("ko-KR")}G
                  </b>
                ) : (
                  "-"
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={bet}
                  onChange={(e) => setBet(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring-2"
                  placeholder="베팅할 골드"
                />
                <span className="text-sm text-slate-500">G</span>
              </div>

              {!betValid && (
                <div className="text-xs text-rose-600">
                  올바른 금액을 입력해 주세요. (잔여 골드 이내)
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setBetModalOpen(false)}
                className="border-slate-200 text-slate-700"
              >
                취소
              </Button>
              <Button
                onClick={onStartGame}
                disabled={!betValid || starting}
                className={cn(
                  "bg-amber-600 text-white transition hover:bg-amber-700",
                  (!betValid || starting) && "opacity-60"
                )}
              >
                {starting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    시작 중…
                  </span>
                ) : (
                  "게임 시작"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 결과 모달 */}
      {resultModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => {
            if (failedThisRound) closeFailModal();
          }}
          aria-hidden={!resultModalOpen}
        >
          <div
            className="w-[460px] max-w-[92vw] rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {revealing ? "결과 공개중…" : "결과"}
              </h3>
              {failedThisRound ? (
                <button
                  className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-50"
                  onClick={closeFailModal}
                  aria-label="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <div className="h-8 w-8" />
              )}
            </div>

            <div className="mt-5">
              {revealing ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                  <div className="mt-3 text-sm text-slate-600">
                    결과 공개중입니다…
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="leading-none text-6xl font-extrabold text-slate-900">
                    {rolledNumber ?? "-"}
                  </div>
                  <div className="text-xl font-extrabold">
                    <span className="text-slate-700">결과:&nbsp;</span>
                    <span className="text-amber-700">
                      {rolledParity === "odd" ? "홀" : "짝"}
                    </span>
                  </div>

                  {failedThisRound ? (
                    <>
                      <div className="mt-2 font-semibold text-rose-600">
                        실패! 보상을 잃었습니다.
                      </div>
                      <div className="mt-4">
                        <Button
                          onClick={closeFailModal}
                          className="rounded-lg bg-slate-800 text-white transition hover:bg-slate-700"
                        >
                          닫기
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="font-semibold text-emerald-600">
                      성공! 계속해서 선택해 주세요.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 보상 점프 애니메이션 */}
      <style jsx>{`
        .reward-bounce {
          animation: reward-bounce 450ms ease-out;
        }
        @keyframes reward-bounce {
          0% {
            transform: translateY(0) scale(1);
          }
          30% {
            transform: translateY(-6px) scale(1.02);
          }
          60% {
            transform: translateY(0) scale(0.995);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
