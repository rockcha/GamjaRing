// src/features/memories/FragmentListPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { listFragments } from "./api";
import type { Fragment } from "./types";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { publicUrl } from "./storage";
import { CalendarDays, Plus, Search } from "lucide-react"; // Heart 제거

type ViewKey = "grid" | "timeline";

export default function FragmentListPage() {
  const nav = useNavigate();
  const { couple } = useCoupleContext();

  const [items, setItems] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [view, setView] = useState<ViewKey>(
    () => (localStorage.getItem("mem:view") as ViewKey) || "grid"
  );

  // 초기 로드
  useEffect(() => {
    let alive = true;
    async function run() {
      if (!couple?.id) return;
      try {
        setLoading(true);
        const res = await listFragments(couple.id, 1000, 0);
        if (alive) setItems(res);
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [couple?.id]);

  // 검색 + 오래된 날짜순 정렬(고정)
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    let arr = items;
    if (kw) {
      arr = arr.filter((f) => {
        const t = (f.title ?? "").toLowerCase();
        const note =
          typeof (f as any).description === "string"
            ? ((f as any).description as string).toLowerCase()
            : "";
        return t.includes(kw) || note.includes(kw);
      });
    }
    return [...arr].sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }, [items, q]);

  useEffect(() => {
    localStorage.setItem("mem:view", view);
  }, [view]);

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-5">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-10 backdrop-blur py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {items.length}개의 추억 조각들이 있어요
            </h1>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="제목·메모 검색…"
                className="pl-9 w-[260px] bg-white"
              />
            </div>

            {/* 🔥 더 가시적인 세그먼트형 탭 */}
            <Tabs
              value={view}
              onValueChange={(v) => setView(v as ViewKey)}
              className="w-fit"
            >
              <TabsList
                className="
                  h-10 rounded-full bg-muted/60 p-1 shadow-sm
                  ring-1 ring-border
                "
              >
                <TabsTrigger
                  value="grid"
                  className="
                    data-[state=active]:bg-background data-[state=active]:shadow
                    data-[state=active]:text-foreground
                    rounded-full px-4 text-[13px] font-semibold
                  "
                >
                  📌 리스트
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="
                    data-[state=active]:bg-background data-[state=active]:shadow
                    data-[state=active]:text-foreground
                    rounded-full px-4 text-[13px] font-semibold
                  "
                >
                  🕘 타임라인
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button onClick={() => nav("/memories/new")} className="gap-2">
              <Plus className="size-4" /> 추억 조각 추가
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <EmptyState onCreate={() => nav("/memories/new")} />
      ) : (
        <Tabs value={view} onValueChange={(v) => setView(v as ViewKey)}>
          <TabsContent value="grid" className="m-0">
            <GridView
              items={filtered}
              onOpen={(id) => nav(`/memories/${id}`)}
            />
          </TabsContent>
          <TabsContent value="timeline" className="m-0">
            <TimelineView
              items={filtered}
              onOpen={(id) => nav(`/memories/${id}`)}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ---------------------------
 * Grid View
 * - 제목: 이미지 아래 흰 영역, 1줄
 * - 날짜: 이미지 좌상단 오버레이
 * - 하트: ❤️ 이모지 + 우측 상단 고정
 * --------------------------*/
function GridView({
  items,
  onOpen,
}: {
  items: Fragment[];
  onOpen: (id: string | number) => void;
}) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
      {items.map((f) => (
        <Card
          key={f.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(f.id)}
          onKeyDown={(e) => e.key === "Enter" && onOpen(f.id)}
          className="group overflow-hidden transition hover:shadow-lg hover:ring-1 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {/* Cover */}
          <div className="relative">
            {f.cover_photo_path ? (
              <img
                src={publicUrl(f.cover_photo_path)}
                alt={f.title}
                className="w-full aspect-[16/10] object-cover"
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
            ) : (
              <div className="w-full aspect-[16/10] bg-muted" />
            )}

            {/* 날짜: 좌상단 */}
            <div
              className="
                absolute left-2 top-2 inline-flex items-center gap-1
                rounded-full bg-black/55 px-2 py-1 text-xs text-white
                backdrop-blur supports-[backdrop-filter]:bg-black/45
              "
              title={formatDate(f.event_date)}
            >
              <CalendarDays className="size-3.5" />
              <span className="tabular-nums">{formatDate(f.event_date)}</span>
            </div>

            {/* ❤️ 하트: 우측 상단 고정 */}
            <div
              className="
                absolute right-2 top-2 inline-flex items-center gap-1
                rounded-full bg-black/60 px-2 py-1 text-xs text-white
                backdrop-blur supports-[backdrop-filter]:bg-black/45
              "
              aria-label="하트 수"
              title={`하트 ${f.hearts ?? 0}개`}
            >
              <span aria-hidden>❤️</span>
              <span className="tabular-nums">{f.hearts ?? 0}</span>
            </div>
          </div>

          {/* Body: 제목만(1줄) */}
          <div className="p-3 bg-background">
            <div
              className="
                text-[15px] font-semibold leading-snug
                line-clamp-1
              "
              title={f.title ?? ""}
            >
              {f.title}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------------------
 * Timeline View
 * - 제목: 이미지 아래 흰 영역, **조금 더 큰 폰트**
 * - 날짜: 이미지 좌상단 오버레이
 * - 하트: ❤️ 이모지 + 우측 상단 고정
 * --------------------------*/
function TimelineView({
  items,
  onOpen,
}: {
  items: Fragment[];
  onOpen: (id: string | number) => void;
}) {
  const groups = useMemo(() => groupByYearMonth(items), [items]);

  return (
    <div className="space-y-8">
      {groups.map(({ ym, rows }) => (
        <section key={ym} className="relative">
          {/* Year-Month header */}
          <div className="mb-4 text-lg font-semibold">{ym}</div>

          {/* 타임라인 레일 (노드 점 없음) */}
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-[2px] bg-muted" />

            <div className="space-y-6">
              {rows.map((f) => (
                <div key={f.id} className="relative">
                  <Card
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpen(f.id)}
                    onKeyDown={(e) => e.key === "Enter" && onOpen(f.id)}
                    className="group overflow-hidden transition hover:shadow-lg hover:ring-1 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ml-2"
                  >
                    <div className="relative">
                      {f.cover_photo_path ? (
                        <img
                          src={publicUrl(f.cover_photo_path)}
                          alt={f.title}
                          className="w-full aspect-[16/9] object-cover"
                          loading="lazy"
                          decoding="async"
                          fetchPriority="low"
                        />
                      ) : (
                        <div className="w-full aspect-[16/9] bg-muted" />
                      )}

                      {/* 날짜: 좌상단 */}
                      <div
                        className="
                          absolute left-2 top-2 inline-flex items-center gap-1
                          rounded-full bg-black/55 px-2 py-1 text-xs text-white
                          backdrop-blur supports-[backdrop-filter]:bg-black/45
                        "
                        title={formatDate(f.event_date)}
                      >
                        <CalendarDays className="size-3.5" />
                        <span className="tabular-nums">
                          {formatDate(f.event_date)}
                        </span>
                      </div>

                      {/* ❤️ 하트: 우측 상단 고정 */}
                      <div
                        className="
                          absolute right-2 top-2 inline-flex items-center gap-1
                          rounded-full bg-black/60 px-2 py-1 text-xs text-white
                          backdrop-blur supports-[backdrop-filter]:bg-black/45
                        "
                        aria-label="하트 수"
                        title={`하트 ${f.hearts ?? 0}개`}
                      >
                        <span aria-hidden>❤️</span>
                        <span className="tabular-nums">{f.hearts ?? 0}</span>
                      </div>
                    </div>

                    {/* Body: 제목만(타임라인은 폰트 조금 크게) */}
                    <div className="p-3 bg-background">
                      <div
                        className="
                          text-[16px] md:text-[17px] font-semibold leading-snug
                          line-clamp-2
                        "
                        title={f.title ?? ""}
                      >
                        {f.title}
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

/* ----- Helpers ----- */
function formatDate(d: string | number | Date) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function groupByYearMonth(rows: Fragment[]) {
  // event_date 오름차순 가정(이미 오래된 순 정렬)
  const fmt = (d: string | number | Date) => {
    const dd = new Date(d);
    const y = dd.getFullYear();
    const m = dd.getMonth() + 1;
    return `${y}년 ${m.toString().padStart(2, "0")}월`;
  };
  const map = new Map<string, Fragment[]>();
  rows.forEach((r) => {
    const key = fmt(r.event_date);
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  });
  return Array.from(map.entries()).map(([ym, rows]) => ({ ym, rows }));
}

/* ----- Empty & Skeleton ----- */
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto mb-3 size-14 rounded-full bg-muted" />
      <h2 className="text-lg font-semibold">아직 등록된 추억 조각이 없어요</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        대표 사진과 제목을 넣어 두 분의 기억을 모아보세요.
      </p>
      <Button onClick={onCreate} className="mt-4">
        첫 추억 조각 만들기
      </Button>
    </Card>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="w-full aspect-[16/10] animate-pulse bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </Card>
      ))}
    </div>
  );
}
