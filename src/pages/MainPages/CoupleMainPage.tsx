import DaysTogetherBadge from "@/components/DaysTogetherBadge";
import PotatoLoading from "@/components/PotatoLoading";
import { useUser } from "@/contexts/UserContext";
import CoupleLevelCard from "@/components/CoupleLevelCard";
import DailyTaskToggle from "@/components/widgets/DailyTaskToggle";
import LevelAdjuster from "@/components/tests/LevelAdjuster";
import IncreasePointButton from "@/components/tests/IncreasePointButton";
export default function CoupleMainPage() {
  const { user, loading } = useUser();

  if (loading || !user) {
    return <PotatoLoading />;
  }

  return (
    <div className="min-h-screen bg-white px-4 py-6 flex flex-col gap-6">
      <DaysTogetherBadge />
      <div className="p-6">
        <DailyTaskToggle /> {/* ✅ 요기 삽입 */}
        <CoupleLevelCard />
        <div className="flex">
          {" "}
          <LevelAdjuster />
          <IncreasePointButton />
        </div>
      </div>
    </div>
  );
}
