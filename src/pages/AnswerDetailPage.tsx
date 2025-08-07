// src/pages/AnswerDetailPage.tsx
import { useLocation } from "react-router-dom";
import { useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

interface LocationState {
  questionId: number;
  questionText: string;
  answer: string;
  isMine: boolean;
}

export default function AnswerDetailPage() {
  const { user } = useUser();
  const location = useLocation();
  const {
    questionId,
    questionText,
    answer: initialAnswer,
    isMine,
  } = location.state as LocationState;

  const [editing, setEditing] = useState(false);
  const [newAnswer, setNewAnswer] = useState(initialAnswer);
  const [answer, setAnswer] = useState(initialAnswer);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!user || !newAnswer.trim()) return;
    setLoading(true);

    const { error } = await supabase
      .from("answer")
      .update({ content: newAnswer.trim() })
      .eq("user_id", user.id)
      .eq("question_id", questionId);

    if (error) {
      console.error("❌ 답변 수정 실패:", error.message);
    } else {
      setAnswer(newAnswer.trim());
      setEditing(false);
    }

    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">📘 답변 상세 보기</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <p className="text-sm text-gray-400 mb-2">질문 #{questionId}</p>
        <p className="text-lg text-gray-800 font-medium mb-4 whitespace-pre-line">
          {questionText}
        </p>

        {editing ? (
          <div className="space-y-4">
            <textarea
              className="w-full border rounded p-2 text-sm"
              rows={5}
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-1 rounded border text-gray-600 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-1 rounded bg-orange-500 text-white hover:bg-orange-600"
                disabled={loading}
              >
                저장
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <p className="text-gray-700 whitespace-pre-line">{answer}</p>
            {isMine && (
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-orange-600 underline hover:text-orange-800"
              >
                ✏️ 수정하기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
