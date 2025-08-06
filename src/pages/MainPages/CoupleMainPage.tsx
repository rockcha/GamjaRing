import DaysTogetherBadge from "@/components/DaysTogetherBadge";
import PotatoLoading from "@/components/PotatoLoading";
import { useUser } from "@/contexts/UserContext";
import QuestionCard from "@/components/QuestionCard";
import DailyTaskToggle from "@/components/widgets/DailyTaskToggle";

export default function CoupleMainPage() {
  const { user, loading } = useUser();

  if (loading || !user) {
    return <PotatoLoading />;
  }

  return (
    <div className="min-h-screen bg-white px-4 py-6 flex flex-col gap-6">
      <DaysTogetherBadge />
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">오늘의 질문</h1>
        <DailyTaskToggle /> {/* ✅ 요기 삽입 */}
      </div>
    </div>
  );
}
