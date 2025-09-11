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
import {
  Play,
  X,
  ShieldAlert,
  Loader2,
  Trophy,
  RotateCcw,
  RefreshCcw,
} from "lucide-react";

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

  /* ───────── Gold / Session State ───────── */
  const [gold, setGold] = useState<number | null>(null);
  const [loadingGold, setLoadingGold] = useState(false);

  const [session, setSession] = useState<Session | null>(null);

  /** 커플 세션이 진행 중이지만, 내 로컬 세션은 없는 경우(=연인이 플레이 중으로 간주) */
  const [blockedByPartner, setBlockedByPartner] = useState(false);

  /** RPC / 시작 버튼 등 공통 체크 로딩 */
  const [checking, setChecking] = useState(false);

  /* ───────── Betting Modal ───────── */
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [bet, setBet] = useState<number>(100);
  const [starting, setStarting] = useState(false);

  /* ───────── Round State ───────── */
  const [guessing, setGuessing] = useState(false);
  const [win, setWin] = useState<boolean | null>(null);
  const [lastRoll, setLastRoll] = useState<"odd" | "even" | null>(null);

  /* ───────── Result Modal ───────── */
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [rolledNumber, setRolledNumber] = useState<number | null>(null);
  const [rolledParity, setRolledParity] = useState<"odd" | "even" | null>(null);
  const [failedThisRound, setFailedThisRound] = useState(false);

  /* ───────── Reward Bounce ───────── */
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
      requestAnimationFrame(() => {
        rewardRef.current?.classList.add("reward-bounce");
        setTimeout(
          () => rewardRef.current?.classList.remove("reward-bounce"),
          450
        );
      });
    }
  }, [session?.reward]);

  /* ───────── Sync: Gold + Session ───────── */
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

  /**
   * 커플 세션 상태를 동기화:
   * - 세션 있으면 session 채우고 blockedByPartner=false
   * - 세션 없으면 session=null, blockedByPartner=false
   * - 세션이 있는데 내 로컬 session이 없을 수 없으므로(백엔드는 커플=1세션), 화면 분기:
   *   -> 이 컴포넌트에서 "내가 참여 중인 세션"만 session으로 잡음
   *   -> "세션은 존재하나 내 화면에서 session==null"인 경우는 없음
   * 실제 차단 로직은 "세션 존재 & 내가 아직 시작 전" 타이밍에서 onClickBet에서 처리.
   */
  const refreshSession = useCallback(async () => {
    if (!coupleId) {
      setSession(null);
      setBlockedByPartner(false);
      return;
    }
    try {
      setChecking(true);
      const { data, error } = await supabase.rpc("odd_even_is_playing");
      if (error) throw error;

      if (data?.is_playing) {
        const s = data?.session;
        const newSession: Session = {
          id: s?.id,
          bet: Number(s?.bet ?? 0),
          step: Number(s?.step ?? 1),
          reward: Number(s?.reward ?? 0),
        };
        setSession(newSession);

        // 내가 이미 세션 화면에 들어온 경우(=session 존재)에는 차단 배너 필요 없음
        setBlockedByPartner(false);
      } else {
        setSession(null);
        setBlockedByPartner(false); // 커플 세션이 없으니 차단 해제
      }
    } catch {
      // 조회 실패 시 세션을 알 수 없으니, 과도한 차단을 피하기 위해 해제
      setSession(null);
      setBlockedByPartner(false);
    } finally {
      setChecking(false);
    }
  }, [coupleId]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  /** 5초마다 커플 세션 상태 폴링 (상대방이 종료하면 자동 해제) */
  useEffect(() => {
    const t = setInterval(() => {
      void refreshSession();
    }, 5000);
    return () => clearInterval(t);
  }, [refreshSession]);

  /* ───────── Betting Flow ───────── */
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
        setBlockedByPartner(true);
        toast.error(
          `연인이 지금 플레이 중이에요 (단계 ${s?.step ?? "?"}, 보상 ${Number(
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

      // 시작 직전 재확인: 커플 세션 존재 시 시작 차단
      const pre = await supabase.rpc("odd_even_is_playing");
      if (pre.error) throw pre.error;
      if (pre.data?.is_playing) {
        const s = pre.data?.session;
        setBlockedByPartner(true);
        setBetModalOpen(false);
        toast.error(
          `연인이 지금 플레이 중이에요 (단계 ${s?.step ?? "?"}, 보상 ${Number(
            s?.reward ?? 0
          ).toLocaleString("ko-KR")}G)`
        );
        await refreshSession();
        return;
      }

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
        setBlockedByPartner(false);
        toast.success(
          `게임 시작! 베팅: ${Number(bet).toLocaleString("ko-KR")}G`
        );
      } else {
        const err = data?.error ?? "unknown";
        if (err === "not_enough_gold") toast.error("골드가 부족해요.");
        else if (err === "already_playing") {
          setBlockedByPartner(true);
          toast.error("연인이 지금 플레이 중이에요.");
        } else if (err === "invalid_bet")
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

  /* ───────── Round ───────── */
  const onGuess = useCallback(
    async (choice: GuessChoice) => {
      if (!session || guessing || win !== null) return;

      setResultModalOpen(true);
      setRevealing(true);
      setRolledNumber(null);
      setRolledParity(null);
      setFailedThisRound(false);

      // "주사위 굴리는 중..." 연출 대기
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

  /* ───────── Derived ───────── */
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
          : blockedByPartner
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : "bg-rose-50 text-rose-700 ring-rose-200"
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          session
            ? "bg-emerald-500"
            : blockedByPartner
            ? "bg-amber-500"
            : "bg-rose-500"
        )}
      />
      {session
        ? "진행 중"
        : blockedByPartner
        ? "연인이 진행 중"
        : "진행 중 아님"}
    </span>
  );

  /* ───────── Render ───────── */
  return (
    <div className={cn("min-h-[calc(100dvh-80px)] w-full")}>
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        {/* 헤더 */}
        <header className="mx-auto mb-6 flex max-w-3xl flex-col items-center justify-center gap-3">
          <h1 className="text-center text-2xl font-extrabold tracking-tight text-slate-900">
            홀짝 게임 <div className="mt-1">{statusPill}</div>
          </h1>
          <p className="text-center text-slate-600">
            베팅하고 홀/짝을 맞춰보세요
          </p>
        </header>

        {/* 차단 배너 (내 세션은 없고, 커플 세션만 존재 → 시작 버튼 막음) */}
        {!session && blockedByPartner && (
          <div className="mx-auto mb-6 w-full max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1">
                <div className="font-semibold">
                  연인이 지금 플레이 중이에요.
                </div>
                <div className="mt-0.5 text-sm">
                  상대가 게임을 종료하거나 보상을 받으면 다시 시작할 수 있어요.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-200 text-amber-700 hover:bg-amber-100"
                onClick={() => void refreshSession()}
                disabled={checking}
              >
                <RefreshCcw className="mr-1.5 h-4 w-4" />
                새로고침
              </Button>
            </div>
          </div>
        )}

        {/* 세션 없음 */}
        {!session && (
          <section className="mx-auto grid max-w-lg place-items-center">
            {!coupleId && (
              <div className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <ShieldAlert className="h-4 w-4" />
                커플 연동 후 이용할 수 있어요.
              </div>
            )}

            <Button
              onClick={onClickBet}
              disabled={checking || !coupleId || blockedByPartner}
              className={cn(
                "rounded-2xl bg-amber-600 px-8 py-6 text-lg font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60",
                (!coupleId || blockedByPartner) && "cursor-not-allowed"
              )}
            >
              {checking ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  확인 중…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  베팅하기
                </span>
              )}
            </Button>

            <div
              className={cn(
                "mt-6 w-full max-w-3xl h-56 sm:h-64 md:h-72",
                "rounded-2xl border shadow-sm",
                "bg-center bg-cover mx-auto"
              )}
              style={{
                backgroundImage: "url(/odd_even/odd-even-background.png)",
              }}
              aria-hidden
            />
          </section>
        )}

        {/* 진행 중 (내 세션) */}
        {session && (
          <section
            className={cn(
              "mx-auto mt-4 max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-colors",
              win === true && "flash-success",
              failedThisRound && "flash-fail"
            )}
          >
            {/* 상단 정보 - 베팅/보상 */}
            <div className="flex flex-col items-center justify-center gap-6">
              <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    베팅액
                  </div>
                  <div className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900">
                    🪙 {session.bet.toLocaleString("ko-KR")}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                  <div className="text-xs font-medium uppercase tracking-wide text-amber-700">
                    현재 보상
                  </div>
                  <div
                    ref={rewardRef}
                    className="mt-1 text-4xl font-extrabold tracking-tight text-amber-900"
                  >
                    💰 {session.reward.toLocaleString("ko-KR")}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-amber-700/80">
                    x{rewardMultiplier}
                  </div>
                </div>
              </div>

              <div className="mt-2 w-full border-t border-slate-200" />
            </div>

            {/* 라운드 & 선택 UI */}
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
                      "rounded-2xl bg-indigo-600 px-8 py-6 text-xl font-extrabold text-white shadow-sm transition hover:bg-indigo-700"
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
                      "rounded-2xl bg-blue-600 px-8 py-6 text-xl font-extrabold text-white shadow-sm transition hover:bg-blue-700"
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
                  <span className="text-xl font-bold text-emerald-700">
                    정답!{" "}
                  </span>
                  <span className="text-xl font-extrabold text-amber-700">
                    결과:&nbsp;{lastRoll === "odd" ? "홀" : "짝"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
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
              </div>
            ) : null}
          </section>
        )}
      </div>

      {/* 베팅 모달 */}
      {betModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4"
          onClick={() => setBetModalOpen(false)}
          aria-hidden={!betModalOpen}
        >
          <div
            className="w-[420px] max-w-[92vw] rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-200"
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
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4"
          onClick={() => {
            if (failedThisRound) closeFailModal();
          }}
          aria-hidden={!resultModalOpen}
        >
          <div
            className="w-[460px] max-w-[92vw] rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mt-5">
              {revealing ? (
                <div className="grid place-items-center gap-3 py-6 text-slate-600">
                  <div className="text-sm">주사위 굴리는 중...</div>
                  <img
                    src="/odd_even/dice-rolling.gif"
                    alt="주사위 굴리는 중"
                    className="h-20 w-20 object-contain"
                  />
                </div>
              ) : (
                <div className="grid place-items-center gap-3">
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

      {/* 효과 & 애니메이션 */}
      <style>{`
  .reward-bounce {
    animation: reward-bounce 450ms ease-out;
  }
  @keyframes reward-bounce {
    0% { transform: translateY(0) scale(1); }
    30% { transform: translateY(-6px) scale(1.02); }
    60% { transform: translateY(0) scale(0.995); }
    100% { transform: translateY(0) scale(1); }
  }

  /* 정답 / 오답 플래시 이팩트 */
  .flash-success {
    animation: flash-success 800ms ease-out;
  }
  .flash-fail {
    animation: flash-fail 800ms ease-out;
  }
  @keyframes flash-success {
    0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.0); background-color: #ffffff; }
    15%  { box-shadow: 0 0 0 6px rgba(16,185,129,0.25); background-color: rgba(16,185,129,0.06); }
    60%  { box-shadow: 0 0 0 0 rgba(16,185,129,0.0); }
    100% { background-color: #ffffff; }
  }
  @keyframes flash-fail {
    0%   { box-shadow: 0 0 0 0 rgba(244,63,94,0.0); background-color: #ffffff; }
    15%  { box-shadow: 0 0 0 6px rgba(244,63,94,0.25); background-color: rgba(244,63,94,0.06); }
    60%  { box-shadow: 0 0 0 0 rgba(244,63,94,0.0); }
    100% { background-color: #ffffff; }
  }
`}</style>
    </div>
  );
}
