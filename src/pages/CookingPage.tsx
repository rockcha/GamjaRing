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

import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { useCoupleContext } from "@/contexts/CoupleContext";

/* 🧩 lucide-react 아이콘들 */
import { ChefHat, Sparkles, Timer, Share2, Plus, Flame } from "lucide-react";

/* ✅ -5~+5 삼각분포 (0 중심) */
function pickTriangularDelta(): number {
  const values = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  const weights = [1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 1]; // 합=40
  let r = Math.random() * 40;
  for (let i = 0; i < values.length; i++) {
    r -= weights[i]!;
    if (r < 0) return values[i]!;
  }
  return 0;
}

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

  const { user } = useUser();
  const { addGold } = useCoupleContext();

  const handleAdd = () => {
    const customVal = normalize(custom);
    const pickVal = normalize(selected);
    const name = customVal || pickVal;
    if (!name) return;
    const source: IngredientItem["source"] = customVal ? "custom" : "preset";
    add(name, source);
    setBurst({ emoji: getEmoji(name), key: Date.now() });
    window.setTimeout(() => setBurst(null), 900);
    setCustom("");
  };

  const handleMake = () => {
    setOpen(true);
    setCooking(true);
    setResultName(null);
    const wait = 2000 + Math.floor(Math.random() * 800);
    window.setTimeout(() => {
      setResultName(makeRecipeName(items));
      setCooking(false);
    }, wait);
  };

  // ✅ 공유: 알림 + 골드 가감 + 토스트
  const handleShare = async () => {
    if (!resultName) return;
    if (!user?.partner_id) {
      toast.error("커플 연결부터 해주세요");
      return;
    }
    const delta = pickTriangularDelta();
    const deltaText = delta >= 0 ? `+${delta}` : `${delta}`;

    try {
      await addGold(delta);
      if (delta >= 0) toast.success(`골드를 획득했어요 ${deltaText}`);
      else toast.error(`골드를 잃었어요 ${deltaText}`);

      const { error } = await sendUserNotification({
        senderId: user.id,
        receiverId: user.partner_id,
        type: "음식공유",
        foodName: resultName,
        gold: delta,
      });

      if (error) {
        toast.error("알림 전송에 실패했어요. 잠시 후 다시 시도해주세요.");
      } else {
        setOpen(false);
      }
    } catch {
      toast.error("골드 반영에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      {/* 상단 섹션 타이틀 */}

      {/* 3컬럼: 左 현재 재료 / 中 이미지 / 右 재료 추가 */}
      <div className="grid gap-6 md:grid-cols-[1fr_minmax(280px,420px)_1fr] items-start">
        {/* Left – 현재 재료 */}
        <IngredientList items={items} onRemoveAt={removeAt} onClear={clear} />

        {/* Center – 냄비 + 이모지 버스트 */}
        <CookingPot burst={burst} />

        {/* Right – 재료 추가 */}
        <Card className="shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-amber-700" />
              재료 추가
            </CardTitle>
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
                <Plus className="h-4 w-4 mr-1.5" />
                재료 추가하기
              </Button>
              <Button onClick={handleMake}>
                <Flame className="h-4 w-4 mr-1.5" />
                요리 시작!
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 결과 모달 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          {/* ⛳️ 제목/내용 구분: Header + Separator + Content */}
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2">
              {cooking ? (
                <>
                  <ChefHat className="h-5 w-5 text-amber-700" />
                  요리 진행중
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-amber-700" />
                  요리 완성!
                </>
              )}
            </DialogTitle>
            <div className="text-xs text-muted-foreground">
              {cooking
                ? "맛있는 결과를 기대해요"
                : "오늘의 한 그릇이 완성되었어요"}
            </div>
          </DialogHeader>

          <Separator />

          {/* 내용 섹션 */}
          {cooking ? (
            // ✅ 요리 중: 전체 GIF/FX + 어두운 배경
            <div className="relative mt-3 rounded-lg overflow-hidden bg-zinc-900/60 min-h-[220px]">
              <CookingFX
                durationMs={2000}
                onDone={() => {
                  setCooking(false);
                }}
              />
              <div className="absolute inset-0 grid place-items-center z-10 text-white">
                {/* 필요하면 진행중 텍스트/아이콘 */}
                {/* <Timer className="h-6 w-6 mr-2" /> 요리중… */}
              </div>
            </div>
          ) : (
            // ✅ 요리 완료: 배경/FX 없이 결과 텍스트만
            <div className="mt-4">
              <h3 className="text-2xl md:text-3xl font-extrabold leading-tight text-amber-700 break-words">
                {resultName}
              </h3>
            </div>
          )}

          <Separator className="mt-2" />

          <DialogFooter className="gap-2">
            {!cooking && (
              <Button
                onClick={handleShare}
                disabled={!resultName}
                className="bg-amber-700 hover:bg-amber-600"
              >
                <Share2 className="h-4 w-4 mr-1.5" />
                공유하기
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
