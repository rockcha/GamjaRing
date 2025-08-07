import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext"; // partner_id 포함된 user 객체 제공

export default function PointAdjuster() {
  const { user } = useUser();
  const coupleId = user?.couple_id;

  const [point, setPoint] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // ✅ 초기 포인트 가져오기
  useEffect(() => {
    const fetchPoint = async () => {
      if (!coupleId) return;

      const { data, error } = await supabase
        .from("couple_points")
        .select("point")
        .eq("couple_id", coupleId)
        .single();

      if (error) {
        console.error("❌ 포인트 조회 실패:", error.message);
      } else {
        setPoint(data.point);
      }
    };

    fetchPoint();
  }, [coupleId]);

  // ✅ 포인트 업데이트 함수
  const updatePoint = async (change: number) => {
    if (!coupleId) return;
    setLoading(true);
    const newPoint = point + change;

    const { error } = await supabase
      .from("couple_points")
      .update({ point: newPoint })
      .eq("couple_id", coupleId);

    if (error) {
      console.error("❌ 포인트 업데이트 실패:", error.message);
    } else {
      setPoint(newPoint);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-white border rounded-xl shadow-md w-52">
      <button
        onClick={() => updatePoint(1)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        disabled={loading}
      >
        +1
      </button>

      <div className="text-3xl font-bold text-gray-800">
        {loading ? "..." : point}
      </div>

      <button
        onClick={() => updatePoint(-1)}
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
        disabled={loading || point <= 0}
      >
        -1
      </button>
    </div>
  );
}
