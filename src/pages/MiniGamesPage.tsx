// src/features/mini_games/MiniGamePage.tsx
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCoins,
  faCirclePlay,
  faDoorOpen,
  faCircleQuestion,
  faTag,
} from "@fortawesome/free-solid-svg-icons";

/* 게임 컴포넌트 & 메타 */
import {
  recipeMemoryMeta,
  type MiniGameDef,
} from "@/features/mini_games/RecipeMemoryGame";
import { potatoTossMeta } from "@/features/mini_games/potato_toss/PotatoTossGame";
import { shadowPiecesMeta } from "@/features/mini_games/shadow_pieces";

/** 등록된 게임 목록 */
const GAMES: MiniGameDef[] = [
  recipeMemoryMeta,
  potatoTossMeta,
  shadowPiecesMeta,
];

const CATS = [
  { key: "all", label: "전체" },
  { key: "puzzle", label: "퍼즐" },
  { key: "action", label: "액션" },
  { key: "memory", label: "메모리" },
];

export default function MiniGamePage() {
  const { couple, spendGold, fetchCoupleData } = useCoupleContext();

  const [selectedId, setSelectedId] = useState<string>(GAMES[0]?.id ?? "");
  const [isRunning, setIsRunning] = useState(false);

  // 설명 다이얼로그
  const [howTarget, setHowTarget] = useState<MiniGameDef | null>(null);
  const howOpen = useMemo(() => !!howTarget, [howTarget]);

  // 카테고리
  const [cat, setCat] = useState<string>("all");
  const filtered = useMemo(() => {
    if (cat === "all") return GAMES;
    return GAMES.filter((g) => (g.tags ?? []).includes(cat));
  }, [cat]);

  const selectedGame = GAMES.find((g) => g.id === selectedId) ?? null;

  const startGame = useCallback(async () => {
    if (!selectedGame) return;
    const fee = selectedGame.entryFee ?? 30;
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
  }, [selectedGame, couple?.gold, spendGold, fetchCoupleData]);

  const stopGame = useCallback(() => setIsRunning(false), []);

  // ⌨️ 키보드 내비
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedGame) return;
      if (!isRunning && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        startGame();
      } else if (isRunning && e.key === "Escape") {
        e.preventDefault();
        stopGame();
      } else if (
        !isRunning &&
        (e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        const list = filtered;
        const idx = Math.max(
          0,
          list.findIndex((g) => g.id === selectedId)
        );
        const next =
          e.key === "ArrowRight"
            ? (idx + 1) % list.length
            : (idx - 1 + list.length) % list.length;
        setSelectedId(list[next].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRunning, selectedId, filtered, selectedGame, startGame, stopGame]);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 md:px-8 py-6 md:py-10 bg-gradient-to-b from-[#f8faff] to-[#fdf7ff]">
      {/* 상단 필터칩: 플레이 중에는 살짝 축소/투명 */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 transition-opacity",
          isRunning
            ? "opacity-70 pointer-events-none select-none"
            : "opacity-100"
        )}
      >
        {CATS.map((c) => {
          const active = cat === c.key;
          return (
            <Badge
              key={c.key}
              onClick={() => !isRunning && setCat(c.key)}
              className={cn(
                "cursor-pointer select-none rounded-full px-3 py-1 transition",
                active
                  ? "bg-primary/15 text-primary ring-1 ring-primary/20"
                  : "bg-white/70 text-muted-foreground hover:bg-white"
              )}
              variant="outline"
            >
              <FontAwesomeIcon icon={faTag} className="mr-1.5 h-3.5 w-3.5" />
              {c.label}
            </Badge>
          );
        })}
      </div>

      {/* 본문 그리드: isRunning에 따라 좌폭 축소 */}
      <div
        className={cn(
          "mt-6 md:mt-8 grid gap-6 md:gap-8",
          isRunning
            ? "md:grid-cols-[120px,1fr]"
            : "md:grid-cols-[minmax(280px,560px),1fr]"
        )}
      >
        {/* 좌측: Poster Wall / Compact Rail */}
        <aside
          className={cn(
            "self-start transition-all",
            isRunning
              ? "sticky top-[88px] max-h-[70vh] overflow-y-auto no-scrollbar"
              : ""
          )}
        >
          {/* 대기: 그리드, 진행: 작은 썸네일 레일 */}
          <div
            className={cn(
              isRunning
                ? "grid grid-cols-1 gap-2 pr-1"
                : "grid grid-cols-2 sm:grid-cols-3 gap-4"
            )}
          >
            {filtered.map((g) => {
              const active = selectedId === g.id;
              const thumbClass = isRunning
                ? "aspect-square rounded-2xl" // 작고 정사각
                : "aspect-[3/4] rounded-3xl"; // 포스터 비율
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedId(g.id);
                    if (isRunning) {
                      /* 게임 중 선택만 바꿈 */
                    }
                  }}
                  title={`${g.title} (참가비 ${g.entryFee}G)`}
                  className={cn(
                    "group relative overflow-hidden ring-1 ring-black/5 bg-white/70 backdrop-blur-sm shadow-sm transition will-change-transform",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    active && "ring-primary/30",
                    isRunning
                      ? "hover:scale-[1.02]"
                      : "hover:-translate-y-[2px] hover:shadow-md"
                  )}
                  aria-current={active}
                >
                  <div className={thumbClass}>
                    <img
                      src={`/minigame/${encodeURIComponent(g.id)}.png`}
                      alt={`${g.title} 포스터`}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                    {/* 진행 중엔 하단 바 대신 아주 작은 점표시 */}
                    <div
                      className={cn(
                        "absolute inset-0 transition-opacity",
                        isRunning
                          ? "opacity-0 group-hover:opacity-100"
                          : "opacity-100"
                      )}
                    >
                      {isRunning ? (
                        <span
                          className={cn(
                            "absolute right-1.5 top-1.5 inline-block h-2 w-2 rounded-full",
                            active ? "bg-primary" : "bg-black/30"
                          )}
                        />
                      ) : (
                        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
                          <span className="truncate text-white/95 font-semibold drop-shadow-sm">
                            {g.title}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2 py-1 text-[11px] text-white/90">
                            <FontAwesomeIcon
                              icon={faCoins}
                              className="h-3 w-3"
                            />
                            {g.entryFee}G
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* 우측: 콘텐츠 영역 */}
        <section className="min-w-0">
          {/* 대기: Quick Detail, 진행: 중앙 플레이 */}
          {selectedGame && !isRunning && (
            <Card className="rounded-3xl p-0 overflow-hidden ring-1 ring-black/5 bg-white/70 backdrop-blur-sm">
              <div className="relative grid md:grid-cols-[300px,1fr]">
                {/* 미니 포스터 */}
                <div className="relative">
                  <div className="aspect-[3/4]">
                    <img
                      src={`/minigame/${encodeURIComponent(
                        selectedGame.id
                      )}.png`}
                      alt={`${selectedGame.title} 미니 포스터`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="absolute left-3 top-3">
                    <Badge
                      className="bg-black/35 text-white backdrop-blur-[2px]"
                      variant="outline"
                    >
                      <FontAwesomeIcon
                        icon={faCoins}
                        className="mr-1.5 h-3.5 w-3.5"
                      />
                      {selectedGame.entryFee}G
                    </Badge>
                  </div>
                </div>

                {/* 상세 */}
                <div className="p-5 sm:p-6 md:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">
                      {selectedGame.title}
                    </h2>
                    <div className="flex items-center gap-2">
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
                      <Button
                        size="sm"
                        onClick={startGame}
                        className="gap-2"
                        aria-label="게임 시작"
                      >
                        <FontAwesomeIcon
                          icon={faCirclePlay}
                          className="h-4 w-4"
                        />
                        시작
                      </Button>
                    </div>
                  </div>

                  {/* 태그/메타 */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(selectedGame.tags ?? []).map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="rounded-full"
                      >
                        {t}
                      </Badge>
                    ))}
                    {selectedGame.estimatedMinutes && (
                      <Badge variant="outline" className="rounded-full">
                        ~{selectedGame.estimatedMinutes}분
                      </Badge>
                    )}
                    {selectedGame.difficulty && (
                      <Badge variant="outline" className="rounded-full">
                        난이도: {selectedGame.difficulty}
                      </Badge>
                    )}
                  </div>

                  <Separator className="my-4" />

                  <div className="grid sm:grid-cols-3 gap-3">
                    {["3연속 성공!", "노미스 클리어", "최고점 경신"].map(
                      (g, i) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-black/5 bg-white/70 p-3 text-sm"
                        >
                          🎯 {g}
                        </div>
                      )
                    )}
                  </div>

                  <p className="mt-4 text-xs text-muted-foreground">
                    단축키:{" "}
                    <kbd className="px-1.5 py-0.5 bg-muted rounded">Enter</kbd>/
                    <kbd className="px-1.5 py-0.5 bg-muted rounded">Space</kbd>{" "}
                    시작,{" "}
                    <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd>{" "}
                    포기,{" "}
                    <kbd className="px-1.5 py-0.5 bg-muted rounded">←/→</kbd>{" "}
                    게임 선택
                  </p>
                </div>
              </div>
            </Card>
          )}

          {selectedGame && isRunning && (
            <div className="min-h-[60vh] md:min-h-[620px] grid place-items-center">
              {/* 플레이 화면 중앙 배치 */}
              <div className="w-full h-full flex items-center justify-center">
                <selectedGame.Component onExit={stopGame} />
              </div>
            </div>
          )}

          {!selectedGame && (
            <div className="min-h-[60vh] grid place-items-center text-muted-foreground">
              게임을 선택해 주세요
            </div>
          )}
        </section>
      </div>

      {/* 모바일: 플레이 중 하단 미니 도크 */}
      {isRunning && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 md:hidden">
          <div className="flex gap-2 overflow-x-auto no-scrollbar bg-white/80 backdrop-blur-md rounded-2xl px-2 py-2 ring-1 ring-black/5 shadow-sm">
            {filtered.map((g) => {
              const active = selectedId === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedId(g.id)}
                  className={cn(
                    "relative h-14 w-14 overflow-hidden rounded-xl ring-1 ring-black/5 shrink-0",
                    active && "ring-primary/40"
                  )}
                >
                  <img
                    src={`/minigame/${encodeURIComponent(g.id)}.png`}
                    alt={g.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 설명 모달 */}
      <Dialog open={howOpen} onOpenChange={(o) => !o && setHowTarget(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              게임 설명 — {howTarget?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground whitespace-pre-line">
            {howTarget?.howTo}
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
