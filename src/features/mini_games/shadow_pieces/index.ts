import type { MiniGameDef } from "@/features/mini_games/RecipeMemoryGame";
import ShadowSilhouetteGame from "./ShadowSilhouetteGame";

export const shadowPiecesMeta: MiniGameDef = {
  id: "shadow-pieces",
  title: "그림자 맞추기",
  icon: "🔍",
  entryFee: 20,
  howTo: [
    "이미지를 완전한 실루엣(검은 그림자)으로만 보여줘요.",
    "총 5스테이지, 각 스테이지마다 제한시간과 보기 개수가 달라집니다.",
    "성공 보상: 3, 5, 7, 9, 11,13G (누적). 실패/시간초과는 -5G 차감합니다.",
    "제한시간: 1단계 10초, 2단계 9초, 3단계 8초, 4단계 7초, 5단계 6초, 6단계 5초입니다.",
    "시간 초과 시 현재 선택을 자동 제출합니다. 미선택이면 오답 처리!",
    "라운드마다 원본을 공개하고, 종료 시 누적 보상을 자동 지급해요.",
  ].join("\n"),
  Component: ShadowSilhouetteGame,
};
