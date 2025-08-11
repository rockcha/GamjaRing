// src/components/TodoPanel.tsx
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import {
  type Todo,
  getMyTodos,
  insertTodo,
  updateTodo,
  toggleTodo, // 사용 안 하지만 기존 import 유지
  deleteTodo,
} from "@/utils/todo";
import { useToast } from "@/contexts/ToastContext";

export default function TodoPanel() {
  const { user } = useUser();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const { open } = useToast();

  // 입력값(모달에서 사용)
  const [input, setInput] = useState("");

  // 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // 등록 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const todayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  }, []);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await getMyTodos(user.id, { ascending: false });
    if (!error && data) setTodos(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // 추가(모달 확인)
  const handleAdd = async () => {
    if (!user?.id || !user?.nickname) {
      console.warn("유저 id 혹은 닉네임 존재 X");
      return;
    }
    const content = input.trim();
    if (!content) return;

    setAddSubmitting(true);
    const { data, error } = await insertTodo({
      userId: user.id,
      nickname: user.nickname,
      content,
    });
    setAddSubmitting(false);

    if (!error && data) {
      setTodos((prev) => [data, ...prev]);
      setInput("");
      setShowAddModal(false);
      open("할 일 등록 완료! ", 3000);
    }
  };

  // 완료 토글 (낙관적 업데이트)
  const handleToggle = async (id: string) => {
    const target = todos.find((t) => t.id === id);
    if (!target) return;

    const nextCompleted = !target.completed;

    // 1) UI 먼저 업데이트
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: nextCompleted } : t))
    );

    // 2) 서버 반영
    const { data, error } = await updateTodo({ id, completed: nextCompleted });

    // 3) 실패 시 롤백
    if (error) {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !nextCompleted } : t))
      );
      open("완료 상태 변경 실패. 다시 시도해주세요.", 3000);
      return;
    }

    // 4) 서버 응답 동기화(타임스탬프 등 변화 반영)
    if (data) {
      setTodos((prev) => prev.map((t) => (t.id === id ? data : t)));
    }
  };

  // 편집 열기/닫기/저장
  const startEdit = (t: Todo) => {
    setEditingId(t.id);
    setEditingText(t.content);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };
  const saveEdit = async () => {
    if (!editingId) return;
    const content = editingText.trim();
    if (!content) return;

    const { data, error } = await updateTodo({ id: editingId, content });
    if (!error && data) {
      setTodos((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      cancelEdit();
    }
  };

  // 완료 항목 일괄 삭제
  const deleteCompleted = async () => {
    const targets = todos.filter((t) => t.completed);
    if (targets.length === 0) return;

    await Promise.all(targets.map((t) => deleteTodo(t.id)));
    setTodos((prev) => prev.filter((t) => !t.completed));
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 border-4 border-[#e6d7c6] rounded-xl">
      {/* 오늘 날짜 타이틀 */}
      <h2 className="text-2xl sm:text-3xl font-bold text-[#3d2b1f] mb-6">
        📝 {todayLabel}
      </h2>

      {/* 자동 삭제 배너 */}
      <div className="mb-6 rounded-lg border bg-[#fdf6ee] px-4 py-3 text-sm text-[#5b3d1d]">
        오늘이 지나면 할 일은 자동 삭제될 예정입니다.
      </div>

      {/* 목록 헤더 & 등록 + 일괄 삭제 */}
      <div className="flex mt-2 mb-4 ">
        <div className="font-semibold text-2xl mr-10">📌 목록</div>
        <button
          onClick={() => setShowAddModal(true)}
          className="mr-2 rounded-lg border border-[#e6d7c6] bg-gray-50 px-4 py-2 text-sm font-semibold text-[#3d2b1f] transition hover:bg-[#fdf6ee] active:scale-[0.98]"
        >
          등록
        </button>
        <button
          onClick={deleteCompleted}
          className="rounded-lg border border-[#e6d7c6] bg-gray-50 px-3 py-1.5  text-sm font-semibold text-[#3d2b1f] transition hover:bg-[#fdf6ee]"
        >
          일괄 삭제
        </button>
      </div>

      {/* 목록 */}
      <div className="rounded-xl border-2 border-[#e6d7c6] bg-blue-50 divide-y">
        {loading ? (
          <div className="p-4 text-base text-gray-500">불러오는 중...</div>
        ) : todos.length === 0 ? (
          <div className="p-4 text-base text-gray-500">
            등록된 할 일이 없어요.
          </div>
        ) : (
          todos.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3">
              {/* 완료 체크 (낙관적) */}
              <input
                type="checkbox"
                checked={t.completed}
                onChange={() => handleToggle(t.id)}
                className="h-4 w-4 cursor-pointer"
              />

              {/* 내용 / 편집 */}
              <div className="flex-1 min-w-0">
                {editingId === t.id ? (
                  <input
                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-base outline-none focus:border-amber-300"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    autoFocus
                  />
                ) : (
                  <span
                    className={[
                      "text-xl break-words",
                      t.completed
                        ? "line-through text-gray-400"
                        : "text-[#3d2b1f]",
                    ].join(" ")}
                  >
                    {t.content}
                  </span>
                )}
              </div>

              {/* 액션 버튼들 */}
              {editingId === t.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={saveEdit}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-[#fdf6ee]"
                  >
                    💾 저장
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-[#fdf6ee]"
                  >
                    ↩️ 취소
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(t)}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-[#fdf6ee]"
                  >
                    ✏️ 수정
                  </button>
                  <button
                    onClick={async () => {
                      await deleteTodo(t.id);
                      setTodos((prev) => prev.filter((x) => x.id !== t.id));
                    }}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-[#fdf6ee]"
                  >
                    🗑️ 삭제
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 등록 모달(오버레이) */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#e6d7c6] bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[#3d2b1f] mb-3">
              할 일 추가
            </h3>
            <input
              className="w-full rounded-lg border-2 border-[#e6d7c6] bg-blue-50 px-3 py-2 text-base outline-none focus:border-blue-300"
              placeholder="할일을 적어주세요"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                ↩️ 취소
              </button>
              <button
                onClick={handleAdd}
                disabled={addSubmitting}
                className="rounded-md border border-[#e6d7c6] bg-gray-50 px-3 py-1.5 text-sm font-semibold text-[#3d2b1f] transition hover:bg-[#fdf6ee] disabled:opacity-50"
              >
                {addSubmitting ? "등록 중..." : "💾 등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
