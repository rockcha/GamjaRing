import DaysTogetherBadge from "@/components/DaysTogetherBadge";
import PotatoLoading from "@/components/PotatoLoading";
import { useUser } from "@/contexts/UserContext";
import QuestionCard from "@/components/QuestionCard";
import ToggleButton from "@/components/widgets/ToggleButton";

export default function CoupleMainPage() {
  const { user, loading } = useUser();

  if (loading || !user) {
    return <PotatoLoading />;
  }

  return (
    <div className="min-h-screen bg-white px-4 py-6 flex flex-col gap-6">
      <DaysTogetherBadge />

      {/* ✅ 3등분된 영역 */}
      <div className="grid grid-cols-3 gap-4 w-full">
        <div className="relative">
          <ToggleButton text="질문 1" emoji="❓">
            <QuestionCard
              question="오늘 가장 행복했던 순간은 언제였나요?"
              isAnswered={false}
            />
          </ToggleButton>
        </div>

        <div className="relative">
          <ToggleButton text="질문 2" emoji="🧠">
            <QuestionCard
              question="오늘 나를 가장 많이 웃게 만든 것은?"
              isAnswered={false}
            />
          </ToggleButton>
        </div>

        <div className="relative">
          <ToggleButton text="질문 3" emoji="💭">
            <QuestionCard
              question="지금 생각나는 고마운 일이 있다면?"
              isAnswered={false}
            />
          </ToggleButton>
        </div>
      </div>
    </div>
  );
}
