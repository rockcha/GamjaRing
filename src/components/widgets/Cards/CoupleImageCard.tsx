// src/features/couple/CoupleImageCard.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";

import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

// ===== egress 최적화 상수 =====
const SIGNED_TTL_SEC = 60 * 60 * 24 * 30; // 30일
const RENEW_BEFORE_SEC = 60 * 5; // 만료 5분 전이면 갱신
const TRANSFORM = { width: 1280, quality: 70 };

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
  /** 이미지 최대 표시 높이 (작은 사진은 더 작게 보이고, 큰 사진은 여기까지만) */
  maxImageHeight?: number; // px
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

// ===== 시간/만료 헬퍼 =====
const nowSec = () => Math.floor(Date.now() / 1000);
const isFresh = (exp: number) => exp - RENEW_BEFORE_SEC > nowSec();

// ===== 이미지 타임아웃 가드 =====
async function tryLoadWithTimeout(url: string, ms = 3500) {
  return await Promise.race([
    new Promise<void>((res, rej) => {
      const img = new Image();
      img.onload = () => res();
      img.onerror = () => rej(new Error("img error"));
      img.src = url;
    }),
    new Promise<void>((_, rej) =>
      setTimeout(() => rej(new Error("timeout")), ms)
    ),
  ]);
}

export default function CoupleImageCard({
  className,
  maxImageHeight = 520,
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
      const now = nowSec();

      // 실패 쿨다운
      if (failRef.current[path] && failRef.current[path] > now) {
        throw new Error("cooldown");
      }

      const c = cacheRef.current[path];
      if (c && isFresh(c.exp)) {
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

  // 캐시 무시 재발급(재시도용, 쿨다운도 무시)
  const refreshSignedUrlForce = useCallback(async (path: string) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_TTL_SEC, { transform: TRANSFORM });
    if (error || !data?.signedUrl)
      throw error ?? new Error("force sign failed");
    const signed = data.signedUrl;
    const exp = nowSec() + SIGNED_TTL_SEC;
    cacheRef.current[path] = { url: signed, exp };
    writeCache(cacheRef.current);
    delete failRef.current[path];
    return signed;
  }, []);

  // ===== 기존 파일 목록 로드 =====
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

      // 캐시에서 URL 주입하되, 만료 임박이면 주입하지 않음
      const cached = cacheRef.current;
      const hydrated = next.map((s) => {
        if (!s.path) return s;
        const entry = cached[s.path];
        if (entry && isFresh(entry.exp)) return { ...s, url: entry.url };
        if (entry && !isFresh(entry.exp)) {
          delete cached[s.path];
          writeCache(cached);
        }
        return s;
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
    // 초기 레이아웃 안정 후 select
    requestAnimationFrame(onSelect);
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi?.off("select", onSelect);
    };
  }, [carouselApi]);

  // 현재/양옆만 url 로드 (개선: URL을 즉시 꽂고, 뒤에서 확인/재시도)
  const ensureUrlFor = useCallback(
    async (idx: number) => {
      if (!inRange(idx)) return;
      const s = slots[idx];
      if (!s?.path) return;
      if (s.url) return;

      const path = s.path;
      try {
        // 1) 서명 URL 발급
        const signed = await getSignedUrlCached(path);

        // 2) UI에 즉시 반영 (사용자는 바로 본다)
        updateSlot(idx, (prev) => ({ ...prev, url: signed }));

        // 3) 백그라운드 확인 + 타임아웃 가드
        try {
          await tryLoadWithTimeout(signed, 3500);
        } catch {
          // 4) 한 번은 강제 재발급 후 교체
          try {
            const fresh = await refreshSignedUrlForce(path);
            updateSlot(idx, (prev) => ({ ...prev, url: fresh }));
          } catch {
            // 무시: 다음 인터랙션에서 또 시도됨
          }
        }
      } catch {
        // 실패 쿨다운 중이면 다음 인터랙션/슬라이드 이동 시 재시도
      }
    },
    [slots, getSignedUrlCached, refreshSignedUrlForce]
  );

  useEffect(() => {
    void ensureUrlFor(activeIdx);
    void ensureUrlFor((activeIdx + 1) % MAX_SLOTS);
    void ensureUrlFor((activeIdx - 1 + MAX_SLOTS) % MAX_SLOTS);
  }, [activeIdx, ensureUrlFor]);

  useEffect(() => {
    if (!slots.length) return;
    void ensureUrlFor(activeIdx);
    void ensureUrlFor((activeIdx + 1) % MAX_SLOTS);
    void ensureUrlFor((activeIdx - 1 + MAX_SLOTS) % MAX_SLOTS);
  }, [slots, activeIdx, ensureUrlFor]);

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

      // 변환 포함 서명 URL 발급
      const signed = await getSignedUrlCached(uploadPath);

      // UI 즉시 반영
      updateSlot(index, (_) => ({
        url: signed,
        path: uploadPath,
        uploading: false,
        deleting: false,
      }));

      // 백그라운드 확인 (실패 시 강제 재발급)
      try {
        await tryLoadWithTimeout(signed, 3500);
      } catch {
        try {
          const fresh = await refreshSignedUrlForce(uploadPath);
          updateSlot(index, (prev) => ({ ...prev, url: fresh }));
        } catch {}
      }
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

  // ✅ onError 시 즉시 재발급하여 깨짐 복구 (강제 재발급 사용)
  const handleImgError = useCallback(
    async (idx: number, path: string) => {
      try {
        const fresh = await refreshSignedUrlForce(path);
        updateSlot(idx, (prev) => ({ ...prev, url: fresh }));
      } catch {
        // 무시: 다음 인터랙션에서 재시도
      }
    },
    [refreshSignedUrlForce]
  );

  return (
    <Card className={cn(className)}>
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
          {/* 로딩 시에도 너무 크지 않게 */}
          <div className="rounded-lg w-full">
            <Skeleton className="w-full h-[280px] sm:h-[360px] rounded-lg" />
          </div>
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
      ) : (
        <div className="relative">
          <Carousel
            setApi={setCarouselApi}
            className="w-full"
            opts={{ loop: true }}
          >
            <CarouselContent className="mx-auto">
              {slots.map((s, idx) => {
                const visibleIdx = [
                  activeIdx,
                  (activeIdx + 1) % MAX_SLOTS,
                  (activeIdx - 1 + MAX_SLOTS) % MAX_SLOTS,
                ];
                const shouldLoad = visibleIdx.includes(idx);
                const hasImg = !!s.path && !!s.url && shouldLoad;

                const itemKey = `${idx}-${s.path ?? "empty"}`;

                return (
                  <CarouselItem
                    key={itemKey}
                    className="bg-transparent border-0 p-2"
                  >
                    <div className="w-full">
                      {/* 이미지 컨테이너 */}
                      <div className="relative w-full rounded-md border bg-white/40">
                        <div className="w-full flex items-center justify-center p-2">
                          {s.path && shouldLoad ? (
                            hasImg ? (
                              <img
                                key={s.path ?? `img-${idx}`}
                                src={s.url!}
                                alt={`커플 이미지 ${idx + 1}`}
                                className="block max-w-full h-auto border rounded-xl"
                                style={{
                                  maxHeight: `${maxImageHeight}px`,
                                  objectFit: "contain",
                                }}
                                draggable={false}
                                loading={idx === activeIdx ? "eager" : "lazy"}
                                // 액티브는 decoding 동기화로 "안뜨는 느낌" 최소화
                                decoding={idx === activeIdx ? "sync" : "async"}
                                fetchPriority={
                                  idx === activeIdx ? "high" : "low"
                                }
                                onError={() =>
                                  s.path && handleImgError(idx, s.path)
                                }
                              />
                            ) : (
                              <div className="w-full grid place-items-center">
                                <Skeleton className="w-full h-[220px] sm:h-[260px] rounded-md" />
                              </div>
                            )
                          ) : (
                            <button
                              type="button"
                              disabled={isDisabled || s.uploading}
                              onClick={() => openPickerFor(idx)}
                              className={cn(
                                "w-full h-[220px] sm:h-[260px] flex flex-col items-center justify-center gap-2",
                                "border-2 border-dashed rounded-md m-2",
                                isDisabled
                                  ? "cursor-not-allowed opacity-70"
                                  : "hover:bg-amber-50"
                              )}
                            >
                              {!s.uploading ? (
                                <ImageUp className="h-6 w-6" />
                              ) : null}
                              <span className="text-sm text-[#3d2b1f] font-medium">
                                {isDisabled
                                  ? "이미지를 올리는 칸입니다."
                                  : "이미지 추가"}
                              </span>
                            </button>
                          )}
                        </div>

                        {(s.uploading || s.deleting) && (
                          <div className="absolute inset-0 grid place-items-center bg-black/10">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        )}

                        {s.path && !isDisabled && (
                          <div className="absolute right-2 bottom-2 flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openPickerFor(idx)}
                              disabled={s.uploading || s.deleting}
                              title="이미지 교체"
                              className="bg-white hover:cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(idx)}
                              disabled={s.uploading || s.deleting}
                              title="이미지 삭제"
                              className="bg-white hover:cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </div>
                        )}

                        <div className="absolute bottom-2 left-2">
                          <span className="px-2 py-1 text-xs rounded-md bg-white/95 shadow-sm border">
                            {idx + 1} / {MAX_SLOTS}
                          </span>
                        </div>
                      </div>
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
      <CardFooter className="hidden" />
    </Card>
  );
}
