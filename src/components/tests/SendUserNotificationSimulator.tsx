// src/components/SendUserNotification.tsx
import { useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/contexts/ToastContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";

type NotificationType =
  //   | "커플요청"
  //   | "커플수락"
  //   | "커플거절"
  "답변등록" | "답변수정" | "답변삭제" | "감자 콕찌르기" | "감자진화";

type Props = {
  typeOptions?: NotificationType[];
  onSent?: (payload: { receiverId: string; notificationId?: string }) => void;
  buttonLabel?: string;
};

export default function SendUserNotificationSimulator({
  typeOptions = [
    // "커플요청",
    // "커플수락",
    // "커플거절",
    "답변등록",
    "답변수정",
    "답변삭제",
    "감자 콕찌르기",
    "감자진화",
  ],
  onSent,
  buttonLabel = "알림 보내기",
}: Props) {
  const { user } = useUser();
  const { open } = useToast();

  const [nickname, setNickname] = useState("");
  const [nType, setNType] = useState<NotificationType>(typeOptions[0]!);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!user?.id) return open?.("로그인이 필요해요.");

    const targetNickname = nickname.trim();
    if (!targetNickname) return open?.("닉네임을 입력해 주세요.");

    setLoading(true);
    try {
      // 1) 닉네임으로 대상 찾기
      const { data: target, error: findErr } = await supabase
        .from("users")
        .select("id")
        .eq("nickname", targetNickname)
        .maybeSingle();

      if (findErr) {
        open?.(`대상 조회 실패: ${findErr.message}`);
        return;
      }
      if (!target?.id) {
        open?.("해당 닉네임의 사용자를 찾지 못했어요.");
        return;
      }
      const receiverId = target.id as string;

      // 2) 유틸로 전송 (FK/체크 등 실패시 에러 반환)
      const { error } = await sendUserNotification({
        senderId: user.id,
        receiverId,
        type: nType,
        description: desc || "",
        isRequest: false,
      });

      if (error) {
        // supabase error면 details/hint도 같이 보여주기
        const anyErr = error as any;
        const detail = anyErr?.details ? `\n- ${anyErr.details}` : "";
        open?.(`알림 전송 실패: ${error.message}${detail}`);
        return;
      }

      open?.("알림을 보냈어요 ✅");
      onSent?.({ receiverId });
      setNickname("");
      setDesc("");
    } catch (e: any) {
      open?.(`전송 중 오류: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border bg-white">
      <p>
        <strong className="text-red-500">
          ⚠️개발자용: 절대 건드리지 마세요⚠️
        </strong>
      </p>
      <div className="flex items-center gap-2">
        <label className="w-20 text-sm text-gray-600">닉네임</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="상대 닉네임"
          className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="w-20 text-sm text-gray-600">타입</label>
        <select
          value={nType}
          onChange={(e) => setNType(e.target.value as NotificationType)}
          className="w-40 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-start gap-2">
        <label className="w-20 text-sm text-gray-600 pt-2">내용(옵션)</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="간단한 설명을 적을 수 있어요"
          className="flex-1 min-h-[80px] rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={send}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm disabled:opacity-60"
        >
          {loading ? "전송 중…" : buttonLabel}
        </button>
      </div>
    </div>
  );
}
