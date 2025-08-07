import DaysTogetherBadge from "@/components/DaysTogetherBadge";
import PotatoLoading from "@/components/PotatoLoading";
import { useUser } from "@/contexts/UserContext";
import CoupleLevelCard from "@/components/CoupleLevelCard";
import DailyTaskToggle from "@/components/widgets/DailyTaskToggle";
import LevelAdjuster from "@/components/tests/LevelAdjuster";
import IncreasePointButton from "@/components/tests/IncreasePointButton";
import TodayQuestionCard from "@/components/TodayQuestionCard";
export default function CoupleMainPage() {
  const { user, loading } = useUser();

  if (loading || !user) {
    return <PotatoLoading />;
  }

  return (
    <div className="min-h-screen bg-white px-4 py-6 flex flex-col gap-6">
      <TodayQuestionCard />
      <DaysTogetherBadge />

      <div className="p-6">
        {/* 중앙 정렬 */}
        <div className="flex justify-center">
          <CoupleLevelCard />
        </div>

        <div className="flex">{/* 여기에 다른 요소 추가 가능 */}</div>
      </div>
    </div>
  );
}
