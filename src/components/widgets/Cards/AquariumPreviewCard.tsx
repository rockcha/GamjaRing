"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import AquariumBox from "@/features/aquarium/AquariumBox";

/**
 * ✅ 아쿠아리움 미리보기 카드 (Next.js 없이)
 * - 부모에서 aspectRatio로 사이즈 조정 (예: "16 / 9", "4 / 3", "800 / 410")
 * - 클릭 시 아무 액션 없음 (readOnly)
 * - 하단 버튼: location.href로 "/aquarium" 이동
 * - 컨테이너 크기에 맞춰 물고기 크기 자동 스케일 (fitToContainer)
 */
export default function AquariumPreviewCard({
  title = "🪸 우리의 아쿠아리움 ",
  aspectRatio = "800 / 450",
  className,
}: {
  title?: string;
  aspectRatio?: string; // CSS aspect-ratio 표현식
  className?: string;
}) {
  const goAquarium = () => {
    window.location.href = "/aquarium";
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {/* DB에서 자동 로딩, 클릭해도 아무 동작 없음, 컨테이너 스케일 적용 */}
        <AquariumBox readOnly aspectRatio={aspectRatio} fitToContainer />
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        <Button onClick={goAquarium}>어항으로 가기</Button>
      </CardFooter>
    </Card>
  );
}
