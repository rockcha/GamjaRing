// src/features/fortune/TarotDetailDialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button"; // ✅ 닫기 버튼
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
      {/* ✅ 모바일에서 살짝 더 작게: 가로폭/패딩 조절 */}
      <DialogContent className="max-w-[92vw] sm:max-w-xl p-0 overflow-hidden">
        {fortune ? (
          <div className={`p-4 sm:p-5 ${THEME[fortune.grade].bg}`}>
            {(() => {
              const ringCls = THEME[fortune.grade].ring;
              const borderCls = ringCls.replace("ring-", "border-");
              const chipBg =
                THEME[fortune.grade].chip
                  .split(" ")
                  .find((c) => c.startsWith("bg-")) ?? "";

              return (
                <>
                  {/* 중앙 정렬 헤더 */}
                  <DialogHeader className="px-1 items-center text-center">
                    <div className="inline-flex items-center justify-center gap-2">
                      {(() => {
                        const Icon = ICONS[fortune.grade];
                        return (
                          <span
                            className={`inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full ${borderCls}`}
                          >
                            <Icon
                              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                THEME[fortune.grade].icon
                              }`}
                            />
                          </span>
                        );
                      })()}
                      <DialogTitle
                        className={`text-sm sm:text-xl font-semibold ${
                          THEME[fortune.grade].text
                        }`}
                      >
                        <div className="flex justify-center gap-1 sm:gap-2">
                          {TAROT_META[fortune.grade].en}
                          <span className="text-[10px] sm:text-[12px]">
                            ({fortune.grade})
                          </span>
                        </div>
                      </DialogTitle>
                    </div>
                  </DialogHeader>

                  {/* 카드 미리보기 - 📱에서 더 작게 */}
                  <div className="mt-3">
                    <div className="mx-auto w-1/2 min-w-[140px] max-w-[220px] sm:w-1/3 sm:min-w-[220px] sm:max-w-[360px]">
                      <div
                        className={[
                          "relative group w-full aspect-[2/3] rounded-lg overflow-hidden",
                          THEME[fortune.grade].bg,
                          `border-none ${ringCls} ${borderCls}`,
                        ].join(" ")}
                      >
                        <img
                          src={TAROT_CARD_SRC[fortune.grade]}
                          alt={`${fortune.grade} 타로카드`}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div
                          className={`pointer-events-none absolute inset-0 opacity-0 transition ${chipBg}`}
                          style={{ mixBlendMode: "screen" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 텍스트 섹션 */}
                  <div className="mt-2 space-y-3 ">
                    <div className="flex flex-col items-center justify-center mb-6">
                      <div
                        className={`text-base font-semibold  ${
                          THEME[fortune.grade].text
                        }`}
                      >
                        {fortune.title}
                      </div>
                      <p className="text-sm text-neutral-800/80">
                        {fortune.summary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px] sm:text-sm">
                      <div
                        className={`rounded-xl border ${borderCls} bg-white/85 p-3`}
                      >
                        <div
                          className={`text-[11px] sm:text-xs font-semibold ${
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
                          className={`text-[11px] sm:text-xs font-semibold ${
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
                          className={`text-[11px] sm:text-xs font-semibold ${
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

                    <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs justify-center">
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
                            className={`text-[10px] sm:text-[11px] px-2 py-1 rounded-full border ${
                              THEME[fortune.grade].chip
                            }`}
                          >
                            #{k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ✅ 하단 닫기 버튼 (모바일은 꽉 차게) */}
                  <DialogFooter className="mt-4">
                    <Button
                      className="w-full sm:w-auto"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      닫기
                    </Button>
                  </DialogFooter>
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
