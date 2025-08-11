// src/pages/MyPagePanel.tsx
import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext"; // user, fetchUser 제공 가정
import Popup from "../widgets/Popup";
import UnlinkButton from "../tests/UnlinkButton";
import { Unlink } from "lucide-react";
type CoupleRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  started_at: string | null;
  created_at: string;
};

export default function MyPagePanel() {
  const { user, fetchUser } = useUser();
  const [loading, setLoading] = useState(true);

  // 토스트
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({
    show: false,
    msg: "",
  });
  const openToast = (msg: string, ms = 2200) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), ms);
  };

  // 가입일: auth.users에서 가져옴 (users 테이블에 created_at이 있으면 거기서 써도 됨)
  const [signupDate, setSignupDate] = useState<string>("");

  // 닉네임 편집
  const [editingNick, setEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState(user?.nickname ?? "");
  const [savingNick, setSavingNick] = useState(false);

  // 커플 정보
  const [couple, setCouple] = useState<CoupleRow | null>(null);
  const [partnerNickname, setPartnerNickname] = useState<string>("");
  const isCoupled = !!user?.partner_id;

  // D-Day(만난날짜) 편집
  const [ddayInput, setDdayInput] = useState<string>(""); // yyyy-mm-dd
  const [savingDday, setSavingDday] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!user?.id) return;
      setLoading(true);

      // 1) 가입일 (auth)
      const { data } = await supabase.auth.getUser();
      const createdAt = data.user?.created_at ?? null;
      if (createdAt) setSignupDate(createdAt.slice(0, 10));

      // 2) 최신 닉네임 값 동기화
      setNickInput(user.nickname ?? "");

      // 3) 커플 정보
      if (isCoupled && user.couple_id) {
        const { data: cRow, error: cErr } = await supabase
          .from("couples")
          .select("id, user1_id, user2_id, started_at, created_at")
          .eq("id", user.couple_id)
          .maybeSingle();

        if (!cErr && cRow) {
          setCouple(cRow as CoupleRow);
          // 파트너 닉네임
          const partnerId =
            cRow.user1_id === user.id ? cRow.user2_id : cRow.user1_id;
          const { data: p, error: pErr } = await supabase
            .from("users")
            .select("nickname")
            .eq("id", partnerId)
            .maybeSingle();
          if (!pErr && p) setPartnerNickname(p.nickname ?? "");

          // started_at -> input 반영
          if (cRow.started_at) {
            setDdayInput(cRow.started_at.slice(0, 10));
          }
        }
      } else {
        setCouple(null);
        setPartnerNickname("");
        setDdayInput("");
      }

      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.couple_id, user?.partner_id]);

  // D-Day 계산
  const ddayText = useMemo(() => {
    if (!couple?.started_at) return "-";
    const start = new Date(couple.started_at);
    const today = new Date();
    const diff = Math.floor(
      (new Date(today.toDateString()).getTime() -
        new Date(start.toDateString()).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return `D+${Math.max(0, diff)}`;
  }, [couple?.started_at]);

  // 닉네임 저장
  const saveNickname = async () => {
    if (!user?.id) return;
    const newNick = nickInput.trim();
    if (!newNick) {
      openToast("닉네임을 입력해 주세요.");
      return;
    }
    setSavingNick(true);
    const { error } = await supabase
      .from("users")
      .update({ nickname: newNick })
      .eq("id", user.id);
    setSavingNick(false);
    if (error) {
      openToast(`닉네임 수정 실패: ${error.message}`);
      return;
    }
    openToast("닉네임이 수정되었습니다.");
    setEditingNick(false);
    await fetchUser?.();
  };

  // D-Day 저장 (couples.started_at)
  const saveDday = async () => {
    if (!user?.couple_id) return;
    if (!ddayInput) {
      openToast("날짜를 선택해 주세요.");
      return;
    }
    setSavingDday(true);
    const { error } = await supabase
      .from("couples")
      .update({ started_at: ddayInput })
      .eq("id", user.couple_id);
    setSavingDday(false);
    if (error) {
      openToast(`디데이 수정 실패: ${error.message}`);
      return;
    }
    openToast("디데이가 수정되었습니다.");
    setCouple((prev) => (prev ? { ...prev, started_at: ddayInput } : prev));
  };

  // 회원탈퇴(추후)
  const handleDeleteAccount = () => {
    openToast("회원탈퇴는 추후 구현 예정입니다.");
  };

  // 커플 끊기(추후)
  const handleBreakUp = () => {
    openToast("커플 끊기는 추후 구현 예정입니다.");
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-[#5b3d1d]">로딩 중…</div>
    );
  }

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-6  space-y-8 overflow-y-auto">
      {/* 1. 내 정보 */}
      <section className="rounded-2xl border-4 border-[#e6d7c6] bg-[#fffaf4] p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#b75e20]">내 정보</h2>

        <div className="mt-4 space-y-4">
          {/* 닉네임 */}
          <div className="flex items-center gap-3">
            <span className="w-24 text-sm text-[#6b533b]">닉네임</span>
            {editingNick ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  value={nickInput}
                  onChange={(e) => setNickInput(e.target.value)}
                  className="flex-1 rounded-md border border-[#d3b7a6] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e4bfa4]"
                  placeholder="닉네임 입력"
                />
                <button
                  onClick={saveNickname}
                  disabled={savingNick}
                  className="px-3 py-2 rounded-md bg-amber-600 text-white text-sm disabled:opacity-60"
                >
                  {savingNick ? "저장중…" : "저장"}
                </button>
                <button
                  onClick={() => {
                    setEditingNick(false);
                    setNickInput(user?.nickname ?? "");
                  }}
                  className="px-3 py-2 rounded-md border text-sm"
                >
                  취소
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between">
                <span className="text-sm">{user?.nickname ?? "-"}</span>
                <button
                  onClick={() => setEditingNick(true)}
                  className="px-3 py-2 rounded-md border-2 text-sm hover:bg-[#f6e9de]"
                >
                  ✏️
                </button>
              </div>
            )}
          </div>

          {/* 가입날짜 */}
          <div className="flex items-center gap-3">
            <span className="w-24 text-sm text-[#6b533b]">가입날짜</span>
            <span className="text-sm">{signupDate || "-"}</span>
          </div>

          {/* 회원탈퇴 */}
          <div className="pt-2">
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 rounded-md border border-red-300 text-red-700 text-sm hover:bg-red-50"
            >
              회원탈퇴
            </button>
          </div>
        </div>
      </section>

      {/* 2. 커플 정보 */}
      <section className="rounded-2xl border-4 border-[#e6d7c6] bg-[#fffaf4] p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#b75e20]">커플 정보</h2>

        {!isCoupled || !couple ? (
          <div className="mt-4 text-sm text-[#6b533b]">
            새로운 인연을 찾아보세요 💫
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* 커플 닉네임(상대) */}
            <div className="flex items-center gap-3">
              <span className="w-24 text-sm text-[#6b533b]">커플 닉네임</span>
              <span className="text-sm">{partnerNickname || "-"}</span>
            </div>

            {/* D-Day */}
            <div className="flex items-center gap-3">
              <span className="w-24 text-sm text-[#6b533b]">디데이</span>
              <span className="text-sm">{ddayText}</span>
            </div>

            {/* 만난날짜 수정 */}
            <div className="flex items-center gap-3">
              <span className="w-24 text-sm text-[#6b533b]">만난날짜</span>
              <input
                type="date"
                value={ddayInput}
                onChange={(e) => setDdayInput(e.target.value)}
                className="rounded-md border border-[#d3b7a6] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e4bfa4]"
              />
              <button
                onClick={saveDday}
                disabled={savingDday}
                className="px-3 py-2 rounded-md bg-amber-600 text-white text-sm disabled:opacity-60"
              >
                {savingDday ? "저장중…" : "저장"}
              </button>
            </div>

            {/* 커플 끊기 */}

            <div className="pt-2">
              <UnlinkButton />
            </div>
          </div>
        )}
      </section>

      <Popup
        show={toast.show}
        message={toast.msg}
        onClose={() => setToast({ show: false, msg: "" })}
      />
    </main>
  );
}
