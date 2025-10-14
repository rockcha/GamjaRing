// src/features/savings/components/RulesSection.tsx
"use client";

import * as React from "react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import {
  CalendarPlus,
  Clock,
  ShieldX,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

/** 미니멀 · 담백한 도움말 섹션 */
type RulesSectionProps = {
  defaultOpen?: boolean; // 기본 접힘/펼침
  className?: string;
};

export default function RulesSection({
  defaultOpen = false,
  className,
}: RulesSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section className={`w-full ${className ?? ""}`}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card className="p-2">
          {/* 헤더(전체 트리거) — 최소한의 라인/컬러 */}
          <CollapsibleTrigger
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-expanded={open}
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">도움말</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>

          {/* 콘텐츠 — 타임라인/테두리 제거, 컴팩트 리스트 */}
          <CollapsibleContent asChild>
            <ul role="list" className="mt-2 space-y-2">
              <RuleRow
                icon={<CalendarPlus className="w-4 h-4" />}
                title="납입 시작"
                desc={
                  <>
                    적금은 <b className="font-semibold">개설 다음날(D1)</b>부터
                    시작합니다.
                  </>
                }
              />
              <RuleRow
                icon={<Clock className="w-4 h-4" />}
                title="납입 시간"
                desc={
                  <>
                    매일 <b className="font-semibold">09:00–18:00 (KST)</b>{" "}
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
                    <b className="font-semibold">
                      완주 보너스를 수령할 수 없습니다.
                    </b>
                  </>
                }
              />
            </ul>
          </CollapsibleContent>
        </Card>
      </Collapsible>
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
    <li className="flex items-start gap-3 rounded-lg px-2 py-1.5">
      {/* 아이콘: 원형 배경/테두리 제거 → 더 미니멀 */}
      <div className="mt-0.5 text-muted-foreground">{icon}</div>

      {/* 텍스트: 제목 얇게, 핵심은 desc에서 굵게 */}
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <p className="text-sm leading-relaxed text-foreground">{desc}</p>
      </div>
    </li>
  );
}
