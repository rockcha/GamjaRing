"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { isDepositWindowOpen } from "./time";

export default function DepositWindowBadge() {
  const [open, setOpen] = useState(isDepositWindowOpen());

  useEffect(() => {
    const id = setInterval(() => setOpen(isDepositWindowOpen()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-xs text-muted-foreground flex items-center gap-2">
      <Clock className="h-3.5 w-3.5" />
      납입 가능: <span className="font-medium">09:00–18:00 (KST)</span>
      {open ? (
        <Badge className="ml-1">지금 납입 가능</Badge>
      ) : (
        <Badge className="ml-1" variant="secondary">
          지금은 불가
        </Badge>
      )}
    </div>
  );
}
