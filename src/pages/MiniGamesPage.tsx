"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const GAMES: MiniGameDef[] = [
  recipeMemoryMeta,
  // 새 미니게임 추가 시 여기 meta만 push
];

export default function MiniGamePage() {
  const { couple, spendGold, fetchCoupleData } = useCoupleContext();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // 설명 다이얼로그
  const [howTarget, setHowTarget] = useState<MiniGameDef | null>(null);
  const howOpen = useMemo(() => !!howTarget, [howTarget]);

  const selectedGame = GAMES.find((g) => g.id === selectedId) || null;

  const startGame = async () => {
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
  };

  const stopGame = () => setIsRunning(false);

  // 하단(플레이 영역) 포스터 이미지: /public/minigame/(게임 id).png
  const posterUrl = selectedGame
    ? `/minigame/${encodeURIComponent(selectedGame.id)}.png`
    : null;

  // 좌측 레일 접힘 상태: 게임이 선택되었을 때 true
  const collapsed = !!selectedGame;
  const gridCols = collapsed
    ? "md:grid-cols-[84px_minmax(0,1fr)]"
    : "md:grid-cols-[280px_minmax(0,1fr)]";

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Sparkles className="h-6 w-6" />
        미니게임
        <Badge variant="outline" className="ml-2 gap-1">
          <FontAwesomeIcon icon={faGamepad} className="h-3 w-3" />
          게임을 선택해 시작하세요
        </Badge>
      </h1>

      <Separator className="my-4" />

      {/* 좌폭 접힘/확장 토글: 아이콘 레일 84px ↔ 목록 280px */}
      <div className={cn("grid grid-cols-1 gap-4", gridCols)}>
        {/* 좌측: 아이콘 레일(선택 시) / 전체 목록(미선택 시) */}
        <Card className={cn(collapsed ? "p-3" : "p-5")}>
          <h2
            className={cn(
              "mb-2 font-semibold",
              collapsed ? "text-xs" : "text-sm"
            )}
          >
            게임 {collapsed ? "" : "목록"}
          </h2>

          {/* 접힘 상태: 아이콘만 세로로 */}
          {collapsed ? (
            <ScrollArea className="h-[560px] pr-1">
              <div className="flex flex-col items-center gap-2">
                {GAMES.map((g) => {
                  const active = selectedId === g.id;
                  return (
                    <button
                      key={g.id}
                      title={`${g.title} (참가비 ${g.entryFee}G)`}
                      onClick={() => {
                        setSelectedId(g.id);
                        // 접힌 상태에서도 아이콘 클릭으로 즉시 교체 가능
                        // 실행 중인 상태는 유지
                      }}
                      className={cn(
                        "relative grid h-12 w-12 place-items-center rounded-xl border transition",
                        "bg-white hover:bg-muted",
                        active
                          ? "text-primary border-primary/40 ring-2 ring-primary/30 shadow-sm"
                          : "border-transparent"
                      )}
                      aria-current={active ? "true" : "false"}
                    >
                      <span className="text-base leading-none scale-110">
                        {g.icon}
                      </span>
                      {active && (
                        <span
                          aria-hidden
                          className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            // 미선택: 기존 전체 목록(아이콘 + 제목 + 설명 버튼)
            <ScrollArea className="h-[560px] pr-2">
              <div className="space-y-2">
                {GAMES.map((g) => {
                  const active = selectedId === g.id;
                  return (
                    <div
                      key={g.id}
                      className={cn(
                        "group w-full rounded-md border transition relative",
                        active
                          ? "bg-muted border-primary/40 ring-2 ring-primary/15"
                          : "hover:bg-primary/5 hover:border-primary/30 hover:ring-1 hover:ring-primary/20"
                      )}
                    >
                      <button
                        onClick={() => {
                          setSelectedId(g.id);
                          setIsRunning(false);
                        }}
                        className="w-full text-left p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="shrink-0 text-primary group-hover:scale-110 transition">
                            {g.icon}
                          </span>
                          <div className="flex-1 font-medium">{g.title}</div>
                        </div>
                      </button>

                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => setHowTarget(g)}
                          aria-label="게임 설명"
                          title="게임 설명"
                        >
                          <FontAwesomeIcon
                            icon={faCircleQuestion}
                            className="h-4 w-4"
                          />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* 우측: 상세/실행 */}
        <Card className="p-4">
          {/* 상단: 아이콘 + 제목 강조 + 버튼들 */}
          <div className="w-full flex flex-col items-center justify-center">
            <div className="flex items-center gap-3">
              {!!selectedGame && (
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
                  <span className="scale-110">{selectedGame.icon}</span>
                </div>
              )}
              <h2 className="text-2xl md:text-3xl font-extrabold text-center">
                {selectedGame?.title ?? "미니게임 대기 화면"}
              </h2>
              {!!selectedGame && !isRunning && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={() => setHowTarget(selectedGame)}
                  aria-label="게임 설명"
                  title="게임 설명"
                >
                  <FontAwesomeIcon
                    icon={faCircleQuestion}
                    className="h-4 w-4"
                  />
                </Button>
              )}
            </div>

            {!!selectedGame && (
              <div className="mt-2">
                <Badge variant="secondary" className="gap-1">
                  <FontAwesomeIcon icon={faCoins} className="h-3 w-3" />
                  참가비 {selectedGame.entryFee} 골드
                </Badge>
              </div>
            )}

            {!!selectedGame && !isRunning && (
              <div className="mt-4">
                <Button
                  onClick={startGame}
                  className="gap-2 px-5 py-3 text-sm rounded-lg"
                >
                  <FontAwesomeIcon icon={faCirclePlay} className="h-4 w-4" />
                  게임 시작 ({selectedGame.entryFee} 골드)
                </Button>
              </div>
            )}

            {!!selectedGame && isRunning && (
              <div className="mt-4">
                <Button
                  variant="secondary"
                  onClick={stopGame}
                  className="gap-2"
                >
                  <FontAwesomeIcon icon={faDoorOpen} className="h-4 w-4" />
                  포기하기
                </Button>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* 하단: 대기/플레이 영역 (선택 전/후에 따른 포스터/플레이) */}
          <div className="min-h-[520px] grid place-items-center">
            {!selectedGame ? (
              <img
                src="/minigame/minigame_placeholder.png"
                alt="미니게임 플레이스홀더"
                className="max-h-[420px] object-contain opacity-85"
              />
            ) : !isRunning ? (
              <div className="w-full max-w-3xl mx-auto">
                <div className="relative overflow-hidden rounded-3xl border bg-white/70 shadow-sm ring-1 ring-slate-200">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(420px 180px at 85% 15%, rgba(250,204,21,.12), transparent 60%)",
                    }}
                  />
                  <div className="relative z-10 p-6 sm:p-8">
                    <img
                      src={posterUrl!}
                      alt={`${selectedGame.title} 포스터`}
                      className="mx-auto h-[380px] md:h-[440px] object-contain rounded-3xl"
                      loading="lazy"
                    />
                  </div>
                </div>
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  위 버튼을 눌러 게임을 시작하세요.
                </p>
              </div>
            ) : (
              <selectedGame.Component onExit={stopGame} />
            )}
          </div>
        </Card>
      </div>

      {/* 공용: 게임 설명 다이얼로그 */}
      <Dialog open={howOpen} onOpenChange={(o) => !o && setHowTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>게임 설명 — {howTarget?.title}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground whitespace-pre-line break-words leading-relaxed">
            {howTarget?.howTo}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
