// src/features/savings/components/RulesSection.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarPlus, Clock, ShieldX, HelpCircle } from "lucide-react";

type RulesSectionProps = {
  /** 버튼 컨테이너에 전달할 클래스 (옵션) */
  className?: string;
  /** 초기 오픈 여부 (디폴트 false) */
  defaultOpen?: boolean;
};

export default function RulesSection({
  className,
  defaultOpen = false,
}: RulesSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section className={`w-full ${className ?? ""}`}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            도움말
          </Button>
        </DialogTrigger>

        {/* ✅ 반응형: 모바일는 거의 전폭, md/ld에서 점진적 확대 */}
        <DialogContent className="w-[92vw] sm:max-w-md md:max-w-lg lg:max-w-xl">
          <DialogHeader>
            <DialogTitle>적금 이용 안내</DialogTitle>
            <DialogDescription>
              납입 시작일, 시간, 보너스 조건을 확인하세요.
            </DialogDescription>
          </DialogHeader>

          {/* 본문: 스크롤 여유를 위해 max-h 부여 */}
          <div className="max-h-[65vh] overflow-y-auto pr-1">
            <ul role="list" className="space-y-3">
              <RuleRow
                icon={<CalendarPlus className="w-4 h-4" />}
                title="납입 시작"
                desc={
                  <>
                    적금은 <b className="font-semibold">개설 다음날(D1)</b>
                    부터 시작합니다.
                  </>
                }
              />
              <RuleRow
                icon={<Clock className="w-4 h-4" />}
                title="납입 시간"
                desc={
                  <>
                    매일 <b className="font-semibold">09:00–18:00 (KST)</b>
                    입니다.
                  </>
                }
              />
              <RuleRow
                icon={<ShieldX className="w-4 h-4" />}
                title="보너스 조건"
                desc={
                  <>
                    <b className="font-semibold">미납일 발생 시</b> 만기{" "}
                    <b className="font-semibold">완주 보너스</b>를 수령할 수
                    없습니다.
                  </>
                }
              />
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ───────── Subcomponents ───────── */

function RuleRow({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg px-1 py-1.5">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <p className="text-sm leading-relaxed text-foreground">{desc}</p>
      </div>
    </li>
  );
}
