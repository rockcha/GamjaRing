"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bomb, Hourglass, Volume2, VolumeX } from "lucide-react";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
type Kind = "mole" | "bomb";

type Entity = {
  id: number;
  hole: number; // 0..8 (3x3)
  kind: Kind;
  bornAt: number; // ms timestamp
  ttl: number; // ms to live (pop-up time)
  state: "up" | "hit";
  locked?: boolean; // prevent double hit
};

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────
const GRID = 9; // 3x3
const GAME_SECONDS = 30;

// 난이도 곡선 (0~1)
function curve(t01: number) {
  // 가속도 있는 이지인-아웃으로 난이도 상승
  return t01 < 0.5 ? 2 * t01 * t01 : -1 + (4 - 2 * t01) * t01;
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────
export default function PotatoMoleGame() {
  const [running, setRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(GAME_SECONDS * 1000);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem("pmg_best") ?? 0);
  });
  const [entities, setEntities] = useState<Entity[]>([]);
  const [muted, setMuted] = useState(false);

  const startAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const idRef = useRef(1);
  const spawnTimerRef = useRef<number | null>(null);
  const clearTimers = useRef<(() => void)[]>([]);

  // Reset/start
  const startGame = useCallback(() => {
    // cleanup any pending timeouts
    clearTimers.current.forEach((fn) => fn());
    clearTimers.current = [];

    setScore(0);
    setEntities([]);
    startAtRef.current = performance.now();
    setRemainingMs(GAME_SECONDS * 1000);
    setRunning(true);
  }, []);

  const stopGame = useCallback(() => {
    setRunning(false);
    // cancel raf & interval
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (spawnTimerRef.current) window.clearInterval(spawnTimerRef.current);
    spawnTimerRef.current = null;
    // update best
    setBest((b) => {
      const next = Math.max(b, score);
      if (typeof window !== "undefined") {
        localStorage.setItem("pmg_best", String(next));
      }
      return next;
    });
  }, [score]);

  // Clock (smooth)
  useEffect(() => {
    if (!running) return;
    const tick = (t: number) => {
      if (!startAtRef.current) startAtRef.current = t;
      const elapsed = t - startAtRef.current;
      const remain = Math.max(0, GAME_SECONDS * 1000 - elapsed);
      setRemainingMs(remain);
      if (remain <= 0) {
        stopGame();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, stopGame]);

  // Spawn loop
  useEffect(() => {
    if (!running) return;

    const spawn = () => {
      setEntities((prev) => {
        const timePassed = GAME_SECONDS * 1000 - remainingMs;
        const t01 = Math.min(1, timePassed / (GAME_SECONDS * 1000));
        const d = curve(t01);

        // 난이도에 따라 스폰 수/폭탄 확률/TTL 조절
        const spawnCount = Math.random() < 0.75 ? 1 : 2; // 가끔 2개
        const bombProb = 0.15 + d * 0.35; // 0.15 → 0.5
        const ttl = 900 - Math.floor(d * 450); // 900ms → 450ms

        const occupied = new Set(prev.map((e) => e.hole));
        const freeHoles = Array.from({ length: GRID }, (_, i) => i).filter(
          (i) => !occupied.has(i)
        );
        if (freeHoles.length === 0) return prev;

        const picks = [] as number[];
        for (let i = 0; i < spawnCount && freeHoles.length > 0; i++) {
          const idx = Math.floor(Math.random() * freeHoles.length);
          picks.push(freeHoles.splice(idx, 1)[0]);
        }

        const now = performance.now();
        const newOnes: Entity[] = picks.map((hole) => ({
          id: idRef.current++,
          hole,
          kind: Math.random() < bombProb ? "bomb" : "mole",
          bornAt: now,
          ttl,
          state: "up",
        }));

        // TTL 지나면 내려가도록 예약 제거
        newOnes.forEach((e) => {
          const to = window.setTimeout(() => {
            setEntities((cur) => cur.filter((x) => x.id !== e.id));
          }, e.ttl);
          clearTimers.current.push(() => window.clearTimeout(to));
        });

        return [...prev, ...newOnes];
      });
    };

    // interval 가변 (난이도)
    const intervalMs = 550; // base
    spawn();
    spawnTimerRef.current = window.setInterval(spawn, intervalMs);
    return () => {
      if (spawnTimerRef.current) window.clearInterval(spawnTimerRef.current);
      spawnTimerRef.current = null;
    };
  }, [running, remainingMs]);

  // Hit
  const onHit = useCallback(
    (hole: number) => {
      setEntities((prev) => {
        const target = prev.find((e) => e.hole === hole && e.state === "up");
        if (!target || target.locked) return prev;
        target.locked = true;

        // 점수
        setScore((s) => s + (target.kind === "mole" ? 1 : -2));
        if (navigator.vibrate)
          navigator.vibrate(target.kind === "mole" ? 12 : 28);
        if (!muted) {
          // 가벼운 SFX (옵션): 프로젝트에 /public/sfx/whack.mp3 / bomb.mp3 넣으면 좋음
          const a = new Audio(
            target.kind === "mole" ? "/sfx/whack.mp3" : "/sfx/bomb.mp3"
          );
          a.volume = 0.6;
          a.play().catch(() => {});
        }

        // 맞은 연출 후 제거
        const next = prev.map((e) =>
          e.id === target.id ? { ...e, state: "hit" } : e
        );
        const to = window.setTimeout(() => {
          setEntities((cur) => cur.filter((x) => x.id !== target.id));
        }, 220);
        clearTimers.current.push(() => window.clearTimeout(to));

        return next;
      });
    },
    [muted]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (spawnTimerRef.current) window.clearInterval(spawnTimerRef.current);
      clearTimers.current.forEach((fn) => fn());
    };
  }, []);

  const timePct = Math.max(0, remainingMs / (GAME_SECONDS * 1000));

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hourglass className="w-4 h-4" />
          <span className="text-sm text-muted-foreground">{GAME_SECONDS}s</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">점수</span>
          <span className="rounded-full border px-2 py-0.5 text-sm tabular-nums">
            {score}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            최고 {best}
          </span>
          <div className="flex items-center gap-1">
            {muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <Switch checked={!muted} onCheckedChange={(v) => setMuted(!v)} />
          </div>
        </div>
      </div>

      {/* Timer ring */}
      <div className="relative mx-auto mb-3 h-2 rounded-full bg-zinc-200 overflow-hidden">
        <div
          className="h-full bg-amber-500"
          style={{ width: `${timePct * 100}%` }}
        />
      </div>

      {/* Grid */}
      <div className="relative aspect-square rounded-2xl bg-[#F6F1E6] border grid grid-cols-3 gap-3 p-3">
        {Array.from({ length: GRID }, (_, i) => (
          <Hole
            key={i}
            index={i}
            entity={entities.find((e) => e.hole === i)}
            onHit={onHit}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {!running ? (
          <Button onClick={startGame} className="px-6">
            시작
          </Button>
        ) : (
          <Button variant="secondary" onClick={stopGame}>
            정지
          </Button>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Hole cell
// ────────────────────────────────────────────────────────────
function Hole({
  index,
  entity,
  onHit,
}: {
  index: number;
  entity?: Entity;
  onHit: (hole: number) => void;
}) {
  return (
    <button
      className="relative rounded-2xl bg-gradient-to-b from-zinc-200 to-zinc-300/60 shadow-inner overflow-hidden"
      onPointerDown={() => entity && onHit(index)}
      aria-label={
        entity
          ? entity.kind === "mole"
            ? "두더지 잡기"
            : "폭탄 주의"
          : `빈 칸 ${index + 1}`
      }
    >
      {/* 토양 텍스처 */}
      <div className="absolute inset-x-2 bottom-2 h-4 rounded-full bg-zinc-400/30 blur-[1px]" />

      {/* 캐릭터 */}
      <div className="absolute inset-0 grid place-items-center">
        <AnimatePresence>
          {entity && (
            <motion.div
              key={entity.id}
              initial={{ y: 18, scale: 0.8, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 18, scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative"
            >
              {entity.kind === "mole" ? <MoleSprite /> : <BombSprite />}

              {entity.state === "hit" && (
                <motion.div
                  className="absolute -top-2 -right-1 text-amber-700 text-sm font-semibold"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {entity.kind === "mole" ? "+1" : "-2"}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// Sprites (placeholder: emoji/SVG → 나중에 PNG로 교체 가능)
// ────────────────────────────────────────────────────────────
function MoleSprite() {
  return (
    <div className="relative">
      {/* 몸통 */}
      <div className="w-12 h-9 rounded-full bg-amber-300 border border-amber-400 shadow-sm" />
      {/* 눈, 볼터치, 싹(감자 컨셉) */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative w-10 h-6">
          <div className="absolute left-2 top-1 w-1.5 h-1.5 bg-zinc-800 rounded-full" />
          <div className="absolute right-2 top-1 w-1.5 h-1.5 bg-zinc-800 rounded-full" />
          <div className="absolute left-1 top-3 w-3 h-1 rounded-full bg-rose-300/70" />
          <div className="absolute right-1 top-3 w-3 h-1 rounded-full bg-rose-300/70" />
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-3 bg-green-500 rounded-sm rotate-6" />
        </div>
      </div>
    </div>
  );
}

function BombSprite() {
  return (
    <div className="relative">
      <div className="w-10 h-10 rounded-full bg-zinc-700 border border-zinc-800 shadow" />
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-2 rounded-t bg-zinc-800" />
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-zinc-200">
        <Bomb className="w-4 h-4" />
      </div>
    </div>
  );
}
