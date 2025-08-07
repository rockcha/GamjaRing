import { useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { increaseCouplePoint } from "@/utils/notifications/tasks/IncreaseCouplePoint";

export default function IncreasePointButton() {
  const { user } = useUser();
  const coupleId = user?.couple_id;
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!coupleId) {
      console.warn("커플 ID가 없습니다.");
      return;
    }

    setLoading(true);
    await increaseCouplePoint(coupleId);
    setLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 rounded bg-yellow-400 text-white hover:bg-yellow-500 disabled:opacity-50"
    >
      {loading ? "업데이트 중..." : "포인트 +1"}
    </button>
  );
}
