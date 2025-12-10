// src/components/aquarium/TankChipsNavigatorDialog.tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import TankChipsNavigator from "./TankChipsNavigator";
import type { LucideIcon } from "lucide-react";

type Tank = { tank_no: number; title: string; theme_id: number | null };

type Props = {
  tanks: Tank[];
  idx: number;
  onSelect: (index: number) => void;
  onRename?: (tankNo: number, newTitle: string) => void;
  /** 툴바에 표시될 텍스트 라벨 */
  label?: string;
  /** 함께 쓸 아이콘 (lucide) */
  icon?: LucideIcon;
};

export default function TankChipsNavigatorDialog({
  tanks,
  idx,
  onSelect,
  onRename,
  label = "아쿠아리움 변경하기",
  icon: Icon,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* 🔘 툴바에 들어가는 트리거 버튼 */}
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-full border",
            "px-2.5 py-1 text-[11px] sm:text-xs",
            "bg-white/90 dark:bg-slate-900/70 backdrop-blur",
            "hover:bg-white dark:hover:bg-slate-900 transition shadow-sm"
          )}
        >
          {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">변경하기</span>
        </button>
      </DialogTrigger>

      {/* 💬 실제 모달 내용 */}
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>아쿠아리움 변경하기</DialogTitle>
          <DialogDescription>
            어항을 선택하고 이름을 수정하거나 빠르게 이동할 수 있어요.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <TankChipsNavigator
            className="border-none bg-transparent shadow-none px-0 pb-0 pt-0"
            tanks={tanks}
            idx={idx}
            onSelect={(i) => {
              onSelect(i);
              // 선택만 하고 닫을지 말지는 취향인데,
              // 바로 닫고 싶다면 아래 주석 해제
              // setOpen(false);
            }}
            onRename={onRename}
            density="compact"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
