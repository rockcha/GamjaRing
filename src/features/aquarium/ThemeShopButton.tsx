"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { toast } from "sonner";
import { Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { useCoupleContext } from "@/contexts/CoupleContext";

type ThemeRow = { id: number; title: string; price: number };

function imageUrlFromTitle(title: string) {
  return `/aquarium/themes/${encodeURIComponent(title)}.png`;
}

// 기본 테마
const BASE_THEME_ID = 12;
const BASE_THEME_TITLE = "수중 정원";

// ✅ 보유 / 미보유만
type FilterKind = "owned" | "unowned";

export default function ThemeShopButton({
  tankNo,
  className = "",
}: {
  /** ✅ 현재 어항 번호(필수) */
  tankNo: number;
  className?: string;
}) {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [themes, setThemes] = useState<ThemeRow[]>([]);

  /** ✅ 현재 어항의 theme_id / title */
  const [currentThemeId, setCurrentThemeId] = useState<number | null>(null);
  const [tankTitle, setTankTitle] = useState<string>("");

  /** 보유 테마 */
  const [ownedIds, setOwnedIds] = useState<number[]>([]);
  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds]);

  /** ✅ 라디오 그룹 필터 (기본: 미보유) */
  const [filter, setFilter] = useState<FilterKind>("unowned");

  const [busyBuyId, setBusyBuyId] = useState<number | null>(null);
  const [busyApplyId, setBusyApplyId] = useState<number | null>(null);

  /** ✅ 이미지 프리뷰 다이얼로그 상태 */
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<ThemeRow | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 모달 열릴 때 데이터 적재
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        // 1) 전체 테마
        const themesRes = await supabase
          .from("aquarium_themes")
          .select("id,title,price")
          .order("price", { ascending: true });
        if (themesRes.error) throw themesRes.error;
        const all = (themesRes.data ?? []) as ThemeRow[];
        if (!cancelled) setThemes(all);

        // 2) 현재 어항의 theme / title
        if (coupleId && tankNo != null) {
          const curTankRes = await supabase
            .from("aquarium_tanks")
            .select("theme_id,title")
            .eq("couple_id", coupleId)
            .eq("tank_no", tankNo)
            .maybeSingle();

          if (!cancelled) {
            setCurrentThemeId(
              (curTankRes.data?.theme_id as number | null) ?? null
            );
            setTankTitle(curTankRes.data?.title ?? `어항 ${tankNo}`);
          }
        } else {
          if (!cancelled) {
            setCurrentThemeId(null);
            setTankTitle(`어항 ${tankNo}`);
          }
        }

        // 3) 보유 목록 (+기본 테마 보장)
        if (coupleId) {
          const ownRes = await supabase
            .from("couple_theme_purchases")
            .select("theme_id")
            .eq("couple_id", coupleId);
          if (ownRes.error) throw ownRes.error;

          const owned = (ownRes.data ?? []).map(
            (r: any) => r.theme_id as number
          );

          if (!owned.includes(BASE_THEME_ID)) {
            const up = await supabase
              .from("couple_theme_purchases")
              .upsert([{ couple_id: coupleId, theme_id: BASE_THEME_ID }], {
                onConflict: "couple_id,theme_id",
                ignoreDuplicates: true,
              });
            if (up.error) {
              console.warn("[ThemeShop] base theme upsert error:", up.error);
            } else {
              owned.push(BASE_THEME_ID);
            }
          }

          if (!cancelled) setOwnedIds(owned);
        } else {
          if (!cancelled) setOwnedIds([BASE_THEME_ID]);
        }
      } catch (e: any) {
        toast.error(e?.message ?? "테마 정보를 불러오지 못했어요");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, coupleId, tankNo]);

  const sorted = useMemo(
    () => themes.slice().sort((a, b) => a.price - b.price),
    [themes]
  );

  // ✅ 보유 / 미보유만 필터링
  const visible = useMemo(() => {
    if (filter === "unowned") return sorted.filter((t) => !ownedSet.has(t.id));
    return sorted.filter((t) => ownedSet.has(t.id));
  }, [filter, sorted, ownedSet]);

  /** ✅ 구매(보유만 추가, 적용은 하지 않음) */
  async function buyTheme(t: ThemeRow) {
    if (!coupleId) return toast.error("커플 정보를 찾을 수 없어요.");
    if (t.id === BASE_THEME_ID || t.title === BASE_THEME_TITLE) {
      return toast.message("기본 테마는 구매할 수 없어요.");
    }

    try {
      setBusyBuyId(t.id);

      // 👉 ‘구매만’ 수행하는 RPC가 필요합니다. (SQL 예시는 하단 참고)
      const { data, error } = await supabase.rpc("buy_theme", {
        p_theme_id: t.id,
      });
      if (error) throw error;

      const ok = data?.ok === true;
      if (!ok) {
        const reason = data?.error ?? "unknown";
        if (reason === "not_enough_gold")
          return toast.warning("골드가 부족합니다!");
        if (reason === "theme_not_found")
          return toast.error("테마 정보를 찾을 수 없어요.");
        if (reason === "already_owned")
          return toast.message("이미 보유한 테마예요.");
        return toast.error(`구매 실패: ${String(reason)}`);
      }

      const price = Number(data?.price ?? t.price);
      toast.success(`구매 완료! -${price.toLocaleString()} 골드`);

      // 로컬 상태 반영 (적용은 하지 않음)
      setOwnedIds((prev) => (prev.includes(t.id) ? prev : [...prev, t.id]));
    } catch (e: any) {
      toast.error(e?.message ?? "구매에 실패했어요");
    } finally {
      setBusyBuyId(null);
    }
  }

  /** ✅ 적용(보유 테마만): 현재 어항(tankNo)의 theme_id 업데이트 */
  async function applyTheme(t: ThemeRow) {
    if (!coupleId) return toast.error("커플 정보를 찾을 수 없어요.");
    if (!ownedSet.has(t.id))
      return toast.error("보유하지 않은 테마는 적용할 수 없어요.");
    if (currentThemeId === t.id) return toast.message("이미 적용된 테마예요.");

    try {
      setBusyApplyId(t.id);
      const up = await supabase
        .from("aquarium_tanks")
        .update({ theme_id: t.id })
        .eq("couple_id", coupleId)
        .eq("tank_no", tankNo)
        .select("theme_id")
        .single();

      if (up.error) throw up.error;
      setCurrentThemeId(t.id);
      toast.success("테마를 적용했어요!");

      // 필요 시 어항 새로고침 이벤트만 날리고, 페이지 전체 리로드는 제거
      window.dispatchEvent(new CustomEvent("aquarium-theme-applied"));
      // window.location.reload(); // ❌ 자동 새로고침 제거
    } catch (e: any) {
      toast.error(e?.message ?? "테마 적용에 실패했어요");
    } finally {
      setBusyApplyId(null);
    }
  }

  /** ✅ 썸네일 클릭 → 프리뷰 오픈 */
  function openPreview(t: ThemeRow) {
    setPreviewTheme(t);
    setPreviewLoading(true);
    setPreviewOpen(true);
  }

  return (
    <>
      {/* ====== 메인 상점 다이얼로그 ====== */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            className={[
              className,
              "transition-transform duration-150 hover:scale-[1.02] active:scale-100",
              "hover:shadow-sm",
            ].join(" ")}
            variant="outline"
            title="테마 상점 열기"
          >
            <img
              src="/aquarium/themes/shop.gif"
              alt="테마 상점 아이콘"
              className=" h-7 w-7"
              draggable={false}
            />
            테마 상점
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-3xl sm:max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>아쿠아리움 테마 상점</DialogTitle>
            <DialogDescription>
              테마를 살펴보고 마음에 드는 스타일을 골드로 구매한 뒤, 원할 때
              적용하세요.
            </DialogDescription>

            {/* ✅ 현재 어항 정보 */}
            <div className="mt-2 text-sm text-muted-foreground">
              현재 어항 <b className="text-foreground">#{tankNo}</b> —{" "}
              <span>{tankTitle}</span>
            </div>
          </DialogHeader>

          {/* ✅ 라디오 그룹 필터 (보유 / 미보유) */}
          <div className="px-6 pb-3">
            <div className="flex items-center justify-end gap-4">
              <span className="text-sm text-muted-foreground">보기</span>
              <RadioGroup
                className="flex items-center gap-4"
                value={filter}
                onValueChange={(v: FilterKind) => setFilter(v)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="f-owned" value="owned" />
                  <Label htmlFor="f-owned">보유</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="f-unowned" value="unowned" />
                  <Label htmlFor="f-unowned">미보유</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* 목록 (스크롤) */}
          <div className="px-6 pb-6">
            <div className="max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="border-muted bg-card/50">
                      <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
                      <CardHeader className="pb-2">
                        <div className="h-4 w-2/3 animate-pulse bg-muted rounded" />
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="h-4 w-1/3 animate-pulse bg-muted rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  표시할 테마가 없어요.
                </div>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visible.map((t) => {
                    const isCurrent = currentThemeId === t.id;
                    const isOwned = ownedSet.has(t.id);
                    const isBase =
                      t.id === BASE_THEME_ID || t.title === BASE_THEME_TITLE;

                    return (
                      <li key={t.id}>
                        <Card
                          className={[
                            "transition-shadow",
                            "hover:shadow-sm",
                            isCurrent
                              ? "border-sky-500 ring-2 ring-sky-400/50"
                              : "border-muted",
                          ].join(" ")}
                        >
                          <div className="relative">
                            {/* ✅ 이미지 클릭 → 프리뷰 */}
                            <img
                              src={imageUrlFromTitle(t.title)}
                              alt={t.title}
                              className="aspect-[4/3] w-full object-cover rounded-t-lg bg-muted cursor-zoom-in"
                              onClick={() => openPreview(t)}
                              onError={(e) => {
                                const el = e.currentTarget as HTMLImageElement;
                                el.style.opacity = "0.6";
                                el.src =
                                  "data:image/svg+xml;utf8," +
                                  encodeURIComponent(
                                    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='#f1f5f9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#94a3b8' font-size='16'>이미지가 아직 준비되지 않았어요</text></svg>`
                                  );
                              }}
                            />

                            {isCurrent && (
                              <Badge className="absolute left-2 top-2 bg-sky-600 hover:bg-sky-600">
                                현재 적용
                              </Badge>
                            )}
                            {isOwned && !isCurrent && (
                              <Badge className="absolute left-2 top-2 bg-emerald-600 hover:bg-emerald-600">
                                보유중
                              </Badge>
                            )}
                            {isBase && (
                              <Badge className="absolute right-2 top-2 bg-slate-600 hover:bg-slate-600">
                                기본
                              </Badge>
                            )}
                          </div>

                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              {t.title}
                            </CardTitle>
                          </CardHeader>

                          <CardContent className="flex items-center justify-between pb-4">
                            <div className="inline-flex items-center gap-1.5 text-sm font-semibold">
                              <Coins className="h-4 w-4 text-yellow-500" />
                              {t.price.toLocaleString()}
                            </div>

                            {/* 액션: 보유 → 적용 / 미보유 → 구매(적용 안 함) */}
                            {isOwned ? (
                              <Button
                                size="sm"
                                variant="default"
                                className={[
                                  "text-white border-0",
                                  isCurrent || busyApplyId === t.id
                                    ? "bg-sky-400 cursor-not-allowed opacity-70"
                                    : "bg-sky-800 hover:bg-sky-700",
                                  "transition-transform duration-150 hover:scale-[1.03] active:scale-100",
                                  "shadow-sm hover:shadow",
                                ].join(" ")}
                                disabled={isCurrent || busyApplyId === t.id}
                                onClick={() => applyTheme(t)}
                              >
                                {isCurrent
                                  ? "적용됨"
                                  : busyApplyId === t.id
                                  ? "적용 중..."
                                  : "적용"}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant={isBase ? "secondary" : "default"}
                                className={[
                                  !isBase
                                    ? "bg-emerald-600 text-white border-0 hover:bg-emerald-500"
                                    : "",
                                  "transition-transform duration-150 hover:scale-[1.03] active:scale-100",
                                  "shadow-sm hover:shadow",
                                  isBase ? "cursor-not-allowed opacity-70" : "",
                                ].join(" ")}
                                disabled={isBase || busyBuyId === t.id}
                                onClick={() => buyTheme(t)}
                              >
                                {isBase
                                  ? "구매 불가"
                                  : busyBuyId === t.id
                                  ? "구매 중..."
                                  : "구매"}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== 이미지 프리뷰 다이얼로그 (원본 비율) ====== */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="truncate">
              {previewTheme?.title ?? "미리보기"}
            </DialogTitle>
            <DialogDescription>이미지를 클릭하면 닫힙니다.</DialogDescription>
          </DialogHeader>

          <div className="relative mx-auto w-full grid place-items-center px-4 pb-4">
            {/* 로딩 스피너 */}
            {previewLoading && (
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            )}

            {previewTheme && (
              <div className="relative max-w-[92vw] max-h-[80vh] overflow-auto">
                <img
                  src={imageUrlFromTitle(previewTheme.title)}
                  alt={previewTheme.title}
                  title="이미지 클릭으로 닫기"
                  className="block object-contain
                   max-w-full max-h-[80vh] w-auto h-auto
                   rounded-md cursor-zoom-out select-none"
                  onLoad={() => setPreviewLoading(false)}
                  onClick={() => setPreviewOpen(false)}
                  onError={(e) => {
                    /* 기존 에러 처리 그대로 */
                  }}
                  draggable={false}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
