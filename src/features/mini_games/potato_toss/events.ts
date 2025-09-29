// =============================
// 라운드 이벤트(보상/방해물) 계획·스폰·업데이트·드로우·충돌
// =============================

export type EventKind =
  | "star" // ⭐️  (good, pre)
  | "chest" // 🎁  (good, pre)
  | "balloon" // 🎈  (good, pre)
  | "rock" // 🪨  (obstacle, post)
  | "ghost" // 👻  (obstacle, pre)
  | "bee" // 🐝  (obstacle, pre)
  | "helicopter" // 🚁  (obstacle, pre)
  | "umbrella"; // ☂️  (obstacle, pre)

export type EventRole = "good" | "obstacle";

export type TossEvent = {
  id: number;
  kind: EventKind;
  role: EventRole;
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alive: boolean;
  hit: boolean;
  lifeMs: number;
};

export const EVENT_TEXT: Record<
  EventKind,
  { title: string; desc: string; banner: string }
> = {
  star: {
    title: "별똥별",
    desc: "맞추면 +30G!",
    banner: "반짝이는 별똥별! 맞추면 +30G!",
  },
  chest: {
    title: "상자",
    desc: "맞추면 +15G!",
    banner: "보물 상자 등장! 맞추면 +15G!",
  },
  balloon: {
    title: "풍선",
    desc: "맞추면 +7G!",
    banner: "풍선을 터뜨려 +7G를 획득하세요!",
  },
  rock: {
    title: "돌덩이",
    desc: "맞으면 궤도가 바뀝니다!",
    banner: "낙석 주의! 궤도가 틀어질 수 있어요!",
  },
  ghost: {
    title: "유령",
    desc: "맞으면 궤도가 바뀝니다!",
    banner: "유령의 장난을 조심하세요!",
  },
  bee: {
    title: "벌",
    desc: "맞으면 궤도가 흔들립니다!",
    banner: "벌이 윙윙! 경로가 흔들릴 수 있어요!",
  },
  helicopter: {
    title: "헬리콥터",
    desc: "맞으면 경로가 크게 틀어집니다!",
    banner: "헬리콥터가 상공을 선회 중! 주의하세요!",
  },
  umbrella: {
    title: "우산",
    desc: "맞으면 궤도가 휘청입니다!",
    banner: "떠다니는 우산을 조심하세요!",
  },
};

// 보상 값
export const GOOD_REWARD: Readonly<
  Record<"star" | "chest" | "balloon", number>
> = { star: 30, chest: 15, balloon: 7 };

// -------- 라운드 이벤트 확률 --------
export type RoundEventType = "none" | "good" | "obstacle";
export type RoundEventPlan = {
  type: RoundEventType;
  goodKind?: Extract<EventKind, "star" | "chest" | "balloon">;
  obstacleKind?: Extract<
    EventKind,
    "rock" | "ghost" | "bee" | "helicopter" | "umbrella"
  >;
};

export function planRoundEvent(): RoundEventPlan {
  const r = Math.random();
  if (r < 0.35) return { type: "none" };

  if (r < 0.75) {
    // good 0.4
    const gr = Math.random();
    const goodKind = gr < 0.35 ? "star" : gr < 0.8 ? "chest" : "balloon";
    return { type: "good", goodKind };
  }

  // obstacle 0.25 (pre-floating 0.20, rock(post) 0.05 예시 분배)
  const or = Math.random();
  if (or < 0.05) return { type: "obstacle", obstacleKind: "rock" };
  // pre-floating 풀에서 균등 픽(원하면 가중치로 변경 가능)
  const prePool: Array<
    Extract<EventKind, "ghost" | "bee" | "helicopter" | "umbrella">
  > = ["ghost", "bee", "helicopter", "umbrella"];
  const pick = prePool[Math.floor(Math.random() * prePool.length)];
  return { type: "obstacle", obstacleKind: pick };
}

// -------- 사전 스폰(Pre-Round: good & pre-obstacle) --------
export function spawnPreRoundGoodOrObstacle(
  size: { w: number; h: number },
  kind: Extract<
    EventKind,
    "star" | "chest" | "balloon" | "ghost" | "bee" | "helicopter" | "umbrella"
  >
): TossEvent {
  const id = Date.now() + Math.floor(Math.random() * 1000);

  if (kind === "star") {
    // 상단 밖에서 천천히 낙하
    return {
      id,
      kind,
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
  if (kind === "chest") {
    // 느린 좌우 + 잔잔한 상하 요동
    const dir = Math.random() < 0.5 ? 1 : -1;
    return {
      id,
      kind,
      role: "good",
      x: size.w * (0.45 + Math.random() * 0.25),
      y: size.h * (0.35 + Math.random() * 0.25),
      r: 22,
      vx: dir * (25 + Math.random() * 20),
      vy: (Math.random() < 0.5 ? 1 : -1) * (14 + Math.random() * 10),
      alive: true,
      hit: false,
      lifeMs: 12000,
    };
  }
  if (kind === "balloon") {
    // 천천히 위/아래로 둥실둥실(약한 상승 바이어스)
    const dir = Math.random() < 0.5 ? 1 : -1;
    return {
      id,
      kind,
      role: "good",
      x: size.w * (0.3 + Math.random() * 0.5),
      y: size.h * (0.55 + Math.random() * 0.2),
      r: 20,
      vx: dir * (12 + Math.random() * 18),
      vy: -12 + (Math.random() < 0.5 ? 1 : -1) * (8 + Math.random() * 6),
      alive: true,
      hit: false,
      lifeMs: 12000,
    };
  }

  if (kind === "ghost") {
    // 👻 좌우로 살짝 흔들리며 둥실
    const fromLeft = Math.random() < 0.5;
    return {
      id,
      kind: "ghost",
      role: "obstacle",
      x: fromLeft ? size.w * 0.25 : size.w * 0.75,
      y: size.h * (0.35 + Math.random() * 0.25),
      r: 22,
      vx: (fromLeft ? 1 : -1) * (18 + Math.random() * 12),
      vy: (Math.random() < 0.5 ? 1 : -1) * (10 + Math.random() * 8),
      alive: true,
      hit: false,
      lifeMs: 11000,
    };
  }
  if (kind === "bee") {
    // 🐝 상하 파동 + 좌우 느린 이동
    const dir = Math.random() < 0.5 ? 1 : -1;
    return {
      id,
      kind: "bee",
      role: "obstacle",
      x: size.w * (0.35 + Math.random() * 0.4),
      y: size.h * (0.3 + Math.random() * 0.35),
      r: 18,
      vx: dir * (22 + Math.random() * 16),
      vy: (Math.random() < 0.5 ? 1 : -1) * (18 + Math.random() * 12),
      alive: true,
      hit: false,
      lifeMs: 11000,
    };
  }
  if (kind === "helicopter") {
    // 🚁 가로 선회 + 상하 잔진동
    const fromLeft = Math.random() < 0.5;
    return {
      id,
      kind: "helicopter",
      role: "obstacle",
      x: fromLeft ? -40 : size.w + 40,
      y: size.h * (0.28 + Math.random() * 0.28),
      r: 24,
      vx: (fromLeft ? 1 : -1) * (70 + Math.random() * 30),
      vy: 0,
      alive: true,
      hit: false,
      lifeMs: 12000,
    };
  }
  // kind === "umbrella"
  const dir = Math.random() < 0.5 ? 1 : -1;
  return {
    id,
    kind: "umbrella",
    role: "obstacle",
    x: size.w * (0.3 + Math.random() * 0.5),
    y: size.h * (0.55 + Math.random() * 0.25),
    r: 20,
    vx: dir * (16 + Math.random() * 12),
    vy: -10, // 서서히 상승
    alive: true,
    hit: false,
    lifeMs: 12000,
  };
}

// -------- 발사 직후(Post-Launch: obstacle = rock) --------
export function spawnPostLaunchObstacles(
  size: { w: number; h: number },
  kind: Extract<EventKind, "rock">
): TossEvent[] {
  const count = Math.random() < 0.5 ? 1 : 2;
  const arr: TossEvent[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      id: Date.now() + i,
      kind: "rock",
      role: "obstacle",
      x: size.w * (0.15 + Math.random() * 0.7),
      y: -28,
      r: 20,
      vx: 0,
      vy: 220 + Math.random() * 120,
      alive: true,
      hit: false,
      lifeMs: 8000,
    });
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
    return;
  }

  if (
    ev.kind === "chest" ||
    ev.kind === "balloon" ||
    ev.kind === "ghost" ||
    ev.kind === "bee"
  ) {
    // 부드러운 좌우 + 상하 요동
    ev.x += ev.vx * dt;
    ev.y += Math.sin(performance.now() / 600) * (ev.vy * dt);
    if (ev.x < 30) ev.vx = Math.abs(ev.vx);
    if (ev.x > size.w - 30) ev.vx = -Math.abs(ev.vx);
    return;
  }

  if (ev.kind === "helicopter") {
    // 수평 이동 + 상하 잔진동
    ev.x += ev.vx * dt;
    ev.y += Math.sin(performance.now() / 500) * 18 * dt;
    if (ev.x < -60 || ev.x > size.w + 60) ev.alive = false;
    return;
  }

  if (ev.kind === "umbrella") {
    // 서서히 상승 + 좌우 흔들림
    ev.x += ev.vx * dt;
    ev.y += ev.vy * dt + Math.sin(performance.now() / 650) * 10 * dt;
    if (ev.y < -40) ev.alive = false;
    if (ev.x < 20 || ev.x > size.w - 20) ev.vx *= -1;
    return;
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
  else if (ev.kind === "balloon") ch = "🎈";
  else if (ev.kind === "rock") ch = "🪨";
  else if (ev.kind === "ghost") ch = "👻";
  else if (ev.kind === "bee") ch = "🐝";
  else if (ev.kind === "helicopter") ch = "🚁";
  else if (ev.kind === "umbrella") ch = "☂️";

  if (ev.kind === "ghost") {
    const sway = Math.sin(performance.now() / 500) * (Math.PI / 64);
    ctx.rotate(sway);
  }
  if (ev.kind === "helicopter") {
    const wobble = Math.sin(performance.now() / 300) * (Math.PI / 180) * 4;
    ctx.rotate(wobble);
  }
  if (ev.kind === "umbrella") {
    const tilt = Math.sin(performance.now() / 700) * (Math.PI / 180) * 6;
    ctx.rotate(tilt);
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
