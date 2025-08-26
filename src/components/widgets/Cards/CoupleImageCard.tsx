// src/features/couple/CoupleImageCard.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

import { Pencil, Loader2, Trash2, ImageUp } from "lucide-react";
import { cn } from "@/lib/utils";

const BUCKET = "Couple_Image";
const MAX_SLOTS = 5;

// 원하는 비율 (가로:세로). 작은 화면에서 보기 좋았던 비율을 그대로 유지하려면 여기만 바꾸면 됩니다.
const ASPECT_RATIO = "3 / 2"; // 3:2 권장 (원하면 "4 / 3", "16 / 10", "16 / 9" 등으로 변경)

type Slot = {
  url: string | null;
  path: string | null;
  uploading: boolean;
  deleting: boolean;
};

const emptySlot = (): Slot => ({
  url: null,
  path: null,
  uploading: false,
  deleting: false,
});

type Props = {
  className?: string;
  /**
   * 기준 최소 높이. 숫자(px) 또는 문자열 가능.
   * 예: 420, "420px". 기본 480.
   * 실제 높이는 비율을 기준으로 가로폭에 맞춰 커지되,
   * min 360px / max 550px 범위를 지키도록 합니다.
   */
  imageHeight?: number | string;
};

export default function CoupleImageCard({
  className,
  imageHeight = 480,
}: Props) {
  const { user, isCoupled } = useUser();
  const { couple } = useCoupleContext();
  const coupleId = useMemo(
    () => couple?.id ?? user?.partner_id ?? null,
    [couple?.id, user?.partner_id]
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingTargetIndex = useRef<number | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>(() =>
    Array.from({ length: MAX_SLOTS }, emptySlot)
  );
  const [error, setError] = useState<string | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);

  const isDisabled = !user?.id || !isCoupled;

  // ===== Helpers =====
  const inRange = (i: number) => i >= 0 && i < MAX_SLOTS;
  const updateSlot = (i: number, updater: (prev: Slot) => Slot) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? updater(s) : s)));
  const buildSlotPath = (cid: string, i: number, ext: string) =>
    `${cid}/slot-${i}.${ext}`;
  const signUrl = async (path: string) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);
    if (error) throw error;
    return data!.signedUrl;
  };

  // ===== Load existing =====
  const loadExisting = useCallback(async () => {
    if (!coupleId || !isCoupled) {
      setSlots(Array.from({ length: MAX_SLOTS }, emptySlot));
      setInitialLoading(false);
      return;
    }
    try {
      setError(null);

      const { data: files, error: listErr } = await supabase.storage
        .from(BUCKET)
        .list(`${coupleId}`, { limit: 100 });
      if (listErr) throw listErr;

      const next: Slot[] = Array.from({ length: MAX_SLOTS }, emptySlot);

      // slot-i.* 우선 매핑
      const leftOver: string[] = [];
      for (const f of files ?? []) {
        const m = f.name.match(/^slot-(\d)\.(png|jpe?g|webp|gif|bmp|avif)$/i);
        if (m) {
          const idx = Number(m[1]);
          if (idx >= 0 && idx < next.length) {
            next[idx]!.path = `${coupleId}/${f.name}`;
          } else {
            leftOver.push(f.name);
          }
        } else {
          leftOver.push(f.name);
        }
      }

      // 남은 파일을 빈 슬롯에 순차 배치
      for (const name of leftOver) {
        const emptyIdx = next.findIndex((s) => !s.path);
        if (emptyIdx === -1) break;
        next[emptyIdx]!.path = `${coupleId}/${name}`;
      }

      // 서명 URL 생성
      const signed = await Promise.all(
        next.map(async (s) => {
          if (!s.path) return { ...s };
          try {
            const url = await signUrl(s.path);
            return { ...s, url };
          } catch {
            return { ...s, url: null, path: null };
          }
        })
      );

      setSlots(signed);
    } catch (e: any) {
      setError(e?.message ?? "이미지를 불러오는 중 오류가 발생했어요.");
      setSlots(Array.from({ length: MAX_SLOTS }, emptySlot));
    } finally {
      setInitialLoading(false);
    }
  }, [coupleId, isCoupled]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  // ===== Upload / Delete =====
  const openPickerFor = (idx: number) => {
    if (isDisabled || !inRange(idx)) return;
    pendingTargetIndex.current = idx;
    fileInputRef.current?.click();
  };

  const handleChangeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    const idx = pendingTargetIndex.current;
    pendingTargetIndex.current = null;
    if (!file || !inRange(idx ?? -1) || !coupleId || !isCoupled) return;

    const index = idx as number;
    const cid = coupleId as string;

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const uploadPath = buildSlotPath(cid, index, ext);

    const tempURL = URL.createObjectURL(file);
    updateSlot(index, (prev) => ({ ...prev, url: tempURL, uploading: true }));

    try {
      const { data: listing } = await supabase.storage
        .from(BUCKET)
        .list(`${cid}`);
      const toRemove = (listing ?? [])
        .filter((x) => x.name.startsWith(`slot-${index}.`))
        .map((x) => `${cid}/${x.name}`);
      if (toRemove.length) {
        await supabase.storage.from(BUCKET).remove(toRemove);
      }

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(uploadPath, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file.type,
        });
      if (upErr) throw upErr;

      const signed = await signUrl(uploadPath);
      updateSlot(index, (_) => ({
        url: signed,
        path: uploadPath,
        uploading: false,
        deleting: false,
      }));
    } catch (e: any) {
      updateSlot(index, (prev) => ({ ...prev, uploading: false }));
      setError(e?.message ?? "이미지를 업로드하는 중 오류가 발생했어요.");
    } finally {
      URL.revokeObjectURL(tempURL);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (idx: number) => {
    if (!inRange(idx) || isDisabled) return;
    const s = slots[idx];
    if (!s || !s.path) return;

    const ok = window.confirm("이미지를 삭제할까요?");
    if (!ok) return;

    updateSlot(idx, (prev) => ({ ...prev, deleting: true }));
    try {
      const { error: delErr } = await supabase.storage
        .from(BUCKET)
        .remove([s.path]);
      if (delErr) throw delErr;
      updateSlot(idx, (_) => ({ ...emptySlot() }));
    } catch (e: any) {
      updateSlot(idx, (prev) => ({ ...prev, deleting: false }));
      setError(e?.message ?? "이미지를 삭제하는 중 오류가 발생했어요.");
    }
  };

  // ===== Autoplay (5s, loop) =====
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);

  const imageCount = useMemo(
    () => slots.filter((s) => !!s.url).length,
    [slots]
  );

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = useCallback(() => {
    clearTimer();
    if (!carouselApi) return;
    if (imageCount < 2) return;
    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      carouselApi.scrollNext(); // loop:true 로 자연 순환
    }, 4500);
  }, [carouselApi, imageCount]);

  const pause = () => {
    isPausedRef.current = true;
    clearTimer();
  };
  const resume = () => {
    isPausedRef.current = false;
    startTimer();
  };

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [startTimer]);

  useEffect(() => {
    const handler = () => {
      if (document.hidden) pause();
      else resume();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // ===== Size (aspect-ratio + min/max height) =====
  const minH =
    typeof imageHeight === "number" ? Math.max(360, imageHeight) : 360; // 숫자만 최소 보정. 문자열("420px")은 별도 처리X
  const ratioBoxStyle: React.CSSProperties = {
    aspectRatio: ASPECT_RATIO, // <- 핵심: 가로세로 비율 유지
    width: "100%",
    // 높이는 비율로 계산되지만 아래 제약으로 너무 작거나 크지 않게
    minHeight: `${minH}px`,
    maxHeight: "550px",
  };

  return (
    <Card className={cn("bg-white", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#3d2b1f] text-xl">
            📸 우리의 모습
          </CardTitle>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChangeFile}
          disabled={isDisabled}
        />

        {initialLoading ? (
          <div className="space-y-2">
            <div className="rounded-lg w-full" style={ratioBoxStyle}>
              <Skeleton className="w-full h-full rounded-lg" />
            </div>
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        ) : (
          <div
            className="relative"
            onMouseEnter={pause}
            onMouseLeave={resume}
            onFocusCapture={pause}
            onBlurCapture={resume}
          >
            <Carousel
              setApi={setCarouselApi}
              className="w-full"
              opts={{ loop: true }}
            >
              <CarouselContent>
                {slots.map((s, idx) => {
                  const hasImg = !!s.url;
                  return (
                    <CarouselItem key={idx}>
                      <div>
                        <Card className="overflow-hidden">
                          {/* 비율 박스 */}
                          <div
                            className="relative w-full"
                            style={ratioBoxStyle}
                          >
                            {hasImg ? (
                              <img
                                src={s.url!}
                                alt={`커플 이미지 ${idx + 1}`}
                                className="w-full h-full object-cover"
                                draggable={false}
                              />
                            ) : (
                              <button
                                type="button"
                                disabled={isDisabled || s.uploading}
                                onClick={() => openPickerFor(idx)}
                                className={cn(
                                  "w-full h-full flex flex-col items-center justify-center gap-2",
                                  "border-2 border-dashed rounded-md",
                                  isDisabled
                                    ? "cursor-not-allowed opacity-70"
                                    : "hover:bg-amber-50"
                                )}
                              >
                                {s.uploading ? (
                                  <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                  <ImageUp className="h-6 w-6" />
                                )}
                                <span className="text-sm text-[#3d2b1f] font-medium">
                                  {isDisabled
                                    ? "이미지를 올리는 칸입니다."
                                    : "이미지 추가"}
                                </span>
                              </button>
                            )}

                            {(s.uploading || s.deleting) && (
                              <div className="absolute inset-0 grid place-items-center bg-black/10">
                                <Loader2 className="h-6 w-6 animate-spin" />
                              </div>
                            )}

                            {hasImg && !isDisabled && (
                              <div className="absolute right-2 top-2 flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openPickerFor(idx)}
                                  disabled={s.uploading || s.deleting}
                                  title="이미지 교체"
                                  className="bg-white/70 backdrop-blur-sm hover:cursor-pointer"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(idx)}
                                  disabled={s.uploading || s.deleting}
                                  title="이미지 삭제"
                                  className="bg-white/70 backdrop-blur-sm hover:cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-600" />
                                </Button>
                              </div>
                            )}

                            {/* 인덱스 배지 (흰 배경 pill) */}
                            <div className="absolute bottom-2 right-2">
                              <span className="px-2 py-1 text-xs rounded-md bg-white/95 shadow-sm border">
                                {idx + 1} / {MAX_SLOTS}
                              </span>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>

              <CarouselPrevious className="left-1 top-1/2 -translate-y-1/2 z-10 hover:cursor-pointer" />
              <CarouselNext className="right-1 top-1/2 -translate-y-1/2 z-10 hover:cursor-pointer" />
            </Carousel>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-600">오류: {error}</p>}
      </CardContent>

      <CardFooter className="justify-end" />
    </Card>
  );
}
