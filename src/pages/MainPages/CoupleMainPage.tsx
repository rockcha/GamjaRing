import DaysTogetherBadge from "@/components/DaysTogetherBadge";
import PotatoLoading from "@/components/PotatoLoading";
import { useUser } from "@/contexts/UserContext";
import CoupleLevelCard from "@/components/CoupleLevelCard";

import TodayQuestionCard from "@/components/TodayQuestionCard";

export default function CoupleMainPage() {
  const { user, loading } = useUser();

  if (loading || !user) {
    return <PotatoLoading />;
  }

  return (
    <div className="min-h-screen py-1  flex flex-col gap-4">
      {/* 👉 여기 flex-row로 가로 배치 */}
      <div className="flex flex-row  gap-6 ml-7">
        <CoupleLevelCard />

        <TodayQuestionCard />
      </div>
    </div>
  );
}
