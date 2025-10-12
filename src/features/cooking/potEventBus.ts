// 간단 이벤트 버스: IngredientGrid에서 클릭 시 PotArea에 "중앙 이펙트" 알림
import type { IngredientTitle } from "@/features/cooking/type";

type PotEvent = {
  type: "centerFx";
  title: IngredientTitle;
  emoji: string;
  at: number;
};

type Listener = (e: PotEvent) => void;

const listeners = new Set<Listener>();

export function onPotEvent(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitPotCenterFx(params: {
  title: IngredientTitle;
  emoji: string;
}) {
  const ev: PotEvent = {
    type: "centerFx",
    title: params.title,
    emoji: params.emoji,
    at: Date.now(),
  };
  listeners.forEach((fn) => fn(ev));
}
