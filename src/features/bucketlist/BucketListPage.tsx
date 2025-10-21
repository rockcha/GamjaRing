// src/pages/BucketListPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

import BucketFormDialog from "@/features/bucketlist/BucketFormDialog";
import BucketItemCard from "@/features/bucketlist/BucketItemCard";
import { useBucketList } from "@/features/bucketlist/useBucketList";
import type { BucketItem, BucketCategory } from "@/features/bucketlist/types";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  toneClasses,
} from "@/features/bucketlist/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

/** ✅ 선택 카테고리 이모지 워터마크 배경 */
function EmojiBackdrop({
  emoji,
  toneClass = "",
}: {
  emoji: string;
  toneClass?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-[1] overflow-hidden rounded-2xl",
        "[content-visibility:auto]",
        toneClass
      )}
    >
      <div
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "opacity-[0.06] select-none"
        )}
        style={{ fontSize: "min(36vw, 420px)", filter: "blur(0.2px)" }}
      >
        {emoji}
      </div>
      <div
        className="absolute -left-4 top-6 rotate-[-10deg] opacity-[0.06] select-none"
        style={{ fontSize: "min(16vw, 160px)", filter: "blur(0.2px)" }}
      >
        {emoji}
      </div>
      <div
        className="absolute right-3 -bottom-2 rotate-[8deg] opacity-[0.055] select-none"
        style={{ fontSize: "min(14vw, 140px)", filter: "blur(0.2px)" }}
      >
        {emoji}
      </div>
      <div
        className="absolute inset-0"
        style={{
          maskImage:
            "radial-gradient(120% 90% at 50% 5%, rgba(0,0,0,0.75) 10%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.15) 65%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "radial-gradient(120% 90% at 50% 5%, rgba(0,0,0,0.75) 10%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.15) 65%, rgba(0,0,0,0) 100%)",
          background: "transparent",
        }}
      />
    </div>
  );
}

/** 🎨 섀도우 컬러 틴트 */
const SHADOW_TINT: Record<string, string> = {
  sky: "rgba(14,165,233,0.26)",
  blue: "rgba(59,130,246,0.26)",
  indigo: "rgba(99,102,241,0.26)",
  violet: "rgba(139,92,246,0.26)",
  purple: "rgba(168,85,247,0.26)",
  fuchsia: "rgba(217,70,239,0.26)",
  pink: "rgba(236,72,153,0.26)",
  rose: "rgba(244,63,94,0.26)",
  red: "rgba(239,68,68,0.26)",
  orange: "rgba(249,115,22,0.26)",
  amber: "rgba(245,158,11,0.26)",
  yellow: "rgba(234,179,8,0.26)",
  lime: "rgba(132,204,22,0.26)",
  green: "rgba(34,197,94,0.26)",
  emerald: "rgba(16,185,129,0.26)",
  teal: "rgba(20,184,166,0.26)",
  cyan: "rgba(6,182,212,0.26)",
  slate: "rgba(100,116,139,0.22)",
  neutral: "rgba(120,120,120,0.22)",
  stone: "rgba(120,113,108,0.22)",
  zinc: "rgba(113,113,122,0.22)",
  gray: "rgba(107,114,128,0.22)",
};

function pickBorderClass(toneCard: string) {
  return (
    toneCard.split(" ").find((k) => k.startsWith("border-")) ||
    "border-slate-200"
  );
}
function inferColorFromBorderClass(borderClass: string) {
  const m = borderClass.match(/^border-([a-z]+)-/);
  return m?.[1] ?? "slate";
}

/** 🌐 '전체보기' 메타(이모지/설명/톤) */
const ALL_KEY = "전체" as const;
const ALL_META = {
  emoji: "👀",
  desc: "모든 버킷리스트를 한눈에 확인해요.",
  softBg: "bg-neutral-50",
  ring: "ring-neutral-300/70",
};

export default function BucketListPage() {
  const { couple } = useCoupleContext();
  const { user } = useUser();
  const coupleId = couple?.id!;
  const myUserId = user?.id!;

  const { items, loading, filters, setFilters, add, patch, remove } =
    useBucketList({ coupleId, myUserId });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BucketItem | null>(null);

  /** ✅ 상태/작성자 필터 미사용 → 항상 전체 노출 */
  useEffect(() => {
    setFilters((f: any) => {
      const next = { ...f };
      if ("status" in next) next.status = undefined;
      if ("author" in next) next.author = undefined; // 작성자 구분 제거
      return next;
    });
  }, [setFilters]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const onCreate = async (payload: {
    title: string;
    content?: string | null;
    link_url?: string | null;
    category?: BucketCategory | null;
    due_date?: string | null;
  }) => {
    try {
      // DB 스키마 호환 위해 author_id는 저장하되 UI/필터에선 사용 안 함
      await add({
        couple_id: coupleId,
        author_id: myUserId,
        title: payload.title,
        content: payload.content ?? null,
        link_url: payload.link_url ?? null,
        category: (payload.category as any) ?? null,
        due_date: payload.due_date ?? null,
      });
      toast.success("버킷이 추가되었어요!");
    } catch (e: any) {
      toast.error(e?.message ?? "추가 실패");
    }
  };

  const onEdit = async (payload: {
    title: string;
    content?: string | null;
    link_url?: string | null;
    category?: BucketCategory | null;
    due_date?: string | null;
  }) => {
    if (!editing) return;
    try {
      await patch(editing.id, {
        title: payload.title,
        content: payload.content ?? null,
        link_url: payload.link_url ?? null,
        category: (payload.category as any) ?? null,
        due_date: payload.due_date ?? null,
      });
      toast.success("수정 완료!");
    } catch (e: any) {
      toast.error(e?.message ?? "수정 실패");
    }
  };

  const toggleComplete = async (id: number, next: boolean) => {
    try {
      await patch(id, {
        completed: next,
        completed_at: next ? new Date().toISOString() : null,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "상태 변경 실패");
    }
  };

  const onDelete = async (id: number) => {
    try {
      await remove(id);
      toast.success("삭제 완료");
    } catch (e: any) {
      toast.error(e?.message ?? "삭제 실패");
    }
  };

  // 선택된 카테고리 테마(전체는 null)
  const theme = useMemo(() => {
    if (filters.category === ALL_KEY) return null;
    const meta = CATEGORY_META[filters.category as BucketCategory];
    return toneClasses(meta.tone);
  }, [filters.category]);

  const selectedEmoji =
    filters.category === ALL_KEY
      ? ALL_META.emoji
      : CATEGORY_META[filters.category as BucketCategory].emoji;

  const basePastel = (softBg?: string) => cn(softBg ?? "bg-slate-50");

  /** 🎯 우측 섹션 섀도우 */
  const sectionShadowStyle = useMemo<React.CSSProperties>(() => {
    if (!theme) {
      // 전체보기(중립)
      return {
        boxShadow:
          "0 18px 48px -24px rgba(0,0,0,0.18), 0 12px 36px -20px rgba(120,120,120,0.22)",
      };
    }
    const borderClass = pickBorderClass(theme.card);
    const token = inferColorFromBorderClass(borderClass);
    const tint = SHADOW_TINT[token] ?? SHADOW_TINT.slate;
    return {
      boxShadow: `0 18px 48px -24px rgba(0,0,0,0.18),
                  0 12px 36px -20px ${tint}`,
    };
  }, [theme]);

  /** 🧾 헤더용 메타 */
  const selectedMeta =
    filters.category === ALL_KEY
      ? {
          emoji: ALL_META.emoji,
          title: "전체보기",
          desc: ALL_META.desc,
          softBg: ALL_META.softBg,
        }
      : {
          emoji: CATEGORY_META[filters.category as BucketCategory].emoji,
          title: String(filters.category),
          desc: CATEGORY_META[filters.category as BucketCategory].desc,
          softBg: theme?.softBg ?? "bg-slate-50",
        };

  /** 🔘 좌측 필터 버튼: '전체보기'도 동일 디자인(👀) */
  const filterKeys = [ALL_KEY, ...CATEGORY_ORDER] as const;

  return (
    <div className="w-full px-2 sm:px-4 py-4">
      {/* 상단 바: 추가 버튼만 */}
      <div className="mb-4 flex items-center justify-end w-full">
        <Button onClick={openCreate} className="gap-1">
          <Plus className="w-4 h-4" />
          추가
        </Button>
      </div>

      {/* 좌-우 레이아웃 */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-4 w-full">
        <LayoutGroup>
          {/* 좌측: 유형 네비 */}
          <aside className="w-full">
            <div className="sticky top[76px] md:top-[76px] space-y-2 min-h-[72vh]">
              {filterKeys.map((key) => {
                const isAll = key === ALL_KEY;
                const active = filters.category === key;
                const meta = isAll
                  ? { emoji: ALL_META.emoji }
                  : CATEGORY_META[key as BucketCategory];
                const tone = isAll ? null : toneClasses(meta.tone as any);
                const softBg = isAll ? ALL_META.softBg : tone?.softBg;

                return (
                  <button
                    key={key as string}
                    onClick={() =>
                      setFilters((f: any) => ({ ...f, category: key }))
                    }
                    className={cn(
                      "group w-full text-left rounded-xl px-3 py-2 transition",
                      basePastel(softBg),
                      "text-slate-800",
                      active
                        ? cn(
                            isAll ? ALL_META.ring : tone?.ring,
                            "ring-2 shadow-sm -translate-y-[1px] bg-white"
                          )
                        : cn(
                            "hover:shadow-sm hover:-translate-y-[1px]",
                            "focus-visible:outline-none focus-visible:ring-2",
                            isAll ? ALL_META.ring : tone?.ring
                          ),
                      "active:scale-[0.98]"
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="text-lg group-hover:scale-110 transition-transform">
                        {isAll ? ALL_META.emoji : meta.emoji}
                      </span>
                      <span className="font-medium">
                        {isAll ? "전체보기" : (key as string)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* 우측: 섹션 (보더 제거, 섀도우) */}
          <section
            className={cn(
              "relative w-full rounded-2xl bg-white p-3 sm:p-4 overflow-hidden",
              "min-h-[72vh]"
            )}
            style={sectionShadowStyle}
          >
            {/* 상단 헤더: 선택 카테고리 or 전체보기 */}
            {selectedMeta && (
              <div
                className={cn(
                  "mb-3 sm:mb-4 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5",
                  basePastel(selectedMeta.softBg),
                  "backdrop-blur-[1px]",
                  "min-h-[56px] flex items-center"
                )}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xl">{selectedMeta.emoji}</span>
                  <span className="font-semibold">{selectedMeta.title}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {selectedMeta.desc}
                  </span>
                </div>
              </div>
            )}

            {/* 배경 이모지 워터마크 (전체보기는 제외) */}
            {filters.category !== ALL_KEY && selectedEmoji && (
              <EmojiBackdrop
                emoji={selectedEmoji}
                toneClass={theme?.softBg ?? ""}
              />
            )}

            {/* 내부 스크롤 영역 */}
            <div
              className="relative z-10 overflow-y-auto overscroll-contain pt-1 pb-2 pr-1
                            [scrollbar-width:thin] [scrollbar-gutter:stable_both-sides]
                            h-[calc(72vh-82px)] sm:h-[calc(72vh-90px)]"
            >
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-h-[420px]">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[220px] sm:h-[240px] animate-pulse rounded-xl bg-slate-100"
                    />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="min-h-[420px] rounded-xl grid place-content-center text-center">
                  <div className="space-y-2">
                    <div className="text-5xl opacity-30">
                      {selectedEmoji ?? "🌱"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      조건에 해당하는 버킷이 없어요.
                    </p>
                    <Button
                      onClick={openCreate}
                      size="sm"
                      variant="outline"
                      className="mt-2"
                    >
                      새 버킷 추가
                    </Button>
                  </div>
                </div>
              ) : (
                <motion.div
                  layout
                  className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full"
                >
                  <AnimatePresence initial={false} mode="sync">
                    {items.map((it) => (
                      <motion.div
                        key={it.id}
                        layout
                        className="rounded-xl h-[220px] sm:h-[240px] overflow-hidden"
                      >
                        <BucketItemCard
                          item={it}
                          onToggleComplete={toggleComplete}
                          onEdit={(item) => {
                            setEditing(item);
                            setFormOpen(true);
                          }}
                          onDelete={onDelete}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </section>
        </LayoutGroup>
      </div>

      {/* 추가/수정 다이얼로그 */}
      <BucketFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing ?? undefined}
        onSubmit={editing ? onEdit : onCreate}
      />
    </div>
  );
}
