// src/features/memories/FragmentListPage.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { cn } from "@/lib/utils";

import { listFragments } from "./api";
import { publicUrl } from "./storage";
import type { Fragment } from "./types";

type FragmentWithMemo = Fragment & { memo?: string | null };

const IMAGE_CLASS =
  "aspect-[4/3] w-full overflow-hidden rounded-md bg-muted";

export default function FragmentListPage() {
  const nav = useNavigate();
  const { couple } = useCoupleContext();

  const [items, setItems] = useState<FragmentWithMemo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!couple?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const rows = await listFragments(couple.id, 1000, 0);
        if (alive) setItems(rows as FragmentWithMemo[]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [couple?.id]);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
      ),
    [items],
  );

  const groups = useMemo(() => groupByYearMonth(sorted), [sorted]);
  const months = useMemo(
    () =>
      groups.map((group) => ({
        ym: group.ym,
        id: ymToId(group.ym),
        count: group.rows.length,
        label: monthLabel(group.ym),
      })),
    [groups],
  );

  return (
    <main className="min-h-[100dvh] bg-background pb-20 md:pb-0">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:pr-[280px]">
        <PageHeader
          onCreate={() => nav("/memories/new")}
          count={sorted.length}
        />

        {loading ? (
          <LoadingState />
        ) : sorted.length === 0 ? (
          <EmptyState onCreate={() => nav("/memories/new")} />
        ) : (
          <ListByMonth
            groups={groups}
            onOpen={(id) => nav(`/memories/${id}`)}
          />
        )}
      </div>

      <MonthNavigator
        months={months}
        show={!loading && sorted.length > 0}
        onCreate={() => nav("/memories/new")}
      />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto max-w-7xl">
          <Button
            type="button"
            className="h-11 w-full gap-2"
            onClick={() => nav("/memories/new")}
          >
            <Plus className="size-4" />
            추가하기
          </Button>
        </div>
      </div>
    </main>
  );
}

function PageHeader({
  onCreate,
  count,
}: {
  onCreate: () => void;
  count: number;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl">추억 조각</CardTitle>
              <Badge variant="secondary">{count.toLocaleString("ko-KR")}</Badge>
            </div>
            <CardDescription>
              사진과 메모를 날짜순 리스트로 모아보는 공간입니다.
            </CardDescription>
          </div>

          <Button onClick={onCreate} className="w-fit gap-2">
            <Plus className="size-4" />
            추가
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

function ListByMonth({
  groups,
  onOpen,
}: {
  groups: { ym: string; rows: FragmentWithMemo[] }[];
  onOpen: (id: Fragment["id"]) => void;
}) {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.ym} id={ymToId(group.ym)} className="scroll-mt-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{monthTitle(group.ym)}</h2>
              <p className="text-sm text-muted-foreground">
                {group.rows.length.toLocaleString("ko-KR")}개의 추억
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.rows.map((fragment) => (
              <FragmentCard
                key={fragment.id}
                fragment={fragment}
                onOpen={() => onOpen(fragment.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FragmentCard({
  fragment,
  onOpen,
}: {
  fragment: FragmentWithMemo;
  onOpen: () => void;
}) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          IMAGE_CLASS,
          "rounded-b-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        aria-label={`${fragment.title || "추억"} 상세 보기`}
      >
        <FragmentImage fragment={fragment} />
      </button>
      <CardContent className="space-y-2 p-4">
        <div className="text-xs text-muted-foreground">
          {formatDate(fragment.event_date)}
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="block w-full truncate text-left font-medium hover:underline"
        >
          {fragment.title || "제목 없음"}
        </button>
        {fragment.memo?.trim() && (
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {fragment.memo}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FragmentImage({ fragment }: { fragment: FragmentWithMemo }) {
  const src = fragment.cover_photo_path
    ? publicUrl(fragment.cover_photo_path)
    : null;

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        사진 없음
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={fragment.title || ""}
      className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
      loading="lazy"
      decoding="async"
      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
    />
  );
}

function MonthNavigator({
  months,
  show,
  onCreate,
}: {
  months: { ym: string; id: string; label: string; count: number }[];
  show: boolean;
  onCreate: () => void;
}) {
  const [active, setActive] = useState<string | null>(months[0]?.id ?? null);
  const [collapsed, setCollapsed] = useState(false);
  const ids = useMemo(() => months.map((m) => m.id), [months]);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActive(ids[0] ?? null);
  }, [ids]);

  useEffect(() => {
    if (!show || ids.length === 0) return;

    const syncActive = () => {
      const anchor = window.innerHeight * 0.28;
      let candidate = ids[0];
      let bestTop = -Infinity;

      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        if (top <= anchor && top > bestTop) {
          candidate = id;
          bestTop = top;
        }
      });

      setActive(candidate);
    };

    syncActive();
    window.addEventListener("scroll", syncActive, { passive: true });
    window.addEventListener("resize", syncActive);
    return () => {
      window.removeEventListener("scroll", syncActive);
      window.removeEventListener("resize", syncActive);
    };
  }, [ids, show]);

  useEffect(() => {
    if (!active || !listRef.current) return;
    listRef.current
      .querySelector<HTMLButtonElement>(`[data-month-id="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (!show) return null;

  const activeMonth = months.find((month) => month.id === active);

  if (collapsed) {
    return (
      <aside className="hidden lg:block fixed right-6 top-1/2 z-40 -translate-y-1/2">
        <Button
          type="button"
          variant="outline"
          className="h-auto w-[72px] flex-col gap-1 rounded-xl bg-background p-3 shadow-lg"
          onClick={() => setCollapsed(false)}
          aria-label="월별 이동 펼치기"
        >
          <ChevronLeft className="size-4" />
          <span className="text-xs font-medium">월별</span>
          {activeMonth && (
            <span className="text-xs text-muted-foreground">
              {activeMonth.label}
            </span>
          )}
        </Button>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:block fixed right-6 top-1/2 z-40 w-[220px] -translate-y-1/2">
      <Card className="shadow-lg">
        <CardHeader className="space-y-1 p-4">
          <CardTitle className="text-base">월별 이동</CardTitle>
          <CardDescription>리스트의 월별 구간으로 이동합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <Button className="w-full gap-2" onClick={onCreate}>
            <Plus className="size-4" />
            추가
          </Button>
          <Separator />
          <ScrollArea className="h-[min(54vh,520px)] pr-3">
            <div ref={listRef} className="space-y-1">
              {months.map((month) => {
                const isActive = active === month.id;
                return (
                  <button
                    key={month.id}
                    data-month-id={month.id}
                    type="button"
                    onClick={() => scrollTo(month.id)}
                    aria-current={isActive ? "date" : undefined}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span>{month.label}</span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-xs",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {month.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setCollapsed(true)}
            aria-label="월별 이동 접기"
          >
            <ChevronRight className="size-4" />
            접기
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="mx-auto max-w-xl shadow-sm">
      <CardHeader className="text-center">
        <CardTitle>아직 추억 조각이 없습니다</CardTitle>
        <CardDescription>
          첫 사진과 날짜를 추가해서 추억 리스트를 시작해보세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button onClick={onCreate} className="gap-2">
          <Plus className="size-4" />
          첫 추억 추가
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="overflow-hidden shadow-sm">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function groupByYearMonth(rows: FragmentWithMemo[]) {
  const map = new Map<string, FragmentWithMemo[]>();
  rows.forEach((row) => {
    const key = formatYearMonth(row.event_date);
    map.set(key, [...(map.get(key) ?? []), row]);
  });
  return Array.from(map.entries()).map(([ym, groupRows]) => ({
    ym,
    rows: groupRows,
  }));
}

function formatYearMonth(value: string | number | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 없음";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthTitle(ym: string) {
  const [year, month] = ym.split("-");
  if (!year || !month) return ym;
  return `${year}년 ${Number(month)}월`;
}

function monthLabel(ym: string) {
  const [, month] = ym.split("-");
  return month ? `${Number(month)}월` : ym;
}

function ymToId(ym: string) {
  return `mem-${ym.replace(/[^0-9a-zA-Z_-]/g, "-")}`;
}

function formatDate(value: string | number | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
