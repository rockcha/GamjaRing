"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
import { Sparkles } from "lucide-react";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCoins,
  faCirclePlay,
  faDoorOpen,
  faGamepad,
  faCircleQuestion,
} from "@fortawesome/free-solid-svg-icons";

/* 게임 컴포넌트 & 메타 */
import {
  recipeMemoryMeta,
  type MiniGameDef,
} from "@/features/mini_games/RecipeMemoryGame";
import { potatoTossMeta } from "@/features/mini_games/potato_toss/PotatoTossGame";
import { shadowPiecesMeta } from "@/features/mini_games/shadow_pieces";

const GAMES: MiniGameDef[] = [
  recipeMemoryMeta,
  potatoTossMeta,
  shadowPiecesMeta,
];

export default function MiniGamePage() {
  const { couple, spendGold, fetchCoupleData } = useCoupleContext();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // 설명 다이얼로그
  const [howTarget, setHowTarget] = useState<MiniGameDef | null>(null);
  const howOpen = useMemo(() => !!howTarget, [howTarget]);

  const selectedGame = GAMES.find((g) => g.id === selectedId) || null;

  const startGame = useCallback(async () => {
    if (!selectedGame) return;
    const fee = selectedGame.entryFee ?? 30;
    try {
      if (typeof couple?.gold === "number" && couple.gold < fee) {
        toast.error(`골드가 부족해요 (필요: ${fee})`);
        return;
      }
      const ok = await spendGold?.(fee);
      if (!ok) {
        toast.error("참가비를 지불하지 못했어요.");
        return;
      }
      await fetchCoupleData?.();
      setIsRunning(true);
      toast.success(`참가비 ${fee}골드를 지불했어요. 행운을!`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "참가비 결제 중 오류");
    }
  }, [selectedGame, couple?.gold, spendGold, fetchCoupleData]);

  const stopGame = useCallback(() => setIsRunning(false), []);

  // ⌨️ 접근성: Enter로 시작, Esc로 포기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedGame) return;
      if (!isRunning && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        startGame();
      } else if (isRunning && e.key === "Escape") {
        e.preventDefault();
        stopGame();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRunning, selectedGame, startGame, stopGame]);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 md:px-8 py-6 md:py-10">
      {/* ── 상단 헤더 (풀블리드 느낌) ─────────────────────────────────────── */}
      <div className="-mx-4 md:-mx-8 px-4 md:px-8 sticky top-0 z-30 bg-background/75 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between py-5 md:py-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <Sparkles className="h-8 w-8 md:h-9 md:w-9" />
            미니게임
            <Badge
              variant="outline"
              className="ml-2 gap-2 text-[0.8rem] py-1 px-2"
            >
              <FontAwesomeIcon icon={faGamepad} className="h-4 w-4" />
              게임을 선택해 시작하세요
            </Badge>
          </h1>
          {/* (옵션) 우측 글로벌 액션 영역 */}
        </div>

        {/* 모바일/태블릿: 가로 스트립. 데스크톱에선 레일로 대체 */}
        <div className="pb-3 md:hidden">
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {GAMES.map((g) => {
              const active = selectedId === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedId(g.id);
                    setIsRunning(false);
                  }}
                  className={cn(
                    "relative aspect-square w-32 rounded-2xl border bg-card transition group",
                    "hover:bg-muted active:scale-[0.98]",
                    active
                      ? "border-primary/50 ring-2 ring-primary/30 shadow-md"
                      : "border-slate-200"
                  )}
                  title={`${g.title} (참가비 ${g.entryFee}G)`}
                  aria-current={active ? "true" : "false"}
                >
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 p-3">
                    <span
                      className={cn(
                        "text-3xl group-hover:scale-110 transition-transform",
                        active && "text-primary"
                      )}
                    >
                      {g.icon}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold text-center line-clamp-2 leading-tight",
                        active && "text-primary"
                      )}
                    >
                      {g.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 본문: md↑ 2단 (좌: 레일 / 우: 콘텐츠) ───────────────────────── */}
      <div className="mt-6 md:mt-8 grid md:grid-cols-[320px,1fr] gap-6 md:gap-8">
        {/* 좌측 레일 (데스크톱 전용) */}
        <aside className="hidden md:block sticky top-[92px] self-start">
          <Card className="rounded-3xl shadow-sm">
            <ul className="p-3 space-y-1.5">
              {GAMES.map((g) => {
                const active = selectedId === g.id;
                return (
                  <li key={g.id}>
                    <button
                      onClick={() => {
                        setSelectedId(g.id);
                        setIsRunning(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 rounded-2xl px-4 py-3 transition group",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                      title={`${g.title} (참가비 ${g.entryFee}G)`}
                      aria-current={active ? "true" : "false"}
                    >
                      <span
                        className={cn(
                          "inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted transition-transform group-hover:scale-[1.03]",
                          active && "bg-primary/15"
                        )}
                        aria-hidden
                      >
                        <span className={cn("text-2xl", active && "scale-110")}>
                          {g.icon}
                        </span>
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate text-lg">
                          {g.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          참가비 {g.entryFee}G
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </aside>

        {/* 우측 콘텐츠 */}
        <section className="min-w-0">
          {/* 상단 정보 헤더 */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {!!selectedGame && (
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-sm shrink-0">
                  <span className="text-3xl">{selectedGame.icon}</span>
                </div>
              )}
              <h2 className="text-3xl md:text-4xl font-extrabold leading-tight truncate">
                {selectedGame?.title ?? "미니게임 대기 화면"}
              </h2>
            </div>

            {!!selectedGame && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="gap-2 text-sm py-1.5 px-2.5"
                >
                  <FontAwesomeIcon icon={faCoins} className="h-4 w-4" />
                  {selectedGame.entryFee}G
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHowTarget(selectedGame)}
                  className="gap-2"
                >
                  <FontAwesomeIcon
                    icon={faCircleQuestion}
                    className="h-4 w-4"
                  />
                  설명
                </Button>
                {isRunning && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={stopGame}
                    className="gap-2"
                  >
                    <FontAwesomeIcon icon={faDoorOpen} className="h-4 w-4" />
                    포기 (Esc)
                  </Button>
                )}
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* 플레이 영역 */}
          <div className="min-h-[620px] grid place-items-center">
            {!selectedGame ? (
              // 선택 전 플레이스홀더
              <img
                src="/minigame/minigame_placeholder.png"
                alt="미니게임 플레이스홀더"
                className="max-h-[640px] object-contain opacity-90"
              />
            ) : !isRunning ? (
              // 대기 화면: 포스터 + 유리버튼
              <div className="w-full max-w-6xl mx-auto">
                <div className="relative overflow-hidden rounded-[28px] ring-1 ring-slate-200/80 bg-white/70 shadow-md">
                  <div className="relative aspect-video w-full min-h-[540px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/minigame/${encodeURIComponent(
                        selectedGame.id
                      )}.png`}
                      alt={`${selectedGame.title} 포스터`}
                      className="absolute inset-0 h-full w-full object-cover object-center will-change-transform"
                      loading="lazy"
                    />
                    {/* 상·하 그래디언트 + 글래스 */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/45" />
                      <div className="absolute inset-6 rounded-3xl bg-white/5 backdrop-blur-[2px] ring-1 ring-white/10" />
                    </div>
                    {/* 중앙 Play 버튼 */}
                    <div className="absolute inset-0 grid place-items-center">
                      <Button
                        onClick={startGame}
                        className="h-16 md:h-18 px-8 md:px-10 gap-3 rounded-full text-lg md:text-xl hover:bg-neutral-700 "
                        aria-label="게임 시작"
                      >
                        <FontAwesomeIcon
                          icon={faCirclePlay}
                          className="h-6 w-6"
                        />
                        게임 시작 ({selectedGame.entryFee} G)
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Enter 또는 Space로도 시작할 수 있어요.
                </p>
              </div>
            ) : (
              // 진행 중: 실제 게임
              <selectedGame.Component onExit={stopGame} />
            )}
          </div>
        </section>
      </div>

      {/* 공용: 게임 설명 다이얼로그 */}
      <Dialog open={howOpen} onOpenChange={(o) => !o && setHowTarget(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              게임 설명 — {howTarget?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground whitespace-pre-line break-words leading-relaxed">
            {howTarget?.howTo}
          </div>
        </DialogContent>
      </Dialog>

      {/* 스크롤바 숨김 보조 스타일 */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
