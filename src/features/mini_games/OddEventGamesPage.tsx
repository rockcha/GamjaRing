// src/app/games/odd-even/OddEvenGamesPage.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Coins,
  Play,
  X,
  ShieldAlert,
  Loader2,
  Dice1,
  Dice2,
  Trophy,
  RotateCcw,
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

  // 잔여 골드
  const [gold, setGold] = useState<number | null>(null);
  const [loadingGold, setLoadingGold] = useState(false);

  // 세션
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(false);

  // 베팅 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [bet, setBet] = useState<number>(100);
  const [starting, setStarting] = useState(false);

  // 라운드 진행 상태
  const [guessing, setGuessing] = useState(false);
  const [lastRoll, setLastRoll] = useState<"odd" | "even" | null>(null);
  const [win, setWin] = useState<boolean | null>(null); // null: 아직 판정 전/다음 라운드 준비중

  // 공통: 잔액 새로고침
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

  // 공통: 세션 로드
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

  // 초기 로드
  useEffect(() => {
    void refreshGold();
    void refreshSession();
  }, [refreshGold, refreshSession]);

  // “베팅하기” 버튼
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

      // 진행중 아님 → 모달 열고 최신 잔액 동기화
      await refreshGold();
      setBet(100);
      setModalOpen(true);
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

  // 게임 시작
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
        // 세션 반영
        setSession({
          id: data.session_id,
          bet: Number(data.bet ?? bet),
          step: Number(data.step ?? 1),
          reward: Number(data.reward ?? bet),
        });
        setModalOpen(false);
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
      await refreshGold(); // 혹시 모를 동기화
      await refreshSession();
    }
  }, [bet, betValid, refreshGold, refreshSession]);

  // 홀/짝 선택 (클라이언트 50%)
  const onGuess = useCallback(
    async (choice: GuessChoice) => {
      if (!session || guessing || win !== null) return;
      try {
        setGuessing(true);

        // 50% 판정
        const rollOdd = Math.random() < 0.5;
        const rolled: GuessChoice = rollOdd ? "odd" : "even";
        setLastRoll(rolled);

        const success = rolled === choice;
        setWin(success);

        if (!success) {
          // 실패 즉시 RPC
          const { data, error } = await supabase.rpc("odd_even_fail");
          if (error) throw error;

          toast.error(
            `실패! ${session.bet.toLocaleString(
              "ko-KR"
            )}G 차감되었습니다. (결과: ${rolled === "odd" ? "홀" : "짝"})`
          );

          // 세션 종료 + 잔액 동기화
          setSession(null);
          await refreshGold();
          await refreshSession();
        } else {
          // 성공: 사용자 선택(한번 더 or 보상 받기) 대기
          toast.success(
            `성공! (결과: ${
              rolled === "odd" ? "홀" : "짝"
            }) 이어서 진행할지 보상을 받을지 선택하세요.`
          );
        }
      } catch (e) {
        console.error(e);
        toast.error("판정 처리 중 오류가 발생했어요.");
      } finally {
        setGuessing(false);
      }
    },
    [session, guessing, win, refreshGold, refreshSession]
  );

  // 한번 더 (단계 상승)
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
        // 다음 라운드로 초기화
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

  // 보상 받기
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">홀짝 게임</h1>
        <p className="text-slate-600 mt-1">
          베팅하고 홀/짝을 맞혀 보세요. (한 번에 한 커플만 진행)
        </p>
      </header>

      {/* 카드: 잔여 골드 + 베팅하기/진행중 안내 */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-slate-700">
              잔여 골드:&nbsp;
              {loadingGold ? (
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  불러오는 중…
                </span>
              ) : gold !== null ? (
                <b className="text-amber-700">
                  {gold.toLocaleString("ko-KR")}G
                </b>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </span>
          </div>

          {!session ? (
            <Button
              onClick={onClickBet}
              disabled={checking || !coupleId}
              className={cn(
                "bg-amber-600 hover:bg-amber-700 text-white",
                !coupleId && "cursor-not-allowed opacity-60"
              )}
            >
              {checking ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  확인 중…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  베팅하기
                </span>
              )}
            </Button>
          ) : (
            <div className="text-sm text-emerald-700 font-semibold">
              진행 중
            </div>
          )}
        </div>

        {!coupleId && (
          <div className="mt-4 rounded-md border bg-amber-50 p-3 text-sm text-amber-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            커플 연동 후 이용할 수 있어요.
          </div>
        )}
      </div>

      {/* 진행 중 UI */}
      {session && (
        <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-4">
            <InfoBox
              label="베팅액"
              value={`${session.bet.toLocaleString("ko-KR")} G`}
            />
            <InfoBox
              label="현재 보상"
              value={`${session.reward.toLocaleString("ko-KR")} G`}
            />
            <InfoBox label="단계" value={`${session.step}`} />
          </div>

          {/* 라운드 UI */}
          <div className="mt-2">
            {win === null ? (
              <>
                <div className="text-sm text-slate-600 mb-2">
                  홀/짝을 선택하세요. (50%)
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={guessing}
                    onClick={() => onGuess("odd")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Dice1 className="w-4 h-4 mr-2" />홀
                  </Button>
                  <Button
                    disabled={guessing}
                    onClick={() => onGuess("even")}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Dice2 className="w-4 h-4 mr-2" />짝
                  </Button>
                </div>
              </>
            ) : win === true ? (
              <>
                <div className="text-emerald-700 font-semibold">
                  정답! (결과: {lastRoll === "odd" ? "홀" : "짝"})
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    disabled={guessing}
                    onClick={onStepUp}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    한번 더 (단계 상승)
                  </Button>
                  <Button
                    disabled={guessing}
                    onClick={onClaim}
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    보상 받기
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-rose-600 font-semibold">
                오답! (결과: {lastRoll === "odd" ? "홀" : "짝"}) — 세션이
                종료되었습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 베팅 모달 --- */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setModalOpen(false)}
          aria-hidden={!modalOpen}
        >
          <div
            className="w-[420px] max-w-[90vw] rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">베팅 금액 입력</h2>
              <button
                className="p-1.5 rounded-md border hover:bg-gray-50"
                onClick={() => setModalOpen(false)}
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="text-sm text-slate-600">
                잔여 골드:&nbsp;
                {gold !== null ? (
                  <b className="text-amber-700">
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
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
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
                onClick={() => setModalOpen(false)}
                className="border-gray-200"
              >
                취소
              </Button>
              <Button
                onClick={onStartGame}
                disabled={!betValid || starting}
                className={cn(
                  "bg-amber-600 hover:bg-amber-700 text-white",
                  (!betValid || starting) && "opacity-60"
                )}
              >
                {starting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
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
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
