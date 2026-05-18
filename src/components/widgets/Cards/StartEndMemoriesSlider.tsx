// src/components/widgets/Cards/StartEndMemoriesSlider.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { listFragments } from "@/features/memories/api";
import { publicUrl } from "@/features/memories/storage";
import { cn } from "@/lib/utils";

type MemoryItem = {
  id: string;
  title: string;
  date: string;
  imageUrl: string | null;
};

export default function StartEndMemoriesSlider({
  className,
}: {
  className?: string;
}) {
  const nav = useNavigate();
  const { couple } = useCoupleContext();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadMemories() {
      if (!couple?.id) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const rows = await listFragments(couple.id, 1000, 0);
        if (!alive) return;

        const nextItems = [...rows]
          .sort(
            (a, b) =>
              new Date(a.event_date).getTime() -
              new Date(b.event_date).getTime(),
          )
          .map((fragment) => ({
            id: fragment.id,
            title: fragment.title || "제목 없는 기억",
            date: formatDate(fragment.event_date),
            imageUrl: fragment.cover_photo_path
              ? publicUrl(fragment.cover_photo_path)
              : null,
          }));

        setItems(nextItems);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadMemories();
    return () => {
      alive = false;
    };
  }, [couple?.id]);

  const itemIds = useMemo(() => items.map((item) => item.id).join("|"), [items]);

  useEffect(() => {
    setIndex(0);
  }, [itemIds]);

  useEffect(() => {
    if (paused || items.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  const current = items[index] ?? null;

  if (loading) {
    return (
      <Card className={cn("overflow-hidden rounded-xl shadow-sm", className)}>
        <Skeleton className="h-full min-h-[420px] w-full rounded-none" />
      </Card>
    );
  }

  if (!current) {
    return (
      <Card className={cn("rounded-xl p-6 text-center shadow-sm", className)}>
        <div className="text-sm font-medium">아직 기억이 없습니다</div>
        <p className="mt-1 text-sm text-muted-foreground">
          사진과 날짜를 추가해서 첫 기억을 남겨보세요.
        </p>
        <Button className="mt-4 gap-2" size="sm" onClick={() => nav("/memories/new")}>
          <Plus className="size-4" />
          추가하기
        </Button>
      </Card>
    );
  }

  return (
    <Card
      className={cn("group overflow-hidden rounded-xl shadow-sm", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-label="우리의 최근 기억"
    >
      <div className="relative h-full min-h-[420px] w-full overflow-hidden bg-muted">
        {items.map((item, itemIndex) => (
          <MemorySlide
            key={item.id}
            item={item}
            active={itemIndex === index}
          />
        ))}

        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-5 text-white">
          <div className="flex items-center gap-2 text-xs text-white/80">
            <CalendarDays className="size-3.5" />
            {current.date}
          </div>
          <h2 className="mt-2 line-clamp-2 text-xl font-semibold leading-tight">
            {current.title}
          </h2>
        </div>

        {items.length > 1 && (
          <div className="absolute right-4 top-4 z-10 rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            {index + 1}/{items.length}
          </div>
        )}
      </div>
    </Card>
  );
}

function MemorySlide({
  item,
  active,
}: {
  item: MemoryItem;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 transition-opacity duration-500",
        active ? "opacity-100" : "opacity-0",
      )}
      aria-hidden={!active}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
          사진 없음
        </div>
      )}
    </div>
  );
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
