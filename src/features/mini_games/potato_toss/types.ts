export type Props = { onExit?: () => void };

export type Size = { w: number; h: number };

export type BaseField = {
  groundY: number;
  launch: { x: number; y: number };
  bucketSize: { w: number; h: number };
  bucketRange: { left: number; right: number };
};

export enum GameState {
  Idle = "Idle",
  Charging = "Charging",
  Flying = "Flying",
  Resolving = "Resolving",
  Between = "Between",
  Finished = "Finished",
}

export type GainCue = { id: number; t: number; dur: number };

export type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  rot: number;
};

export type Projectile = {
  active: boolean;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  r: number;
  launchedAt?: number;
  safetyTimer?: number;
};

export type BucketPos = { x: number; y: number };
export type BucketTween = {
  from: number;
  to: number;
  t: number;
  dur: number;
} | null;

export type SuccessWave = {
  t: number;
  dur: number;
  x: number;
  y: number;
} | null;

export type ChargeUi = { x: number; y: number; visible: boolean };
