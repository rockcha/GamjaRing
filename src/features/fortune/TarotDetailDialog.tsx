// src/features/fortune/TarotDetailDialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TAROT_CARD_SRC, THEME, ICONS, TAROT_META } from "./theme";
import type { Fortune } from "./generateFortune";

export default function TarotDetailDialog({
  open,
  onOpenChange,
  fortune,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fortune: Fortune | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
        {fortune ? (
          <div className={`p-5 ${THEME[fortune.grade].bg}`}>
            {/* 등급별 색상 클래스 계산 */}
            {(() => {
              // 예: ring-emerald-300 -> border-emerald-300
              const ringCls = THEME[fortune.grade].ring;
              const borderCls = ringCls.replace("ring-", "border-");
              // chip에 들어있는 bg-xxx-yyy만 뽑아서 hover 오버레이 색으로 사용
              const chipBg =
                THEME[fortune.grade].chip
                  .split(" ")
                  .find((c) => c.startsWith("bg-")) ?? "";

              return (
                <>
                  {/* 중앙 정렬 헤더: 아이콘 + 영어 카드명 */}
                  <DialogHeader className="px-1 items-center text-center">
                    <div className="inline-flex items-center justify-center gap-2">
                      {(() => {
                        const Icon = ICONS[fortune.grade];
                        return (
                          <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${borderCls}`}
                          >
                            <Icon
                              className={`w-5 h-5 ${THEME[fortune.grade].icon}`}
                            />
                          </span>
                        );
                      })()}
                      <DialogTitle
                        className={`text-base sm:text-xl font-semibold ${
                          THEME[fortune.grade].text
                        }`}
                      >
                        <div className="flex justify-center gap-2">
                          {TAROT_META[fortune.grade].en}
                          <p className="text-[12px]"> ({fortune.grade})</p>
                        </div>
                      </DialogTitle>
                    </div>

                    {/* ⛳️ (이전) 등급 뱃지 위치는 카드 우상단으로 이동 */}
                  </DialogHeader>

                  {/* 카드 미리보기 (모달 너비의 1/3, 2:3 비율) */}
                  <div className="mt-3">
                    <div className="mx-auto w-1/3 min-w-[220px] max-w-[360px]">
                      <div
                        className={[
                          "relative group w-full aspect-[2/3] rounded-lg overflow-hidden",
                          THEME[fortune.grade].bg,

                          `border-none ${ringCls} ${borderCls}`,
                        ].join(" ")}
                      >
                        {/* 이미지 */}
                        <img
                          src={TAROT_CARD_SRC[fortune.grade]}
                          alt={`${fortune.grade} 타로카드`}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />

                        {/* hover 색 오버레이(아주 옅게) */}
                        <div
                          className={`pointer-events-none absolute inset-0 opacity-0  transition ${chipBg}`}
                          style={{ mixBlendMode: "screen" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 텍스트 섹션 */}
                  <div className="mt-4 space-y-3">
                    <div
                      className={`text-sm font-semibold ${
                        THEME[fortune.grade].text
                      }`}
                    >
                      {fortune.title}
                    </div>
                    <p className="text-sm text-neutral-800/80">
                      {fortune.summary}
                    </p>

                    {/* 연애 / 일·공부 / 건강 : 보더와 타이틀을 등급 색으로 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm ">
                      <div
                        className={`rounded-xl border ${borderCls} bg-white/85 p-3`}
                      >
                        <div
                          className={`text-xs font-semibold ${
                            THEME[fortune.grade].text
                          }`}
                        >
                          연애
                        </div>
                        <p className="mt-1 text-neutral-700/80">
                          {fortune.love}
                        </p>
                      </div>
                      <div
                        className={`rounded-xl border ${borderCls} bg-white/85 p-3`}
                      >
                        <div
                          className={`text-xs font-semibold ${
                            THEME[fortune.grade].text
                          }`}
                        >
                          일/공부
                        </div>
                        <p className="mt-1 text-neutral-700/80">
                          {fortune.work}
                        </p>
                      </div>
                      <div
                        className={`rounded-xl border ${borderCls} bg-white/85 p-3`}
                      >
                        <div
                          className={`text-xs font-semibold ${
                            THEME[fortune.grade].text
                          }`}
                        >
                          건강
                        </div>
                        <p className="mt-1 text-neutral-700/80">
                          {fortune.health}
                        </p>
                      </div>
                    </div>

                    {/* 라벨은 중립, 값은 등급 색상으로 강조 */}
                    <div className="flex flex-wrap gap-2 text-xs justify-center">
                      <span
                        className={`rounded-full border px-2 py-1 bg-white/85 ${borderCls}`}
                      >
                        <span className="text-neutral-600">행운의 색:</span>{" "}
                        <span
                          className={`${
                            THEME[fortune.grade].text
                          } font-semibold`}
                        >
                          {fortune.luckyColor}
                        </span>
                      </span>
                      <span
                        className={`rounded-full border px-2 py-1 bg-white/85 ${borderCls}`}
                      >
                        <span className="text-neutral-600">행운의 숫자:</span>{" "}
                        <span
                          className={`${
                            THEME[fortune.grade].text
                          } font-semibold`}
                        >
                          {fortune.luckyNumber}
                        </span>
                      </span>
                      <span
                        className={`rounded-full border px-2 py-1 bg-white/85 ${borderCls}`}
                      >
                        <span className="text-neutral-600">행운의 아이템:</span>{" "}
                        <span
                          className={`${
                            THEME[fortune.grade].text
                          } font-semibold`}
                        >
                          {fortune.luckyItem}
                        </span>
                      </span>
                    </div>

                    {!!fortune.keywords?.length && (
                      <div className="pt-1 flex flex-wrap gap-1.5 justify-center">
                        {fortune.keywords.map((k, i) => (
                          <span
                            key={i}
                            className={`text-[11px] px-2 py-1 rounded-full border ${
                              THEME[fortune.grade].chip
                            }`}
                          >
                            #{k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm text-muted-foreground">결과를 불러오는 중…</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
