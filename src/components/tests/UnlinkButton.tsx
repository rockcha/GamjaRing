// src/components/UnlinkButton.tsx
import { useCoupleContext } from "@/contexts/CoupleContext";
import { Button } from "../ui/button";

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
    <Button variant="destructive" onClick={handleClick}>
      커플 끊기
    </Button>
  );
}
