// components/QuestionCard.tsx

import { useCallback } from "react";
import PotatoButton from "@/components/widgets/PotatoButton";

interface QuestionCardProps {
  question: string;
  isAnswered: boolean;
}

export default function QuestionCard({
  question,
  isAnswered,
}: QuestionCardProps) {
  // TODO: 답변 제출 핸들러 로직 구현 예정
  const onHandleClick = useCallback(() => {
    console.log("답변 제출 버튼 클릭됨");
  }, []);

  return (
    <div className="bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3] rounded-2xl p-6 w-full max-w-md mx-auto border border-[#e5cfc3] shadow-md space-y-6">
      {/* 제목 */}
      <h2 className="text-2xl md:text-3xl font-bold text-[#b75e20] text-center"></h2>

      {/* 질문 내용 */}
      <p className="text-base md:text-xl  text-[#5b3d1d] text-center px-2">
        "{question}"
      </p>

      {/* 답변 입력창 */}
      <textarea
        className="w-full min-h-[100px] p-4 border border-[#d3b7a6] rounded-lg text-sm md:text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#e4bfa4] bg-white placeholder:text-gray-400"
        placeholder="이곳에 답변을 입력해주세요..."
        disabled={isAnswered}
      />

      {/* PotatoButton 적용 */}
      <PotatoButton
        text={isAnswered ? "답변 완료!" : "답변하기"}
        emoji={isAnswered ? "✔️" : "✏️"}
        onClick={onHandleClick}
        disabled={isAnswered}
        bounce={!isAnswered}
      />
    </div>
  );
}
