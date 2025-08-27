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
const ASPECT_RATIO = "3 / 2";

// ===== egress 최적화 상수 =====
const SIGNED_TTL_SEC = 60 * 60 * 24 * 7; // 7일
const RENEW_BEFORE_SEC = 60 * 5; // 만료 5분 전이면 갱신
// 구버전 타입과 런타임 모두 안전: format/resizer 옵션 없이 width/quality만 사용
const TRANSFORM = {
  width: 1280,
  quality: 70,
};

// localStorage 키
const URL_CACHE_KEY = `sb-url-cache:${BUCKET}:v1`;

type Slot = {
  url: string | null; // 실제 <img src>
  path: string | null; // 스토리지 경로
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
  imageHeight?: number | string; // minHeight 기준
};

// ===== 캐시 =====
type CacheEntry = { url: string; exp: number }; // exp: epoch(sec)
function readCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(URL_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeCache(map: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(URL_CACHE_KEY, JSON.stringify(map));
  } catch {}
}

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
  const [activeIdx, setActiveIdx] = useState(0);

  const isDisabled = !user?.id || !isCoupled;

  // 캐시/쿨다운
  const cacheRef = useRef<Record<string, CacheEntry>>(readCache());
  const failRef = useRef<Record<string, number>>({});
  const FAIL_COOLDOWN_SEC = 10 * 60;

  const inRange = (i: number) => i >= 0 && i < MAX_SLOTS;
  const updateSlot = (i: number, updater: (prev: Slot) => Slot) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? updater(s) : s)));

  const buildSlotPath = (cid: string, i: number, ext: string) =>
    `${cid}/slot-${i}.${ext}`;

  // 캐시를 고려한 서명 URL 발급 (+실패 쿨다운)
  const getSignedUrlCached = useCallback(
    async (path: string): Promise<string> => {
      if (!path) throw new Error("invalid path");
      const now = Math.floor(Date.now() / 1000);

      // 실패 쿨다운
      if (failRef.current[path] && failRef.current[path] > now) {
        throw new Error("cooldown");
      }

      const c = cacheRef.current[path];
      if (c && c.exp - RENEW_BEFORE_SEC > now) {
        return c.url; // 아직 유효 → 그대로 사용
      }

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_TTL_SEC, { transform: TRANSFORM });

      if (error || !data?.signedUrl) {
        failRef.current[path] = now + FAIL_COOLDOWN_SEC;
        throw error ?? new Error("sign failed");
      }

      const signed = data.signedUrl;
      const exp = now + SIGNED_TTL_SEC;
      cacheRef.current[path] = { url: signed, exp };
      writeCache(cacheRef.current);
      return signed;
    },
    []
  );

  // ===== 기존 파일 목록 로드 (path만 세팅) + 캐시된 URL 즉시 주입 =====
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
      const leftOver: string[] = [];

      for (const f of files ?? []) {
        const m = f.name.match(/^slot-(\d)\.(png|jpe?g|webp|gif|bmp|avif)$/i);
        if (m) {
          const idx = Number(m[1]);
          if (idx >= 0 && idx < next.length)
            next[idx]!.path = `${coupleId}/${f.name}`;
          else leftOver.push(f.name);
        } else {
          leftOver.push(f.name);
        }
      }
      for (const name of leftOver) {
        const i = next.findIndex((s) => !s.path);
        if (i === -1) break;
        next[i]!.path = `${coupleId}/${name}`;
      }

      // 캐시에서 URL 즉시 주입 → 첫 렌더부터 이미지 보여주기(깜빡임 제거)
      const cached = cacheRef.current;
      const hydrated = next.map((s) => {
        if (!s.path) return s;
        const entry = cached[s.path]; // <- 한 번만 꺼내서 좁히기
        return entry ? { ...s, url: entry.url } : s;
      });

      setSlots(hydrated);
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

  // Embla active index 추적
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setActiveIdx(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi?.off("select", onSelect);
    };
  }, [carouselApi]);

  // 현재/양옆만 url 로드
  const ensureUrlFor = useCallback(
    async (idx: number) => {
      if (!inRange(idx)) return;
      const s = slots[idx];
      if (!s?.path) return;
      if (s.url) return;
      try {
        const signed = await getSignedUrlCached(s.path);
        // 선로드 후 교체(깜빡임 방지)
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.decoding = "async";
          img.src = signed;
        });
        updateSlot(idx, (prev) => ({ ...prev, url: signed }));
      } catch {
        // 실패 시 그대로 두고, 실패 쿨다운에 의해 반복요청 차단
      }
    },
    [slots, getSignedUrlCached]
  );

  useEffect(() => {
    void ensureUrlFor(activeIdx);
    void ensureUrlFor((activeIdx + 1) % MAX_SLOTS);
    void ensureUrlFor((activeIdx - 1 + MAX_SLOTS) % MAX_SLOTS);
  }, [activeIdx, ensureUrlFor]);

  // 오토플레이
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);
  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  const imageCount = useMemo(
    () => slots.filter((s) => !!s.path).length,
    [slots]
  );
  const startTimer = useCallback(() => {
    clearTimer();
    if (!carouselApi) return;
    if (imageCount < 2) return;
    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      carouselApi.scrollNext();
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

  // 업로드/교체
  const openPickerFor = (idx: number) => {
    if (isDisabled || !inRange(idx)) return;
    pendingTargetIndex.current = idx;
    fileInputRef.current?.click();
  };

  // 업로드 전 다운스케일(선택)
  async function downscaleImage(file: File): Promise<File> {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      if (scale >= 1) return file;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob(res, "image/webp", 0.82)
      );
      if (!blob) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
        type: "image/webp",
      });
    } catch {
      return file;
    }
  }

  const handleChangeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0] ?? null;
    const idx = pendingTargetIndex.current;
    pendingTargetIndex.current = null;
    if (!raw || !inRange(idx ?? -1) || !coupleId || !isCoupled) return;

    const index = idx as number;
    const cid = coupleId as string;

    const file = await downscaleImage(raw);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const uploadPath = buildSlotPath(cid, index, ext);

    const tempURL = URL.createObjectURL(file);
    updateSlot(index, (prev) => ({ ...prev, url: tempURL, uploading: true }));

    try {
      // 동일 슬롯 기존 파일 제거
      const { data: listing } = await supabase.storage
        .from(BUCKET)
        .list(`${cid}`);
      const toRemove = (listing ?? [])
        .filter((x) => x.name.startsWith(`slot-${index}.`))
        .map((x) => `${cid}/${x.name}`);
      if (toRemove.length) await supabase.storage.from(BUCKET).remove(toRemove);

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(uploadPath, file, {
          upsert: true,
          cacheControl: "31536000",
          contentType: file.type,
        });
      if (upErr) throw upErr;

      // 새 경로의 캐시 무효화
      delete cacheRef.current[uploadPath];
      writeCache(cacheRef.current);
      delete failRef.current[uploadPath];

      // 변환 포함 서명 URL 발급 + 선로드
      const signed = await getSignedUrlCached(uploadPath);
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.decoding = "async";
        img.src = signed;
      });

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

      // 캐시/쿨다운도 제거
      delete cacheRef.current[s.path];
      delete failRef.current[s.path];
      writeCache(cacheRef.current);

      updateSlot(idx, (_) => ({ ...emptySlot() }));
    } catch (e: any) {
      updateSlot(idx, (prev) => ({ ...prev, deleting: false }));
      setError(e?.message ?? "이미지를 삭제하는 중 오류가 발생했어요.");
    }
  };

  // 크기 스타일
  const minH =
    typeof imageHeight === "number" ? Math.max(360, imageHeight) : 360;
  const ratioBoxStyle: React.CSSProperties = {
    aspectRatio: ASPECT_RATIO,
    width: "100%",
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
                  const visibleIdx = [
                    activeIdx,
                    (activeIdx + 1) % MAX_SLOTS,
                    (activeIdx - 1 + MAX_SLOTS) % MAX_SLOTS,
                  ];
                  const shouldLoad = visibleIdx.includes(idx);
                  const hasImg = !!s.path && !!s.url && shouldLoad;

                  return (
                    <CarouselItem key={idx}>
                      <div>
                        <Card className="overflow-hidden">
                          <div
                            className="relative w-full"
                            style={ratioBoxStyle}
                          >
                            {s.path && shouldLoad ? (
                              hasImg ? (
                                <img
                                  src={s.url!}
                                  alt={`커플 이미지 ${idx + 1}`}
                                  className="w-full h-full object-cover scale-60 rounded-md transition-transform duration-300"
                                  draggable={false}
                                  loading={idx === activeIdx ? "eager" : "lazy"}
                                  decoding="async"
                                  fetchPriority={
                                    idx === activeIdx ? "high" : "low"
                                  }
                                />
                              ) : (
                                <div className="w-full h-full grid place-items-center">
                                  <Skeleton className="w-full h-full rounded-md" />
                                </div>
                              )
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

                            {s.path && !isDisabled && (
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
