// components/CoupleRequestButton.tsx
import { useState } from "react";
import { useCoupleContext } from "@/contexts/CoupleContext";

export default function CoupleRequestButton() {
  const { isCoupled, requestCouple } = useCoupleContext();
  const [showInput, setShowInput] = useState(false);
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    if (!nickname.trim()) {
      setMessage("닉네임을 입력해주세요.");
      return;
    }

    const { error } = await requestCouple(nickname.trim());
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("요청이 성공적으로 전송되었습니다! 💌");
      setShowInput(false);
      setNickname("");
    }
  };

  if (isCoupled) return null;

  return (
    <div className="p-4 border rounded-md max-w-md space-y-3 bg-white shadow">
      <button
        onClick={() => setShowInput((prev) => !prev)}
        className="bg-orange-400 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded"
      >
        💌 커플 요청 보내기
      </button>

      {showInput && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="상대 닉네임을 입력하세요"
            className="w-full px-3 py-2 border rounded"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <button
            onClick={handleSend}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded"
          >
            요청 보내기
          </button>
        </div>
      )}

      {message && <p className="text-sm text-gray-700 mt-2">{message}</p>}
    </div>
  );
}
