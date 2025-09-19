// src/features/fishing/ingredient-section/ui/BulkResultsModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RARITY_ORDER, classesByRarity } from "./utils";
import type { BulkCatch, Placements, Rarity, TankRow } from "./types";
import { useEffect, useMemo, useRef, useState } from "react";

/* ─────────────────────────────────────────────
    내부 이펙트 유틸: CSS keyframes를 파일 내부에서 1회만 주입
   ───────────────────────────────────────────── */
function useInjectKeyframesOnce() {
  const injectedRef = useRef(false);
  useEffect(() => {
    if (injectedRef.current) return;
    const style = document.createElement("style");
    style.setAttribute("data-bulk-fx", "true");
    style.textContent = `
@keyframes shineSweep {
  0% { transform: translateX(-120%) skewX(-20deg); opacity: 0; }
  15% { opacity: .7; }
  100% { transform: translateX(120%) skewX(-20deg); opacity: 0; }
}
@keyframes auraPulse {
  0%,100% { opacity: .0; box-shadow: 0 0 0px rgba(0,0,0,0); }
  40% { opacity: .85; box-shadow: 0 0 40px rgba(255,255,255,.7), 0 0 60px var(--fx-color, rgba(255,255,255,.6)); }
}
@keyframes sparklePop {
  0% { transform: scale(.4) translateY(6px); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: scale(1) translateY(-8px); opacity: 0; }
}
/* 유틸 클래스 */
.bulk-fx-shine { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.bulk-fx-shine::after {
  content:""; position: absolute; top: 0; bottom: 0; width: 45%;
  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.6) 45%, rgba(255,255,255,0) 100%);
  filter: blur(2px);
  animation: shineSweep 1200ms ease-out forwards;
}
.bulk-fx-aura {
  position: absolute; inset: -2px; border-radius: 12px; pointer-events: none;
  animation: auraPulse 1800ms ease-in-out 1 forwards;
}
.bulk-fx-sparkle {
  position: absolute; width: 10px; height: 10px; pointer-events: none;
  background: radial-gradient(circle, #fff 0 40%, transparent 41%);
  animation: sparklePop 1200ms ease-out forwards;
  filter: drop-shadow(0 0 6px rgba(255,255,255,.9));
}
`;
    document.head.appendChild(style);
    injectedRef.current = true;
    return () => {
      // 남겨둬도 무방하지만, 컴포넌트 완전 언마운트 시 정리하고 싶다면 주석 해제
      // style.remove();
    };
  }, []);
}

/* ─────────────────────────────────────────────
    2초 자동 종료 레어 이펙트 오버레이(파일 내부 컴포넌트)
   ───────────────────────────────────────────── */
function RarityFX({
  rarity,
  duration = 3000,
}: {
  rarity: "에픽" | "전설";
  duration?: number;
}) {
  const [alive, setAlive] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setAlive(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  const color =
    rarity === "전설" ? "#f59e0b" /* amber-500 */ : "#8b5cf6"; /* violet-500 */

  if (!alive) return null;

  // 스파클 6~8개 랜덤(간단) — 렌더마다 달라도 시각적으로 문제 없고 가벼움
  const count = rarity === "전설" ? 12 : 10;
  const sparkles = Array.from({ length: count }).map((_, i) => {
    const left = `${Math.random() * 80 + 10}%`;
    const top = `${Math.random() * 70 + 10}%`;
    const delay = `${Math.random() * 500}ms`;
    const size = Math.random() * 8 + 12;
    return (
      <span
        key={i}
        className="bulk-fx-sparkle"
        style={{
          left,
          top,
          width: size,
          height: size,
          animationDelay: delay,
        }}
      />
    );
  });

  return (
    <>
      {/* 대각선 샤인 */}
      <div className="bulk-fx-shine" />
      {/* 오라(등급색) */}
      <div
        className="bulk-fx-aura"
        style={
          {
            borderRadius: 12,
            // CSS 변수로 박스섀도 색 주입
            ["--fx-color" as any]: color,
          } as React.CSSProperties
        }
      />
      {/* 스파클 */}
      <div className="pointer-events-none absolute inset-0">{sparkles}</div>
    </>
  );
}

type Props = {
  open: boolean;
  setOpen: (b: boolean) => void;
  results: BulkCatch[] | null;
  placements: Placements;
  setPlacements: (updater: (prev: Placements) => Placements) => void;
  tanks: TankRow[];
  defaultTank: number;
  totalCaught: number;
  failCount: number;
  busy: boolean;
  onSave: (auto?: boolean) => Promise<boolean>;
};

export default function BulkResultsModal({
  open,
  setOpen,
  results,
  placements,
  setPlacements,
  tanks,
  defaultTank,
  totalCaught,
  failCount,
  busy,
  onSave,
}: Props) {
  useInjectKeyframesOnce();

  const tankOptions = tanks.length ? tanks : [{ tank_no: 1, title: "1 번" }];

  const grouped = useMemo(() => {
    const g: Record<Rarity, BulkCatch[]> = {
      전설: [],
      에픽: [],
      희귀: [],
      일반: [],
    };
    for (const r of results ?? []) g[r.rarity].push(r);
    return g;
  }, [results]);

  /* ─────────────────────────────────────────────
      레어 카드 이펙트 표시 상태 관리: id별로 2초 켜졌다가 꺼짐
     ───────────────────────────────────────────── */
  const [fxActive, setFxActive] = useState<Record<string, boolean>>({});
  const timersRef = useRef<Record<string, number>>({});

  // results가 바뀔 때, 에픽/전설에 대해 2초간 이펙트 on
  useEffect(() => {
    if (!results?.length) return;
    const rareIds = results
      .filter((r) => r.rarity === "에픽" || r.rarity === "전설")
      .map((r) => r.id);

    // 켜기
    setFxActive((prev) => {
      const next = { ...prev };
      rareIds.forEach((id) => (next[id] = true));
      return next;
    });

    // 끄기 타이머 설정(2초)
    rareIds.forEach((id) => {
      // 기존 타이머 있으면 먼저 정리
      if (timersRef.current[id]) {
        window.clearTimeout(timersRef.current[id]);
      }
      timersRef.current[id] = window.setTimeout(() => {
        setFxActive((prev) => {
          const next = { ...prev };
          next[id] = false;
          return next;
        });
        delete timersRef.current[id];
      }, 2000);
    });

    return () => {
      // 언마운트/갱신 시 타이머 정리 (옵션)
      rareIds.forEach((id) => {
        if (timersRef.current[id]) {
          window.clearTimeout(timersRef.current[id]);
          delete timersRef.current[id];
        }
      });
    };
  }, [results]);

  async function handleOpenChange(next: boolean) {
    // ✅ 닫힐 때 자동 저장
    if (!next && results?.length) {
      await onSave(true);
      return;
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[980px] p-0 overflow-hidden rounded-2xl">
        <div className="flex flex-col max-h-[80vh] bg-white">
          <DialogHeader className="p-6 pb-4 sticky top-0 bg-white/90 backdrop-blur z-20 border-b">
            <DialogTitle>일괄 낚시 결과</DialogTitle>
            <div className="text-sm text-muted-foreground">
              성공 {totalCaught} / 실패 {failCount} · 종류{" "}
              {results?.length ?? 0}
            </div>
          </DialogHeader>

          <div className="px-6 py-4 overflow-auto grow">
            {results && results.length > 0 ? (
              RARITY_ORDER.map((ra) =>
                grouped[ra].length ? (
                  <section key={ra} className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">
                        {ra}{" "}
                        <span className="text-xs text-muted-foreground">
                          {grouped[ra].length}종
                        </span>
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {grouped[ra].map((f) => {
                        const theme = classesByRarity(f.rarity);
                        const sel = placements[f.id] ?? defaultTank ?? 1;

                        const isRare =
                          f.rarity === "에픽" || f.rarity === "전설";
                        const showFx = isRare && fxActive[f.id];

                        return (
                          <div
                            key={f.id}
                            className={cn(
                              "rounded-xl border p-2 shadow-sm transition-colors",
                              theme.card
                            )}
                          >
                            <div
                              className={cn(
                                "relative w-full aspect-square rounded-lg border grid place-items-center overflow-hidden bg-white",
                                theme.imgBorder
                              )}
                            >
                              {/* NEW 배지 */}
                              {f.isNew && (
                                <span className="absolute right-1.5 top-1.5 z-20 rounded-full bg-red-500 text-white px-1.5 py-0.5 text-[10px] font-bold leading-none shadow">
                                  new
                                </span>
                              )}

                              {/* 레어 이펙트(2초 자동 소멸) */}
                              {showFx && (
                                <div className="absolute inset-0 z-30">
                                  <RarityFX
                                    rarity={f.rarity as "에픽" | "전설"}
                                  />
                                </div>
                              )}

                              <img
                                src={f.image}
                                alt={f.label}
                                className="w-full h-full object-contain relative z-0"
                                draggable={false}
                                loading="lazy"
                                onError={(ev) => {
                                  (
                                    ev.currentTarget as HTMLImageElement
                                  ).onerror = null;
                                  (ev.currentTarget as HTMLImageElement).src =
                                    "/aquarium/fish_placeholder.png";
                                }}
                              />
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold truncate">
                                {f.label}
                              </div>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                                  theme.pill
                                )}
                              >
                                {f.rarity}
                              </span>
                            </div>

                            <div
                              className={cn("text-[11px] my-1", theme.metaText)}
                            >
                              수량 x{f.count}
                            </div>

                            <Select
                              value={String(sel)}
                              onValueChange={(v) =>
                                setPlacements((prev) => ({
                                  ...prev,
                                  [f.id]: Number(v),
                                }))
                              }
                              disabled={busy}
                            >
                              <SelectTrigger className="h-8 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {tankOptions.map((t) => (
                                  <SelectItem
                                    key={`${f.id}-${t.tank_no}`}
                                    value={String(t.tank_no)}
                                  >
                                    {t.title && t.title.trim().length > 0
                                      ? t.title
                                      : `${t.tank_no} 번`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null
              )
            ) : (
              <div className="text-sm text-muted-foreground">
                잡힌 물고기가 없어요.
              </div>
            )}
          </div>

          <div className="sticky bottom-0 z-20 bg-white/95 border-t">
            <div className="px-6 py-3 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {results?.length
                  ? `저장 대기: 총 ${totalCaught}마리`
                  : `저장할 항목이 없습니다.`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onSave(false)}
                  disabled={!results?.length || busy}
                >
                  선택대로 저장
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                  disabled={busy}
                >
                  닫기
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
