// src/components/UnlinkButton.tsx
import { useCoupleContext } from "@/contexts/CoupleContext";

export default function UnlinkButton() {
  const { isCoupled, disconnectCouple } = useCoupleContext();

  const handleClick = async () => {
    if (!isCoupled) return;
    const confirmed = window.confirm("정말 커플을 끊으시겠습니까?");
    if (!confirmed) return;

    const { error } = await disconnectCouple();
    if (error) {
      alert("커플 끊기 실패: " + error.message);
    } else {
      alert("커플 관계가 성공적으로 해제되었습니다.");
    }
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
    >
      💔 커플 끊기
    </button>
  );
}
