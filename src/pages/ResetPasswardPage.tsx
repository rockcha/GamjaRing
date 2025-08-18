// src/pages/ResetPasswordPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/lib/supabase";
import PotatoButton from "@/components/widgets/PotatoButton";
import Popup from "@/components/widgets/Popup";
import PotatoLoading from "@/components/PotatoLoading";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(true); // 초기 세션 체크
  const [saving, setSaving] = useState(false); // 업데이트 중
  const [msg, setMsg] = useState("");

  // 링크로 들어왔을 때 recovery 세션이 잡혔는지 확인
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      // 세션 없으면 링크가 만료/오류일 수 있음
      if (!data.session) {
        setMsg("유효하지 않은 링크이거나 만료되었습니다. 다시 시도해주세요.");
      }
      setBusy(false);
    })();
  }, []);

  const onUpdate = async () => {
    setMsg("");
    if (pwd1.length < 6) {
      setMsg("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }
    if (pwd1 !== pwd2) {
      setMsg("비밀번호가 일치하지 않습니다.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd1 });
      if (error) throw error;

      setMsg("비밀번호가 변경되었습니다. 다시 로그인해주세요!");
      await supabase.auth.signOut();
      navigate("/login");
    } catch (e) {
      const text =
        e instanceof Error ? e.message : "비밀번호 변경에 실패했습니다.";
      setMsg(text);
    } finally {
      setSaving(false);
    }
  };

  if (busy) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3] px-4">
        <PotatoLoading />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e9d8c8] to-[#d8bca3] px-4">
      <div className="w-full max-w-sm bg-white shadow-md rounded-xl p-6">
        <h1 className="text-xl font-bold text-[#6b4e2d]">비밀번호 재설정</h1>
        <p className="mt-1 text-sm text-[#8a6b50]">
          새 비밀번호를 입력한 뒤, 확인 버튼을 눌러주세요.
        </p>

        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🥔</span>
            <input
              type="password"
              placeholder="새 비밀번호(6자 이상)"
              value={pwd1}
              onChange={(e) => setPwd1(e.target.value)}
              className="flex-1 px-4 py-3 border border-[#e6ddd3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d7b89c]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl">🥔</span>
            <input
              type="password"
              placeholder="새 비밀번호 확인"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              className="flex-1 px-4 py-3 border border-[#e6ddd3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d7b89c]"
            />
          </div>

          {msg && <Popup message={msg} show onClose={() => setMsg("")} />}

          <div className="mt-2">
            <PotatoButton
              text="비밀번호 변경"
              emoji="🔐"
              onClick={onUpdate}
              disabled={saving}
              loading={saving}
            />
          </div>

          <button
            type="button"
            className="mt-2 text-sm text-[#8a6b50] underline hover:text-[#6b4e2d]"
            onClick={() => navigate("/login")}
          >
            로그인 화면으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
