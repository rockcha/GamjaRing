import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext"; // partner_id 포함된 user 객체 제공

export default function LevelAdjuster() {
  const { user } = useUser();
  const coupleId = user?.couple_id;

  const [level, setLevel] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // ✅ 초기 레벨 가져오기
  useEffect(() => {
    const fetchLevel = async () => {
      if (!coupleId) return;
      const { data, error } = await supabase
        .from("couple_points")
        .select("level")
        .eq("couple_id", coupleId)
        .single();

      if (error) {
        console.error("❌ 레벨 조회 실패:", error.message);
      } else {
        setLevel(data.level);
      }
    };

    fetchLevel();
  }, [coupleId]);

  // ✅ 레벨 업데이트 함수
  const updateLevel = async (change: number) => {
    if (!coupleId) return;
    setLoading(true);
    const newLevel = level + change;

    const { error } = await supabase
      .from("couple_points")
      .update({ level: newLevel })
      .eq("couple_id", coupleId);

    if (error) {
      console.error("❌ 레벨 업데이트 실패:", error.message);
    } else {
      setLevel(newLevel);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-white border rounded-xl shadow-md w-52">
      <button
        onClick={() => updateLevel(1)}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        disabled={loading}
      >
        +1
      </button>

      <div className="text-3xl font-bold text-gray-800">
        {loading ? "..." : level}
      </div>

      <button
        onClick={() => updateLevel(-1)}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        disabled={loading || level <= 0}
      >
        -1
      </button>
    </div>
  );
}
