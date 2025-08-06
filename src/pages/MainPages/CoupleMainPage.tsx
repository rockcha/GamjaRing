// pages/CoupleMainPage.tsx
import DaysTogetherBadge from "@/components/DaysTogetherBadge";
import PotatoLoading from "@/components/PotatoLoading";
import { useUser } from "@/contexts/UserContext";

export default function CoupleMainPage() {
  const { user, isCoupled, loading } = useUser();
  if (loading || !user) {
    return <PotatoLoading />;
  }
  return (
    <div className="min-h-screen bg-white px-4 py-6 flex flex-col gap-6">
      <div className="text-center text-[#5b3d1d] text-lg font-semibold">
        <DaysTogetherBadge />
      </div>

      <div className="grid grid-cols-3 gap-4 items-start">
        {/* 일정 디데이 */}
        <div className="bg-[#fff7e6] p-4 rounded-lg shadow-inner border border-[#f4c989] h-[280px]">
          <h2 className="text-[#6b4e2d] font-bold mb-3">다가오는 일정</h2>
          <ul className="flex flex-col gap-2 text-[#8a6b50] text-sm">
            <li>🎫 공연 - D-5</li>
            <li>💌 기념일 - D-10</li>
            <li>✈️ 여행 - D-30</li>
          </ul>
        </div>

        {/* 감자 이미지 + 말풍선 */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative bg-[#fff7e6] text-[#5b3d1d] px-6 py-3 rounded-xl shadow-md mb-4 max-w-[240px] animate-pulse">
            <p className="text-md font-semibold">답변 완료!</p>
            <div className="absolute left-1/2 -bottom-2 transform -translate-x-1/2 w-3 h-3 bg-[#fff7e6] rotate-45 shadow-md"></div>
          </div>
          <img
            src="/images/potato-couple.gif"
            alt="감자"
            className="w-32 h-32 object-contain"
          />
        </div>

        {/* 오늘의 메모 */}
        <div className="bg-[#fff7e6] p-4 rounded-lg shadow-inner border border-[#f4c989] h-[280px] flex flex-col">
          <h2 className="text-[#6b4e2d] font-bold mb-3">오늘의 메모</h2>
          <textarea
            className="flex-1 resize-none p-2 rounded-md border border-[#e6ddd3] focus:outline-none focus:ring-2 focus:ring-[#d7b89c] text-sm"
            placeholder="오늘은 어떤 하루였나요?"
          />
          <button className="mt-3 bg-[#f4c989] hover:bg-[#e5b97e] text-brown-800 py-1.5 px-4 rounded-full font-semibold transition duration-200 text-sm self-end">
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
