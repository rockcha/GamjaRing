// src/components/MyPartnerAnswersCard.tsx
import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { GetQuestionById } from "@/utils/GetQuestionById";
import SimplePopup from "@/components/widgets/SimplePopup";

interface AnswerItem {
  question_id: number;
  content: string;
  created_at: string;
}

interface AnswerWithQuestion extends AnswerItem {
  questionText: string;
}

const ITEMS_PER_PAGE = 4;

export default function MyPartnerAnswersCard() {
  const { user, isCoupled } = useUser();
  const [answers, setAnswers] = useState<AnswerWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // ✅ 팝업 상태
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupContent, setPopupContent] = useState("");

  useEffect(() => {
    const fetchPartnerAnswers = async () => {
      if (!user?.partner_id || !isCoupled) return;

      const { data, error } = await supabase
        .from("answer")
        .select("question_id, content, created_at")
        .eq("user_id", user.partner_id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("❌ 파트너 답변 불러오기 실패:", error.message);
        return;
      }

      const enriched = await Promise.all(
        data.map(async (item) => {
          const questionText = await GetQuestionById(item.question_id);
          return { ...item, questionText: questionText ?? "" };
        })
      );

      setAnswers(enriched);

      const lastPage = Math.max(1, Math.ceil(enriched.length / ITEMS_PER_PAGE));
      setCurrentPage(lastPage);

      setLoading(false);
    };

    fetchPartnerAnswers();
  }, [user?.partner_id, isCoupled]);

  const totalPages = Math.max(1, Math.ceil(answers.length / ITEMS_PER_PAGE));
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentAnswers = answers.slice(start, start + ITEMS_PER_PAGE);

  const getFormattedDate = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const today = new Date();

    const isToday =
      today.getFullYear() === createdDate.getFullYear() &&
      today.getMonth() === createdDate.getMonth() &&
      today.getDate() === createdDate.getDate();

    const formatted = createdDate.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });

    return {
      isToday,
      formattedDate: formatted,
    };
  };

  if (loading) return <p className="text-gray-500">불러오는 중...</p>;

  return (
    <div className="flex flex-col justify-between h-[500px]">
      <div className="space-y-4 overflow-y-auto max-h-[420px] pr-2">
        {currentAnswers.length === 0 ? (
          <p className="text-gray-500">아직 연인의 답변이 없습니다.</p>
        ) : (
          currentAnswers.map((item) => {
            const { isToday, formattedDate } = getFormattedDate(
              item.created_at
            );

            return (
              <div
                key={`${item.question_id}-${item.created_at}`}
                onClick={() => {
                  setPopupTitle(item.questionText);
                  setPopupContent(item.content);
                  setPopupOpen(true);
                }}
                className="cursor-pointer border rounded-md p-3 hover:bg-pink-100 transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm text-gray-400">{formattedDate}</p>
                  {isToday && (
                    <span className="text-xs text-pink-500 font-bold animate-pulse">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-gray-800 font-medium truncate">
                  {item.questionText}
                </p>
              </div>
            );
          })
        )}
      </div>

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

      {/* ✅ 팝업 컴포넌트 */}
      <SimplePopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        title={popupTitle}
        content={popupContent}
      />
    </div>
  );
}
