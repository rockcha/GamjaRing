// =============================
// File: src/features/mini_games/potato_toss/events.ts
// 라운드 이벤트(보상/방해물) 계획·스폰·업데이트·드로우·충돌
// =============================

export type EventKind = "star" | "chest" | "rock" | "ghost";
export type EventRole = "good" | "obstacle";

export type TossEvent = {
  id: number;
  kind: EventKind;
  role: EventRole; // star/chest: "good", rock/ghost: "obstacle"
  x: number;
  y: number;
  r: number; // 충돌 반경(이모지 시각 크기와도 비례)
  vx: number;
  vy: number;
  alive: boolean;
  hit: boolean;
  lifeMs: number; // 생존 시간
};

// -------- 문구/보상 --------
export const EVENT_TEXT: Record<EventKind, { title: string; desc: string }> = {
  star: { title: "별똥별", desc: "맞추면 +30G!" },
  chest: { title: "상자", desc: "맞추면 +15G!" },
  rock: { title: "돌덩이", desc: "맞으면 궤도가 바뀝니다!" },
  ghost: { title: "유령", desc: "맞으면 궤도가 바뀝니다!" },
};

// 보상 값(텍스트와 일치)
export const GOOD_REWARD: Readonly<Record<"star" | "chest", number>> = {
  star: 30,
  chest: 15,
};

// -------- 라운드 이벤트 확률 --------
// 스테이지(라운드)마다 정확히 "하나의 이벤트 상태"만 갖는다.
// - 없음: 0.4
// - 보상: 0.3 (보상 종류: 별똥별 0.4 / 상자 0.6)
// - 방해물: 0.3 (종류: 돌덩이 / 유령 50:50)
export type RoundEventType = "none" | "good" | "obstacle";

export type RoundEventPlan = {
  type: RoundEventType;
  goodKind?: Extract<EventKind, "star" | "chest">;
  obstacleKind?: Extract<EventKind, "rock" | "ghost">;
};

export function planRoundEvent(): RoundEventPlan {
  const r = Math.random();
  if (r < 0.4) return { type: "none" };

  if (r < 0.7) {
    // good 0.3
    const goodKind: "star" | "chest" = Math.random() < 0.4 ? "star" : "chest";
    return { type: "good", goodKind };
  }

  // obstacle 0.3
  const obstacleKind: "rock" | "ghost" = Math.random() < 0.5 ? "rock" : "ghost";
  return { type: "obstacle", obstacleKind };
}

// -------- 사전 스폰(보상 1개) --------
export function spawnPreRoundGood(
  size: { w: number; h: number },
  kind: Extract<EventKind, "star" | "chest">
): TossEvent {
  if (kind === "star") {
    // 상단 밖에서 천천히 낙하
    return {
      id: Date.now(),
      kind: "star",
      role: "good",
      x: size.w * (0.35 + Math.random() * 0.5),
      y: -20,
      r: 20,
      vx: 0,
      vy: 60 + Math.random() * 40,
      alive: true,
      hit: false,
      lifeMs: 12000,
    };
  }
  // chest: 중간 높이에서 느린 좌우 + 잔잔한 상하 요동
  const dir = Math.random() < 0.5 ? 1 : -1;
  return {
    id: Date.now(),
    kind: "chest",
    role: "good",
    x: size.w * (0.45 + Math.random() * 0.25),
    y: size.h * (0.35 + Math.random() * 0.25),
    r: 22,
    vx: dir * (25 + Math.random() * 20),
    vy: (Math.random() < 0.5 ? 1 : -1) * (14 + Math.random() * 10), // 상하 진폭 인자
    alive: true,
    hit: false,
    lifeMs: 12000,
  };
}

// -------- 발사 직후 스폰(방해물 1~2개, 랜덤 위치/고속) --------
export function spawnPostLaunchObstacles(
  size: { w: number; h: number },
  kind: Extract<EventKind, "rock" | "ghost">
): TossEvent[] {
  const count = Math.random() < 0.5 ? 1 : 2; // 1~2개
  const arr: TossEvent[] = [];
  for (let i = 0; i < count; i++) {
    if (kind === "rock") {
      arr.push({
        id: Date.now() + i,
        kind: "rock",
        role: "obstacle",
        x: size.w * (0.15 + Math.random() * 0.7), // 랜덤 X
        y: -28,
        r: 20,
        vx: 0,
        vy: 220 + Math.random() * 120, // 고속 낙하
        alive: true,
        hit: false,
        lifeMs: 8000,
      });
    } else {
      // 유령: 좌/우에서 랜덤 Y로 빠르게 횡단
      const fromLeft = Math.random() < 0.5;
      arr.push({
        id: Date.now() + i,
        kind: "ghost",
        role: "obstacle",
        x: fromLeft ? -40 : size.w + 40,
        y: size.h * (0.2 + Math.random() * 0.6),
        r: 22,
        vx: (fromLeft ? 1 : -1) * (220 + Math.random() * 140), // 고속 횡단
        vy: 0,
        alive: true,
        hit: false,
        lifeMs: 7000,
      });
    }
  }
  return arr;
}

// -------- 업데이트 --------
export function updateEvent(
  ev: TossEvent,
  dt: number,
  size: { w: number; h: number }
) {
  if (!ev.alive) return;

  ev.lifeMs -= dt * 1000;
  if (ev.lifeMs <= 0) {
    ev.alive = false;
    return;
  }

  if (ev.kind === "star" || ev.kind === "rock") {
    ev.y += ev.vy * dt;
    if (ev.y > size.h + 40) ev.alive = false;
  } else if (ev.kind === "chest") {
    ev.x += ev.vx * dt;
    ev.y += Math.sin(performance.now() / 600) * (ev.vy * dt);
    if (ev.x < 30) ev.vx = Math.abs(ev.vx);
    if (ev.x > size.w - 30) ev.vx = -Math.abs(ev.vx);
  } else if (ev.kind === "ghost") {
    ev.x += ev.vx * dt;
    if (ev.x < -60 || ev.x > size.w + 60) ev.alive = false;
  }
}

// -------- 드로우 --------
function emojiFont(px: number) {
  return `${px}px Apple Color Emoji, Noto Color Emoji, Segoe UI Emoji, EmojiOne, sans-serif`;
}
function emojiPxFromRadius(r: number) {
  return Math.round(r * 2.2);
}

export function drawEvent(ctx: CanvasRenderingContext2D, ev: TossEvent) {
  if (!ev.alive) return;

  ctx.save();
  ctx.translate(ev.x, ev.y);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const px = emojiPxFromRadius(ev.r);
  ctx.font = emojiFont(px);
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 6;

  let ch = "⭐️";
  if (ev.kind === "chest") ch = "🎁";
  else if (ev.kind === "rock") ch = "🪨";
  else if (ev.kind === "ghost") ch = "👻";

  if (ev.kind === "ghost") {
    const dir = Math.sign(ev.vx) || 1;
    ctx.scale(dir, 1);
    ctx.rotate(((dir * Math.PI) / 180) * 6);
  }

  ctx.fillText(ch, 0, 0);

  if (ev.hit) {
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle =
      ev.role === "good" ? "rgba(16,185,129,0.9)" : "rgba(239,68,68,0.9)";
    ctx.arc(0, 0, ev.r + 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// -------- 충돌 --------
export function checkCollision(
  proj: { x: number; y: number; r: number; active: boolean },
  ev: TossEvent
): boolean {
  if (!proj.active || !ev.alive) return false;
  const dx = proj.x - ev.x;
  const dy = proj.y - ev.y;
  return Math.hypot(dx, dy) <= proj.r + ev.r;
}
