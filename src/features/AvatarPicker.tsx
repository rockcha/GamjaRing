"use client";
import { useState } from "react";
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
  const currentSrc = avatarSrc(sel ?? undefined);

  const save = async () => {
    if (!sel) return;
    await onSave(sel);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setSel(value ?? null);
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <Button
          className={cn("hover:cursor-pointer", triggerClassName)}
          variant="outline"
          size="sm"
        >
          아바타 설정하기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>아바타 선택</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-3">
          {AVATAR_IDS.map((id) => {
            const src = avatarSrc(id)!;
            const active = sel === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSel(id)}
                className={cn(
                  "rounded-full overflow-hidden border p-0 aspect-square grid place-items-center",
                  active
                    ? "ring-2 ring-amber-500 border-amber-500"
                    : "hover:border-amber-400"
                )}
                title={`Avatar ${id}`}
              >
                <img
                  src={src}
                  alt={`avatar ${id}`}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">선택됨:</span>
            <div className="w-8 h-8 rounded-full overflow-hidden border">
              {currentSrc ? <img src={currentSrc} alt="preview" /> : null}
            </div>
          </div>
          <Button
            onClick={save}
            disabled={!sel}
            className="hover:cursor-pointer"
          >
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
