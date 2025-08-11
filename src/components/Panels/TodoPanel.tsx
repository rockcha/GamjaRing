// src/components/TodoPanel.tsx
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import {
  type Todo,
  getMyTodos,
  insertTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
} from "@/utils/todo";
import { useToast } from "@/contexts/ToastContext";

export default function TodoPanel() {
  const { user } = useUser();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const { open } = useToast();

  // 입력창
  const [input, setInput] = useState("");

  // 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

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

  // 추가
  const handleAdd = async () => {
    console.log("hadnleAdd진입");
    if (!user?.id || !user?.nickname) {
      console.warn("유저 id 혹은 닉네임 존재 X");
      return;
    }

    const content = input.trim();
    if (!content) return;

    const { data, error } = await insertTodo({
      userId: user.id,
      nickname: user.nickname,
      content,
    });
    if (!error && data) {
      setTodos((prev) => [data, ...prev]);
      setInput("");
      open("할 일 등록 완료! ", 3000);
    }
  };

  // 완료 토글
  const handleToggle = async (id: string) => {
    const { data, error } = await toggleTodo(id);
    if (!error && data) {
      setTodos((prev) => prev.map((t) => (t.id === id ? data : t)));
    }
  };

  // 편집 열기
  const startEdit = (t: Todo) => {
    setEditingId(t.id);
    setEditingText(t.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  // 편집 저장
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
      <h2 className="text-2xl sm:text-3xl font-bold text-[#3d2b1f] mb-2">
        {todayLabel}
      </h2>

      {/* 자동 삭제 배너 (나중 구현 placeholder) */}
      <div className="mb-4 rounded-lg border  bg-[#fdf6ee] px-4 py-3 text-sm text-[#5b3d1d]">
        오늘이 지나면 할 일은 자동 삭제될 예정입니다.{" "}
        <span className="opacity-70">(나중 구현)</span>
      </div>

      {/* 입력 영역 */}
      <div className="flex items-center gap-2 mb-12">
        <input
          className="flex-1 rounded-lg border-4 border-[#e6d7c6] bg-white px-3 py-2 text-base outline-none focus:border-amber-600"
          placeholder="할일을 적어주세요"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          onClick={handleAdd}
          className="rounded-lg border-4 border-[#e6d7c6]  bg-white px-4 py-2 text-sm font-semibold text-[#3d2b1f] transition hover:bg-[#fdf6ee] active:scale-[0.98]"
        >
          등록
        </button>
      </div>

      {/* 일괄 삭제 버튼 */}

      <div className="flex mt-2 mb-4 gap-4">
        <div className="text-bold text-2xl">할 일 목록</div>
        <button
          onClick={deleteCompleted}
          className="rounded-lg border-4 border-[#e6d7c6]  bg-white px-3 py-1.5 text-xm text-gray-700 transition hover:bg-[#fdf6ee]  "
        >
          일괄 삭제
        </button>
      </div>

      {/* 목록 */}
      <div className="rounded-xl border-4 border-[#e6d7c6] bg-white divide-y">
        {loading ? (
          <div className="p-4 text-base text-gray-500">불러오는 중...</div>
        ) : todos.length === 0 ? (
          <div className="p-4 text-base text-gray-500">
            등록된 할 일이 없어요.
          </div>
        ) : (
          todos.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3">
              {/* 완료 체크 */}
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
                    💾
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-[#fdf6ee]"
                  >
                    ↩️
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(t)}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-[#fdf6ee]"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={async () => {
                      await deleteTodo(t.id);
                      setTodos((prev) => prev.filter((x) => x.id !== t.id));
                    }}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-[#fdf6ee]"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
