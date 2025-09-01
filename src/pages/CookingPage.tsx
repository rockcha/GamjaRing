// src/app/cooking/page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import IngredientPicker from "@/features/cooking/IngredientPicker";
import IngredientList from "@/features/cooking/IngredientList";
import CookingPot from "@/features/cooking/CookingPot";

import { useIngredientList } from "@/features/cooking/useIngredientList";
import {
  getEmoji,
  makeRecipeName,
  normalize,
  type IngredientItem,
} from "@/features/cooking/utils";

import CookingFX from "@/features/cooking/CookingFX";

// ✅ 추가: 알림 전송 & 유저 컨텍스트, 토스트
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export default function CookingPage() {
  const { items, add, removeAt, clear } = useIngredientList();
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");

  const [open, setOpen] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [resultName, setResultName] = useState<string | null>(null);

  const [burst, setBurst] = useState<{ emoji: string; key: number } | null>(
    null
  );

  // ✅ 추가: 유저 정보
  const { user } = useUser();

  const handleAdd = () => {
    const customVal = normalize(custom);
    const pickVal = normalize(selected);
    const name = customVal || pickVal;
    if (!name) return;
    const source: IngredientItem["source"] = customVal ? "custom" : "preset";
    add(name, source); // 중복 허용: 확률 ↑
    setBurst({ emoji: getEmoji(name), key: Date.now() });
    window.setTimeout(() => setBurst(null), 900);
    setCustom("");
  };

  const handleMake = () => {
    setOpen(true);
    setCooking(true);
    setResultName(null);
    const wait = 2000 + Math.floor(Math.random() * 800); // 2~2.8s
    window.setTimeout(() => {
      setResultName(makeRecipeName(items));
      setCooking(false);
    }, wait);
  };

  // ✅ 추가: 공유하기 핸들러
  const handleShare = async () => {
    if (!resultName) return;
    if (!user?.partner_id) {
      toast.error("커플 연결부터 해주세요");
      return;
    }
    const { error } = await sendUserNotification({
      senderId: user.id,
      receiverId: user.partner_id,
      type: "음식공유",
      foodName: resultName, // 🍽️ 이모지는 유틸에서 고정 처리
    });
    if (error) {
      toast.error("공유에 실패했어요. 잠시 후 다시 시도해주세요.");
    } else {
      toast.success("연인에게 공유했어요! 🍽️");
      setOpen(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      {/* 3컬럼: 左 현재 재료 / 中 이미지 / 右 재료 추가 */}
      <div className="grid gap-6 md:grid-cols-[1fr_minmax(280px,420px)_1fr] items-start">
        {/* Left – 현재 재료 */}
        <IngredientList items={items} onRemoveAt={removeAt} onClear={clear} />

        {/* Center – 냄비 + 이모지 버스트 */}
        <CookingPot burst={burst} />

        {/* Right – 재료 추가 */}
        <Card className="shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-base">재료 추가</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <IngredientPicker
              selected={selected}
              setSelected={setSelected}
              custom={custom}
              setCustom={setCustom}
            />
            <Separator className="my-4" />
            <div className="flex gap-2 justify-end">
              <Button
                onClick={handleAdd}
                className="bg-amber-700 hover:bg-amber-600"
              >
                재료 추가하기
              </Button>
              <Button onClick={handleMake}>요리 시작!</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* 결과 모달 */}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>요리 완성!</DialogTitle>
          </DialogHeader>

          {/* 배경 FX를 깔 컨테이너 */}
          <div className="relative">
            {/* ✅ 로딩 중일 때만 FX 표시 (카드 배경) */}
            {cooking && (
              <CookingFX
                {...(items.length
                  ? { emojis: items.map((it) => getEmoji(it.name)) }
                  : {})}
                intensity={0.9}
                count={14}
                sparks={18}
                bubbles={12}
              />
            )}

            {cooking ? (
              <div className="py-10 grid place-items-center relative z-10">
                <div className="mt-6 text-3xl md:text-5xl font-extrabold tracking-tight animate-pulse">
                  요리중…
                </div>
              </div>
            ) : (
              <div className="py-2 relative z-10">
                <h3 className="text-xl font-bold break-words leading-relaxed">
                  {resultName}
                </h3>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {!cooking && (
              <Button
                onClick={handleShare}
                disabled={!resultName}
                className="bg-amber-700 hover:bg-amber-600"
              >
                공유하기
              </Button>
            )}
            <Button onClick={() => setOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
