// pages/CoupleMainPage.tsx
import DaysTogetherBadge from "@/components/DaysTogetherBadge";
import PotatoLoading from "@/components/PotatoLoading";
import { useUser } from "@/contexts/UserContext";
import QuestionCard from "@/components/QuestionCard";
export default function CoupleMainPage() {
  const { user, isCoupled, loading } = useUser();
  if (loading || !user) {
    return <PotatoLoading />;
  }
  return (
    <div className="min-h-screen bg-white px-4 py-6 flex flex-col gap-6">
      <DaysTogetherBadge />
      <QuestionCard
        question="오늘 가장 행복했던 순간은 언제였나요?"
        isAnswered={false}
      />
    </div>
  );
}
