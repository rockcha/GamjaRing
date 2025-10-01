// src/features/fishing/ingredient-section/ui/WaitFishingDialog.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { randomFunnyLine } from "@/features/fishing/funnyLines";

type Props = {
  open: boolean;
  phase: "waiting" | "finishing"; // waiting=5초 타이머, finishing=RPC 반환 대기
};

export default function WaitFishingDialog({ open, phase }: Props) {
  // ✅ 오픈 시점에 딱 한 번 고정될 GIF 인덱스
  const [gifIndex, setGifIndex] = useState<number>(1);
  // ✅ 문구는 즉시 1개 → 3초 뒤 1번만 교체
  const [line, setLine] = useState<string>("바다의 농담을 건지는 중…");
  const onceRef = useRef(false);
  const swapTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      // 닫힐 때 타이머 정리
      if (swapTimerRef.current) {
        window.clearTimeout(swapTimerRef.current);
        swapTimerRef.current = null;
      }
      onceRef.current = false;
      return;
    }

    // Dialog가 열릴 때마다 한 번만 초기화
    setGifIndex(1 + Math.floor(Math.random() * 16));
    const first = randomFunnyLine();
    setLine(first);

    // 3초 후 한 번만 다른 문구로 교체(가능하면 다른 문구)
    if (!onceRef.current) {
      onceRef.current = true;
      swapTimerRef.current = window.setTimeout(() => {
        let next = randomFunnyLine();
        if (next === first) {
          // 동일하면 한 번 더 뽑기
          next = randomFunnyLine();
        }
        setLine(next);
        swapTimerRef.current = null;
      }, 3000);
    }

    return () => {
      if (swapTimerRef.current) {
        window.clearTimeout(swapTimerRef.current);
        swapTimerRef.current = null;
      }
    };
  }, [open]);

  return (
    <Dialog open={open}>
      <DialogContent className="w-[min(92vw,520px)] p-0 overflow-hidden rounded-2xl border">
        <div className="bg-white p-6 text-center">
          <div className="text-amber-700 text-sm font-semibold mb-3">
            {phase === "waiting" ? "낚시 중…" : "마무리 중…"}
          </div>
          <img
            src={`/fishing/fishing${gifIndex}.gif`}
            alt="낚시 중 애니메이션"
            className="mx-auto w-40 h-40 object-contain rounded-md mb-4"
            draggable={false}
          />
          <div className="mt-1 text-sm text-gray-900 text-center">
            <div className="font-semibold mb-1">🫧 바닷속 이야기</div>
            <div className="text-gray-800">{line}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
