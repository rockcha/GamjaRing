"use client";

import { useEffect, useState } from "react";
import { avatarSrc, AVATAR_IDS } from "@/features/localAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  value?: number | null;
  onSave: (id: number) => Promise<void> | void;
  triggerClassName?: string;
};

export default function AvatarPicker({
  value,
  onSave,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<number | null>(value ?? null);

  // ✅ 부모 value 변경(예: fetchUser 이후) 시 선택값 동기화
  useEffect(() => {
    setSel(value ?? null);
  }, [value]);

  const currentSrc = avatarSrc(sel ?? undefined);

  const save = async () => {
    // ✅ id가 0일 수도 있으니 truthy 체크 금지
    if (sel === null) return;
    await onSave(sel);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // ✅ 열 때는 항상 최신 value 기준으로 초기화
        if (o) setSel(value ?? null);
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <Button
          className={cn("hover:cursor-pointer", triggerClassName)}
          variant="outline"
          size="sm"
          type="button"
        >
          아바타 설정하기
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>아바타 선택</DialogTitle>
        </DialogHeader>

        {/* ✅ 그리드 영역만 스크롤: 26개 이상도 아래로 내려서 보임 */}
        <div className="max-h-[360px] overflow-y-auto pr-1">
          <div className="grid grid-cols-5 gap-3">
            {AVATAR_IDS.map((id) => {
              const src = avatarSrc(id);
              const active = sel === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSel(id)}
                  className={cn(
                    "rounded-full overflow-hidden border p-0 aspect-square grid place-items-center bg-white",
                    active
                      ? "ring-2 ring-amber-500 border-amber-500"
                      : "hover:border-amber-400"
                  )}
                  title={`Avatar ${id}`}
                >
                  {/* ✅ src 없으면 fallback */}
                  {src ? (
                    <img
                      src={src}
                      alt={`avatar ${id}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">
                      없음
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">선택됨:</span>
            <div className="w-8 h-8 rounded-full overflow-hidden border bg-white grid place-items-center">
              {currentSrc ? (
                <img
                  src={currentSrc}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[10px] text-muted-foreground">-</span>
              )}
            </div>
          </div>

          <Button
            onClick={save}
            disabled={sel === null}
            className="hover:cursor-pointer"
            type="button"
          >
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
