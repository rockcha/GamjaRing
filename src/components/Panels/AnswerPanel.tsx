// src/components/AnswerPanel.tsx
import MyAnswersCard from "@/components/MyAnswersCard";
import MyPartnerAnswersCard from "@/components/MyPartnerAnswersCard";

export default function AnswerPanel() {
  return (
    <section
      className={["w-full bg-[#fffaf4] px-4 py-6 rounded-2xl"].join(" ")}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {/* 나의 답변 카드 */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <h2 className="text-lg font-semibold mb-2 text-center text-orange-600">
            내 답변
          </h2>
          <MyAnswersCard />
        </div>

        {/* 상대방 답변 카드 */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <h2 className="text-lg font-semibold mb-2 text-center text-pink-600">
            상대방 답변
          </h2>
          <MyPartnerAnswersCard />
        </div>
      </div>
    </section>
  );
}
