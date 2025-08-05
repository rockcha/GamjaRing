// components/CoupleRequestAlert.tsx
import { useState, useEffect } from "react";
import { useCoupleContext } from "@/contexts/CoupleContext";
import supabase from "@/lib/supabase";

interface RequestWithNickname {
  id: string;
  sender_id: string;
  sender_nickname: string;
}

export default function CoupleRequestAlert() {
  const { fetchIncomingRequests, acceptRequest, rejectRequest, isCoupled } =
    useCoupleContext();

  const [requests, setRequests] = useState<RequestWithNickname[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const rawRequests = await fetchIncomingRequests();

    // 요청 보낸 유저의 닉네임을 함께 조회
    const detailed = await Promise.all(
      rawRequests.map(async (r) => {
        const { data } = await supabase
          .from("users")
          .select("nickname")
          .eq("id", r.sender_id)
          .maybeSingle();

        return {
          id: r.id,
          sender_id: r.sender_id,
          sender_nickname: data?.nickname || "알 수 없음",
        };
      })
    );

    setRequests(detailed);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAccept = async (req: RequestWithNickname) => {
    const { error } = await acceptRequest(req.id, req.sender_id);
    if (!error) {
      alert(`${req.sender_nickname} 님과 커플이 되었습니다!`);
      setOpen(false);
      fetchData();
    }
  };

  const handleReject = async (req: RequestWithNickname) => {
    const { error } = await rejectRequest(req.id);
    if (!error) {
      alert("요청을 거절했습니다.");
      fetchData();
    }
  };

  if (isCoupled) return null;

  return (
    <div className="p-4 border rounded-md max-w-md bg-white shadow mt-4 space-y-3">
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={requests.length === 0}
        className={`w-full px-4 py-2 rounded font-semibold ${
          requests.length > 0
            ? "bg-pink-500 text-white hover:bg-pink-600"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
      >
        {requests.length > 0 ? "💌 커플 요청 도착" : "커플 요청 없음"}
      </button>

      {open && requests.length > 0 && (
        <div className="space-y-4 border-t pt-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex justify-between items-center border p-2 rounded"
            >
              <div className="font-medium">{req.sender_nickname} 님의 요청</div>
              <div className="space-x-2">
                <button
                  onClick={() => handleAccept(req)}
                  className="text-green-600 hover:underline"
                >
                  수락
                </button>
                <button
                  onClick={() => handleReject(req)}
                  className="text-red-500 hover:underline"
                >
                  거절
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
