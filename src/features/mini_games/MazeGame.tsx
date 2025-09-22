"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DoorOpen, Timer, MoveUpRight, Skull, Trophy } from "lucide-react";

/** MiniGameDef 가정:
 * export type MiniGameDef = {
 *  id: string;
 *  title: string;
 *  icon: React.ReactNode;
 *  entryFee: number;
 *  howTo: string | React.ReactNode;
 *  Component: React.FC<{ onExit: () => void }>;
 * }
 */

const CELL_WALL = 1;
const CELL_PATH = 0;

type Point = { r: number; c: number };
type FPoint = { x: number; y: number }; // 픽셀 좌표

type Collectible = {
  r: number;
  c: number;
  kind: "potato" | "gold";
  taken?: boolean;
};

type Monster = {
  // px 단위 위치로 변경
  x: number;
  y: number;
  vx: number; // -1,0,1 (방향)
  vy: number;
  speedPx: number; // px/sec
};

function randomShuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function randInt(min: number, max: number) {
  return (Math.random() * (max - min + 1) + min) | 0;
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

const THEME = {
  wall: "#262637",
  floor: "#fbfbff",
  start: "#8bd3dd",
  exit: "#ffd166",
  player: "#7c3aed",
  gridAccent: "#ededf6",
  coin: "#f59e0b",
  potato: "#a16207",
  danger: "#ef4444",
};

const DEFAULT_TIME = 60;
const ENTRY_FEE = 25;

// 이동 보간(한 칸) 시간
const MOVE_DURATION = 210; // ms (느슨 + easing)

function drawEmoji(
  ctx: CanvasRenderingContext2D,
  emoji: string,
  x: number,
  y: number,
  fontSize: number
) {
  ctx.font = `${fontSize}px system-ui, Apple Color Emoji, Segoe UI Emoji`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, x, y);
}

function generateMaze(rows: number, cols: number) {
  if (rows % 2 === 0) rows += 1;
  if (cols % 2 === 0) cols += 1;

  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => CELL_WALL)
  );

  const stack: Point[] = [];
  const start: Point = { r: 1, c: 1 };
  grid[start.r][start.c] = CELL_PATH;
  stack.push(start);

  const dirs = [
    { dr: -2, dc: 0 },
    { dr: 2, dc: 0 },
    { dr: 0, dc: -2 },
    { dr: 0, dc: 2 },
  ];

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const shuffled = randomShuffle(dirs.slice());
    let carved = false;

    for (const { dr, dc } of shuffled) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1) {
        if (grid[nr][nc] === CELL_WALL) {
          grid[cur.r + dr / 2][cur.c + dc / 2] = CELL_PATH;
          grid[nr][nc] = CELL_PATH;
          stack.push({ r: nr, c: nc });
          carved = true;
          break;
        }
      }
    }
    if (!carved) stack.pop();
  }

  // 출구: 우하단 PATH
  let exit: Point = { r: rows - 2, c: cols - 2 };
  outer: for (let rr = rows - 2; rr >= rows - 8 && rr >= 1; rr--) {
    for (let cc = cols - 2; cc >= cols - 8 && cc >= 1; cc--) {
      if (grid[rr][cc] === CELL_PATH) {
        exit = { r: rr, c: cc };
        break outer;
      }
    }
  }

  return { grid, start, exit, rows, cols };
}

function placeCollectibles(
  grid: number[][],
  start: Point,
  exit: Point,
  countPotato: number,
  countGold: number
): Collectible[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const cells: Point[] = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (grid[r][c] === CELL_PATH) cells.push({ r, c });
    }
  }
  randomShuffle(cells);

  const tooClose = (a: Point, b: Point) =>
    Math.abs(a.r - b.r) + Math.abs(a.c - b.c) < 4;

  const res: Collectible[] = [];
  for (const kind of ["potato", "gold"] as const) {
    const need = kind === "potato" ? countPotato : countGold;
    let i = 0;
    for (const cell of cells) {
      if (i >= need) break;
      if (tooClose(cell, start) || tooClose(cell, exit)) continue;
      if (res.some((x) => x.r === cell.r && x.c === cell.c)) continue;
      res.push({ r: cell.r, c: cell.c, kind });
      i++;
    }
  }
  return res;
}

function placeMonstersPx(
  grid: number[][],
  count: number,
  cellSize: number
): Monster[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const list: Monster[] = [];
  let tries = 0;

  while (list.length < count && tries++ < 5000) {
    const r = randInt(2, rows - 3);
    const c = randInt(2, cols - 3);
    if (grid[r][c] !== CELL_PATH) continue;

    // 가능한 방향
    const dirs: Array<{ vx: number; vy: number }> = [];
    if (grid[r - 1]?.[c] === CELL_PATH) dirs.push({ vx: 0, vy: -1 });
    if (grid[r + 1]?.[c] === CELL_PATH) dirs.push({ vx: 0, vy: 1 });
    if (grid[r]?.[c - 1] === CELL_PATH) dirs.push({ vx: -1, vy: 0 });
    if (grid[r]?.[c + 1] === CELL_PATH) dirs.push({ vx: 1, vy: 0 });
    if (!dirs.length) continue;

    const { vx, vy } = dirs[(Math.random() * dirs.length) | 0];

    const cx = c * cellSize + cellSize / 2;
    const cy = r * cellSize + cellSize / 2;
    // 🔻 속도 대폭 하향 (cells/sec → px/sec)
    const cellsPerSec = 0.7 + Math.random() * 0.5; // 0.7 ~ 1.2
    const speedPx = cellsPerSec * cellSize;

    list.push({ x: cx, y: cy, vx, vy, speedPx });
  }
  return list;
}

function drawMaze(
  ctx: CanvasRenderingContext2D,
  grid: number[][],
  cellSize: number,
  playerPx: FPoint,
  start: Point,
  exit: Point,
  w: number,
  h: number,
  collectibles: Collectible[],
  monsters: Monster[]
) {
  ctx.clearRect(0, 0, w, h);

  // 바탕
  ctx.fillStyle = THEME.floor;
  ctx.fillRect(0, 0, w, h);

  const rows = grid.length;
  const cols = grid[0].length;

  // 격자
  ctx.strokeStyle = THEME.gridAccent;
  ctx.lineWidth = 1;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellSize + 0.5);
    ctx.lineTo(cols * cellSize, r * cellSize + 0.5);
    ctx.stroke();
  }
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellSize + 0.5, 0);
    ctx.lineTo(c * cellSize + 0.5, rows * cellSize);
    ctx.stroke();
  }

  // 벽
  ctx.fillStyle = THEME.wall;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CELL_WALL) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  }

  // 시작/출구
  ctx.fillStyle = THEME.start;
  ctx.fillRect(
    start.c * cellSize + 2,
    start.r * cellSize + 2,
    cellSize - 4,
    cellSize - 4
  );

  ctx.fillStyle = THEME.exit;
  ctx.fillRect(
    exit.c * cellSize + 2,
    exit.r * cellSize + 2,
    cellSize - 4,
    cellSize - 4
  );

  // 아이템
  for (const it of collectibles) {
    if (it.taken) continue;
    const cx = it.c * cellSize + cellSize / 2;
    const cy = it.r * cellSize + cellSize / 2;
    const fs = Math.min(cellSize * 0.9, 28);
    drawEmoji(ctx, it.kind === "potato" ? "🥔" : "🪙", cx, cy, fs);
  }

  // 몬스터
  for (const m of monsters) {
    const fs = Math.min(cellSize * 0.95, 32);
    drawEmoji(ctx, "🔥", m.x, m.y, fs);
  }

  // 플레이어
  ctx.beginPath();
  ctx.fillStyle = THEME.player;
  ctx.arc(
    playerPx.x,
    playerPx.y,
    Math.min(10, cellSize * 0.35),
    0,
    Math.PI * 2
  );
  ctx.fill();
}

/** 스와이프 → 방향 */
function useSwipe(onDir: (d: "up" | "down" | "left" | "right") => void) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      startRef.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!startRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (Math.max(ax, ay) < 24) return;
      if (ax > ay) onDir(dx > 0 ? "right" : "left");
      else onDir(dy > 0 ? "down" : "up");
      startRef.current = null;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onDir]);
}

const MazeComponent: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ▶ 미로 크기 확대 (화면 넓을수록 크게)
  const [canvasSize, setCanvasSize] = useState({ w: 840, h: 640 });
  const { rows, cols } = useMemo(() => {
    const w = canvasSize.w;
    const baseCols = w < 560 ? 31 : w < 800 ? 37 : 41;
    const baseRows = w < 560 ? 27 : w < 800 ? 31 : 35;
    return { rows: baseRows | 1, cols: baseCols | 1 };
  }, [canvasSize.w]);

  const [seed, setSeed] = useState(0);
  const { grid, start, exit } = useMemo(
    () => generateMaze(rows, cols),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, cols, seed]
  );

  // 렌더 크기
  const cellSize = useMemo(() => {
    const s1 = Math.floor(canvasSize.w / cols);
    const s2 = Math.floor(canvasSize.h / rows);
    return Math.max(12, Math.min(s1, s2));
  }, [canvasSize, rows, cols]);

  const drawnSize = useMemo(
    () => ({ w: cols * cellSize, h: rows * cellSize }),
    [cols, rows, cellSize]
  );

  // ===== 게임 러닝 상태(React state: HUD만) =====
  const [state, setState] = useState<"ready" | "playing" | "clear" | "fail">(
    "ready"
  );
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_TIME);
  const [potatoes, setPotatoes] = useState(0);
  const [gold, setGold] = useState(0);

  // ===== 내부 게임 오브젝트 (useRef로 보관) =====
  const playerCellRef = useRef<Point>({ ...start });
  const targetCellRef = useRef<Point>({ ...start });
  const playerPxRef = useRef<FPoint>({
    x: start.c * cellSize + cellSize / 2,
    y: start.r * cellSize + cellSize / 2,
  });

  const collectiblesRef = useRef<Collectible[]>(
    placeCollectibles(grid, start, exit, 8, 6)
  );
  const monstersRef = useRef<Monster[]>(placeMonstersPx(grid, 4, cellSize)); // 수량 살짝 감소

  // 이동 보간 타이밍
  const moveFromRef = useRef<FPoint>({ ...playerPxRef.current });
  const moveToRef = useRef<FPoint>({ ...playerPxRef.current });
  const moveStartRef = useRef<number>(0);

  // 리사이즈
  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = clamp(Math.floor(rect.width), 420, 1100);
      const h = Math.floor((w * 3) / 4);
      setCanvasSize({ w, h });
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // grid/seed 바뀌면 ref 재배치
  useEffect(() => {
    collectiblesRef.current = placeCollectibles(grid, start, exit, 8, 6);
    monstersRef.current = placeMonstersPx(grid, 4, cellSize);
    // 플레이어 위치도 재설정
    playerCellRef.current = { ...start };
    targetCellRef.current = { ...start };
    const px = {
      x: start.c * cellSize + cellSize / 2,
      y: start.r * cellSize + cellSize / 2,
    };
    playerPxRef.current = px;
    moveFromRef.current = px;
    moveToRef.current = px;
    moveStartRef.current = performance.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, cellSize, seed]);

  // 타이머 (HUD만 setState)
  useEffect(() => {
    if (state !== "playing") return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          setState("fail");
          toast.error("시간 초과! 다음에 다시 도전해봐요 🕒");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state]);

  // 입력은 “한 번에 한 칸” 큐
  const tryStep = useCallback(
    (dir: "up" | "down" | "left" | "right") => {
      if (state !== "playing") return;

      // 현재 보간 중이면 무시(클래식 타일감)
      const now = performance.now();
      const t = clamp((now - moveStartRef.current) / MOVE_DURATION, 0, 1);
      if (t < 1) return;

      const d = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[
        dir
      ]!;
      const cur = playerCellRef.current;
      const nr = cur.r + d[0];
      const nc = cur.c + d[1];
      if (
        nr >= 0 &&
        nr < grid.length &&
        nc >= 0 &&
        nc < grid[0].length &&
        grid[nr][nc] === CELL_PATH
      ) {
        // 셀 이동 허용 → 보간 시작
        const to = {
          x: nc * cellSize + cellSize / 2,
          y: nr * cellSize + cellSize / 2,
        };
        moveFromRef.current = { ...playerPxRef.current };
        moveToRef.current = to;
        moveStartRef.current = now;
        playerCellRef.current = { r: nr, c: nc };
        targetCellRef.current = { r: nr, c: nc };
      }
    },
    [state, grid, cellSize]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      let dir: "up" | "down" | "left" | "right" | null = null;
      if (k === "arrowup" || k === "w") dir = "up";
      else if (k === "arrowdown" || k === "s") dir = "down";
      else if (k === "arrowleft" || k === "a") dir = "left";
      else if (k === "arrowright" || k === "d") dir = "right";
      if (!dir) return;
      e.preventDefault();
      tryStep(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryStep]);

  useSwipe((d) => tryStep(d));

  // ===== rAF 루프 (오직 물리/그리기; React setState는 이벤트 때만) =====
  useEffect(() => {
    if (state !== "playing" && state !== "ready") return;

    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); // clamp 50ms
      last = now;

      // 플레이어 보간
      const t = clamp((now - moveStartRef.current) / MOVE_DURATION, 0, 1);
      const k = easeOutCubic(t);
      const from = moveFromRef.current;
      const to = moveToRef.current;
      playerPxRef.current = {
        x: from.x + (to.x - from.x) * k,
        y: from.y + (to.y - from.y) * k,
      };

      // 수집품 픽업 (셀 index는 floor로 안정화)
      const cc = Math.floor(playerPxRef.current.x / cellSize);
      const rr = Math.floor(playerPxRef.current.y / cellSize);
      for (const it of collectiblesRef.current) {
        if (!it.taken && it.r === rr && it.c === cc) {
          it.taken = true;
          if (it.kind === "potato") {
            setPotatoes((p) => p + 1);
            toast.success("🥔 감자 +1");
          } else {
            setGold((g) => g + 5);
            toast.success("🪙 골드 +5");
          }
        }
      }

      // 몬스터 이동 (px 단위)
      for (const m of monstersRef.current) {
        let nx = m.x + m.vx * m.speedPx * dt;
        let ny = m.y + m.vy * m.speedPx * dt;

        // 벽 반사 체크: 다음 위치의 셀을 본다
        const nextC = Math.floor(nx / cellSize);
        const nextR = Math.floor(ny / cellSize);
        if (
          nextR < 0 ||
          nextR >= grid.length ||
          nextC < 0 ||
          nextC >= grid[0].length ||
          grid[nextR][nextC] === CELL_WALL
        ) {
          // 진행 방향을 반전
          m.vx = -m.vx;
          m.vy = -m.vy;
          // 반전 후 다시 이동
          nx = m.x + m.vx * m.speedPx * dt;
          ny = m.y + m.vy * m.speedPx * dt;
        }
        m.x = nx;
        m.y = ny;
      }

      // 충돌 판정 (px 원 충돌)
      const pr = playerPxRef.current;
      const playerR = Math.min(cellSize * 0.33, 9);
      const monsterR = Math.min(cellSize * 0.33, 9);
      let dead = false;
      for (const m of monstersRef.current) {
        const dist = Math.hypot(m.x - pr.x, m.y - pr.y);
        if (dist < playerR + monsterR) {
          dead = true;
          break;
        }
      }
      if (dead && state === "playing") {
        setState("fail");
        toast.error("🔥 불 몬스터에게 불타죽었어요...");
      }

      // 출구 도착 (셀 기준)
      if (state === "playing") {
        const pc = Math.floor(pr.x / cellSize);
        const rr2 = Math.floor(pr.y / cellSize);
        if (rr2 === exit.r && pc === exit.c) {
          setState("clear");
          setGold((g) => g + 30);
          toast.success("🎉 탈출 성공! 보상: 골드 +30", {
            icon: <Trophy className="h-4 w-4 text-yellow-500" />,
          });
        }
      }

      // 렌더
      drawMaze(
        ctx,
        grid,
        cellSize,
        playerPxRef.current,
        start,
        exit,
        drawnSize.w,
        drawnSize.h,
        collectiblesRef.current,
        monstersRef.current
      );

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame((t) => {
      last = t;
      requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(rafId);
  }, [state, grid, cellSize, start, exit, drawnSize]);

  // 초기 페인트(대기화면)
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    drawMaze(
      ctx,
      grid,
      cellSize,
      {
        x: start.c * cellSize + cellSize / 2,
        y: start.r * cellSize + cellSize / 2,
      },
      start,
      exit,
      drawnSize.w,
      drawnSize.h,
      collectiblesRef.current,
      monstersRef.current
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, cellSize, start, exit, drawnSize]);

  // 컨트롤
  const startGame = () => {
    setPotatoes(0);
    setGold(0);
    setTimeLeft(DEFAULT_TIME);
    setState("playing");

    // 보간 리셋
    playerCellRef.current = { ...start };
    targetCellRef.current = { ...start };
    const px = {
      x: start.c * cellSize + cellSize / 2,
      y: start.r * cellSize + cellSize / 2,
    };
    playerPxRef.current = px;
    moveFromRef.current = px;
    moveToRef.current = px;
    moveStartRef.current = performance.now();
  };

  const retry = () => {
    setSeed((s) => s + 1); // 새로운 미로
    collectiblesRef.current = placeCollectibles(grid, start, exit, 8, 6);
    monstersRef.current = placeMonstersPx(grid, 4, cellSize);
    startGame();
  };

  const quit = () => {
    onExit();
    if (state === "clear" || potatoes > 0 || gold > 0) {
      toast.message("미로 결과", {
        description: `🥔 ${potatoes}개, 🪙 ${gold}골드`,
      });
    }
  };

  const progress = Math.max(0, Math.min(100, (timeLeft / DEFAULT_TIME) * 100));

  return (
    <div className="w-full">
      {/* 상단 HUD */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-2">
            <Timer className="h-4 w-4" />
            남은 시간:{" "}
            <b className={cn(timeLeft <= 10 && "text-red-600")}>{timeLeft}s</b>
          </Badge>
          <div
            className="h-2 w-44 rounded-full bg-muted overflow-hidden"
            aria-label="time gauge"
            title="남은 시간"
          >
            <div
              className={cn(
                "h-full transition-[width] duration-300",
                progress < 25
                  ? "bg-red-500"
                  : progress < 50
                  ? "bg-yellow-500"
                  : "bg-emerald-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>

          <Badge variant="outline" className="gap-1">
            🥔 {potatoes}
          </Badge>
          <Badge variant="outline" className="gap-1">
            🪙 {gold}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {state === "ready" && (
            <Button size="sm" onClick={startGame} className="gap-2">
              <MoveUpRight className="h-4 w-4" />
              시작
            </Button>
          )}
          {state === "playing" && (
            <>
              <Button size="sm" variant="outline" onClick={retry}>
                리셋(새 미로)
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={quit}
                className="gap-2"
              >
                <DoorOpen className="h-4 w-4" />
                포기
              </Button>
            </>
          )}
          {state === "clear" && (
            <>
              <Button size="sm" onClick={retry}>
                다시하기
              </Button>
              <Button size="sm" variant="secondary" onClick={quit}>
                나가기
              </Button>
            </>
          )}
          {state === "fail" && (
            <>
              <Button size="sm" onClick={retry} className="gap-2">
                <Skull className="h-4 w-4" />
                다시하기
              </Button>
              <Button size="sm" variant="secondary" onClick={quit}>
                나가기
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 플레이 영역 */}
      <div ref={containerRef} className="w-full grid place-items-center">
        <canvas
          ref={canvasRef}
          width={drawnSize.w}
          height={drawnSize.h}
          className="rounded-2xl ring-1 ring-slate-200 bg-white touch-none max-w-full"
          style={{ imageRendering: "pixelated" }}
          aria-label="미로 게임 보드"
        />
      </div>

      <div className="mt-3 text-xs text-muted-foreground text-center leading-relaxed">
        조작: <b>WASD/화살표</b> 또는 <b>스와이프</b> • 아이템:{" "}
        <b>🥔 +1, 🪙 +5</b> • 출구 보상: <b>🪙 +30</b> • 몬스터:{" "}
        <b>🔥 닿으면 즉시 사망</b>
      </div>
    </div>
  );
};

export const mazeMeta = {
  id: "maze_escape",
  title: "미로 탈출",
  icon: "🌀",
  entryFee: ENTRY_FEE,
  howTo: [
    "제한 시간 내 시작점(하늘색)에서 출구(노란색)까지 이동하세요.",
    "조작: WASD/화살표키 · 모바일 스와이프.",
    "아이템: 🥔=+1, 🪙=+5. 출구 도착 시 🪙+30.",
    "🔥 몬스터에 닿으면 즉사합니다.",
  ].join("\n"),
  Component: MazeComponent,
} satisfies import("@/features/mini_games/RecipeMemoryGame").MiniGameDef;
