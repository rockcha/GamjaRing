import { useCoupleContext } from "@/contexts/CoupleContext";
import { useState, useEffect } from "react";

import supabase from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

export default function CouplePage() {
  const { couple, partnerId, disconnectCouple, fetchCoupleData } =
    useCoupleContext();
  const [partnerNickname, setPartnerNickname] = useState("");
  const [editDate, setEditDate] = useState(couple?.started_at ?? "");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const fetchPartnerNickname = async () => {
      if (!partnerId) return;
      const { data } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", partnerId)
        .maybeSingle();
      if (data?.nickname) setPartnerNickname(data.nickname);
    };
    fetchPartnerNickname();
  }, [partnerId]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditDate(e.target.value);
  };

  const saveStartDate = async () => {
    if (!couple) return;
    setSaving(true);
    await supabase
      .from("couples")
      .update({ started_at: editDate })
      .eq("id", couple.id);
    setSaving(false);
    fetchCoupleData(); // 갱신
  };

  const handleDisconnect = async () => {
    const confirm = window.confirm("정말 커플을 끊으시겠습니까?");
    if (!confirm) return;
    await disconnectCouple();
    alert("커플이 해제되었습니다.");
  };

  navigate("/main");

  return (
    <div className="p-6 max-w-md mx-auto space-y-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold text-center">💑 커플 페이지</h2>

      <div className="space-y-2">
        <p>
          <strong>상대방:</strong> {partnerNickname}
        </p>

        <label className="block text-sm text-gray-700">처음 만난 날</label>
        <input
          type="date"
          value={editDate}
          onChange={handleDateChange}
          className="w-full border p-2 rounded"
        />
        <button
          onClick={saveStartDate}
          disabled={saving}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {saving ? "저장 중..." : "처음 만난 날 저장"}
        </button>
      </div>

      <div className="pt-4 border-t mt-4 text-center">
        <button
          onClick={handleDisconnect}
          className="text-red-600 hover:underline"
        >
          💔 커플 끊기
        </button>
      </div>
    </div>
  );
}
