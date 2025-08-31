"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown } from "lucide-react";
import { COMMON_INGREDIENTS } from "./utils";

type Props = {
  selected: string;
  setSelected: (s: string) => void;
  custom: string;
  setCustom: (s: string) => void;
  disabled?: boolean;
};

export default function IngredientPicker({
  selected,
  setSelected,
  custom,
  setCustom,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between"
            disabled={disabled}
          >
            {selected || "재료 선택"}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="예: 감자, 달걀, 라면…" />
            <CommandList className="max-h-64 overflow-y-auto">
              <CommandEmpty>검색 결과가 없어요</CommandEmpty>
              <CommandGroup heading="자주 쓰는 재료">
                {COMMON_INGREDIENTS.map((label) => (
                  <CommandItem
                    key={label}
                    value={label}
                    onSelect={(v) => {
                      setSelected(v);
                      setOpen(false);
                    }}
                  >
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Input
        placeholder="직접 입력 (예: 베이컨)"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        disabled={disabled}
      />
    </div>
  );
}
