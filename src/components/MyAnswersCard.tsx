import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import supabase from "@/lib/supabase";
import { GetQuestionById } from "@/utils/GetQuestionById";
import { useNavigate } from "react-router-dom";

interface AnswerItem {
  question_id: number;
  content: string;
}

interface AnswerItemWithQuestion extends AnswerItem {
  questionText: string | null;
}

const ITEMS_PER_PAGE = 8;

export default function MyAnswersCard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<AnswerItemWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchAnswers = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("answer")
        .select("question_id, content")
        .eq("user_id", user.id)
        .order("question_id", { ascending: true });

      if (error) {
        console.error("❌ 답변 조회 실패:", error.message);
        return;
      }

      const withQuestions: AnswerItemWithQuestion[] = await Promise.all(
        data.map(async (item: AnswerItem) => {
          const questionText = await GetQuestionById(item.question_id);
          return {
            ...item,
            questionText,
          };
        })
      );

      setAnswers(withQuestions);
      setLoading(false);
    };

    fetchAnswers();
  }, [user]);

  const totalPages = Math.max(1, Math.ceil(answers.length / ITEMS_PER_PAGE));
  const paginatedAnswers = answers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) return <div className="text-center py-4">로딩 중...</div>;

  return (
    <div className="flex flex-col justify-between h-[500px]">
      {/* 답변 목록 */}
      <div className="space-y-4 overflow-y-auto max-h-[420px] pr-2">
        {answers.length === 0 ? (
          <p className="text-gray-500 text-center">
            아직 작성한 답변이 없습니다.
          </p>
        ) : (
          paginatedAnswers.map((item, index) => (
            <div
              key={item.question_id}
              onClick={() =>
                navigate("/answerdetailpage", {
                  state: {
                    questionId: item.question_id,
                    questionText: item.questionText,
                    answer: item.content,
                    isMine: false,
                  },
                })
              }
              className="cursor-pointer border rounded-md p-3 hover:bg-amber-100 transition"
            >
              <p className="text-sm text-gray-400 mb-1">
                {index + 1}. 질문 #{item.question_id}
              </p>
              <p className="text-gray-800 font-medium truncate">
                {item.questionText}
              </p>
            </div>
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      <div className="flex justify-center mt-4 gap-2">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i + 1)}
            className={`px-3 py-1 rounded-full border text-sm transition-all ${
              currentPage === i + 1
                ? "bg-pink-100 text-pink-500 font-bold border-pink-300"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
