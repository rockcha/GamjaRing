// src/pages/AnswerPage.tsx
import MyAnswersCard from "@/components/MyAnswersCard";
import MyPartnerAnswersCard from "@/components/MyPartnerAnswersCard";
import { useUser } from "@/contexts/UserContext";

export default function AnswerPage() {
  const { user, loading } = useUser();

  // if (loading || !user) return <PotatoLoading />;

  return (
    <div className="min-h-screen bg-[#fffaf4] px-4 py-6">
      <h1 className="text-2xl font-bold text-center mb-6">📝 답변 꾸러미</h1>

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
    </div>
  );
}
