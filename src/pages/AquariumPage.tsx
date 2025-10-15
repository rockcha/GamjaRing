// src/pages/AquariumPage.tsx
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  X,
  PlusCircle,
} from "lucide-react";

import AquariumBox from "@/features/aquarium/AquariumBox";
import ThemeShopButton from "@/features/aquarium/ThemeShopButton";
import MarineDexModal from "@/features/aquarium/MarineDexModal";
import AquariumDetailButton from "@/features/aquarium/AquariumDetailButton";

/* shadcn/ui */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/* 상단 가로 네비게이터(스와이프 칩) */
import TankChipsNavigator from "@/components/widgets/TankChipsNavigator";

/** 어항 가격 (RPC 파라미터로 전달) */
const TANK_PRICE = 200;

/** 배경 숨김 폴백 지연(ms) — AquariumBox가 onReady를 못 보낼 경우 대비 */
const BG_FALLBACK_HIDE_MS = 1200;

type TankRow = { tank_no: number; title: string; theme_id: number | null };

function AquariumPage() {
  const { couple, fetchCoupleData } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  /** 커플의 탱크 목록 */
  const [tanks, setTanks] = useState<TankRow[]>([]);
  /** 현재 선택 index (0-based, 항상 첫 탱크부터) */
  const [idx, setIdx] = useState(0);

  const [themeTitle, setThemeTitle] = useState<string>("");

  /** 제목 편집 상태 */
  const cur = tanks[idx] ?? null;
  const [editing, setEditing] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  /* 구매 확인 다이얼로그 상태 */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  /** ✅ 어항 로딩 마스크(배경) 표시 상태 */
  const [showBg, setShowBg] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** AquariumBox에서 준비 완료 시 호출 (옵션) */
  const handleAquariumReady = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setShowBg(false);
  };

  useEffect(() => {
    if (!cur) return;
    setTitleInput(cur.title ?? "");
  }, [cur?.tank_no]);

  useEffect(() => {
    // cur가 바뀔 때마다 테마 제목 갱신
    const loadThemeTitle = async () => {
      if (!cur?.theme_id) {
        setThemeTitle(""); // 테마 미지정
        return;
      }
      try {
        const { data, error } = await supabase
          .from("aquarium_themes")
          .select("title")
          .eq("id", cur.theme_id)
          .maybeSingle();

        if (error) throw error;
        setThemeTitle(data?.title ?? "");
      } catch (e: any) {
        console.error(e);
        setThemeTitle(""); // 실패 시 비움
      }
    };

    loadThemeTitle();
  }, [cur?.theme_id]);

  /** 탱크 목록 로드 */
  const loadTanks = async () => {
    if (!coupleId) return;
    const { data, error } = await supabase
      .from("aquarium_tanks")
      .select("tank_no, title, theme_id")
      .eq("couple_id", coupleId)
      .order("tank_no", { ascending: true });

    if (error) {
      toast.error(`어항 목록을 불러오지 못했어요: ${error.message}`);
      setTanks([]);
      return;
    }
    const rows = (data ?? []) as TankRow[];

    setTanks(rows);
    setIdx(0); // 항상 1번부터
  };

  useEffect(() => {
    loadTanks();
  }, [coupleId]);

  /** 제목 저장 */
  const saveTitle = async () => {
    if (!coupleId || !cur) return;
    const next = (titleInput ?? "").trim().slice(0, 30);
    const { error } = await supabase
      .from("aquarium_tanks")
      .update({ title: next })
      .eq("couple_id", coupleId)
      .eq("tank_no", cur.tank_no);
    if (error) {
      toast.error(`이름 변경 실패: ${error.message}`);
      return;
    }
    setTanks((arr) =>
      arr.map((t) => (t.tank_no === cur.tank_no ? { ...t, title: next } : t))
    );
    setEditing(false);
    toast.success("어항 이름을 저장했어요!");
  };

  /** 어항 구매 (RPC) — 다이얼로그에서 최종 실행 */
  const confirmBuy = async () => {
    if (isBuying) return;
    setIsBuying(true);
    try {
      const { data, error } = await supabase.rpc("buy_aquarium", {
        p_price: TANK_PRICE,
        p_title: null,
        p_theme_id: 12, // 기본 테마 id (필요 시 변경)
      });
      if (error) throw error;

      if (data?.ok !== true) {
        const reason = data?.error ?? "unknown";
        if (reason === "not_enough_gold") toast.warning("골드가 부족합니다!");
        else toast.error(`구매 실패: ${String(reason)}`);
        return;
      }

      toast.success("새 어항을 구매했어요!");
      await loadTanks();
      await fetchCoupleData?.();

      // 방금 생성된 탱크 번호로 이동 (tank_no는 1-based → index)
      const newNo = Number(data?.tank?.tank_no ?? 1);
      setIdx(Math.max(0, newNo - 1));
    } catch (e: any) {
      toast.error(`구매 중 오류: ${e?.message ?? e}`);
    } finally {
      setIsBuying(false);
      setConfirmOpen(false);
    }
  };

  /** 인덱스 이동 */
  const prev = () =>
    setIdx((i) => (tanks.length ? (i - 1 + tanks.length) % tanks.length : 0));
  const next = () => setIdx((i) => (tanks.length ? (i + 1) % tanks.length : 0));

  /** ✅ 탱크가 바뀌면 배경을 잠깐 다시 보여주고, 폴백 타이머로 자동 숨김 */
  useEffect(() => {
    setShowBg(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowBg(false);
      hideTimerRef.current = null;
    }, BG_FALLBACK_HIDE_MS);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [cur?.tank_no]);

  /** ✅ AquariumBox와 동일 규격 */
  const AQUARIUM_HEIGHT_VH = 68;
  const AQUARIUM_WIDTH_CSS = "min(100%, calc(85vw))";

  /** ✅ 프레임(좌표 기준) — overlay와 Box가 같은 좌표계 사용 */
  const frameStyle = useMemo(
    () =>
      ({
        height: `${AQUARIUM_HEIGHT_VH}vh`,
        width: AQUARIUM_WIDTH_CSS,
      } as const),
    []
  );

  return (
    <div className="min-h-[calc(100svh-64px)] w-full flex flex-col">
      <div className="relative mx-2 sm:mx-6 lg:mx-20 mt-2 sm:mt-4">
        {/* ✅ 상단: 가로 네비게이터 (풀 폭, 미니멀) */}
        <div className="mb-3 sm:mb-4 sticky top-16 z-40">
          <TankChipsNavigator
            className={cn(
              "rounded-2xl border bg-white/70 dark:bg-slate-900/60 backdrop-blur",
              "px-3 py-2"
            )}
            tanks={tanks}
            idx={idx}
            onSelect={(i) => setIdx(i)}
          />
        </div>

        {/* ✅ 메인 프레임 컨테이너 */}
        {cur ? (
          <div
            className="relative mx-auto rounded-2xl overflow-hidden will-change-transform transform-gpu ring-1 ring-white/20 bg-white/5 backdrop-blur-[2px] transition-transform duration-200"
            style={frameStyle}
          >
            {/* ✅ Glass/Grain/Caustics/Vignette Overlays */}
            <div className="pointer-events-none absolute inset-0 z-[15]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.22)_75%)] mix-blend-multiply" />
              <div className="absolute -left-1/3 -top-1/3 w-[160%] h-1/2 -rotate-12 bg-white/10 blur-md animate-shine" />
              <div className="absolute inset-0 opacity-[0.07] bg-[url('/textures/grain.png')] bg-repeat mix-blend-overlay" />
              <div className="absolute inset-0 opacity-20 mix-blend-soft-light animate-caustics bg-[url('/textures/caustics.png')] bg-[length:140%_140%]" />
            </div>

            {/* ✅ 로딩용 배경 */}
            <div
              aria-hidden
              className={cn(
                "absolute inset-0 z-[5] pointer-events-none transition-opacity duration-500",
                showBg ? "opacity-100" : "opacity-0"
              )}
            >
              <div className="h-full w-full bg-[url('/aquarium/aquarium_background.png')] bg-cover bg-center" />
            </div>

            {/* ✅ 본체: AquariumBox */}
            <div className="relative z-10 h-full w-full">
              <AquariumBox
                tankNo={cur.tank_no}
                heightVh={AQUARIUM_HEIGHT_VH}
                // onReady={handleAquariumReady}
              />
            </div>

            {/* ✅ 상단 중앙: 라벨/타이틀 & 테마 */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30">
              <div className="flex items-center gap-2 pointer-events-auto">
                <span
                  className="hidden sm:inline-flex items-center px-2 py-1 text-[11px] rounded-md border bg-white/80 backdrop-blur stamp"
                  title={
                    themeTitle ? `현재 테마: ${themeTitle}` : "현재 테마: 기본"
                  }
                >
                  ✦ {themeTitle || "기본 테마"}
                </span>

                {!editing ? (
                  <button
                    className="group ribbon px-4 py-1.5 text-sm font-semibold"
                    onClick={() => setEditing(true)}
                    title="어항 이름 수정"
                  >
                    {cur?.title || "이름 없는 어항"}
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1 bg-white/90 border rounded-full px-2 py-1 shadow">
                    <input
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitle();
                        if (e.key === "Escape") setEditing(false);
                      }}
                      className="bg-transparent px-1 text-sm outline-none w-40 sm:w-48"
                      maxLength={30}
                      autoFocus
                    />
                    <button
                      className="p-1 hover:bg-emerald-50 rounded"
                      onClick={saveTitle}
                      title="저장"
                    >
                      <Check className="w-4 h-4 text-emerald-600" />
                    </button>
                    <button
                      className="p-1 hover:bg-rose-50 rounded"
                      onClick={() => setEditing(false)}
                      title="취소"
                    >
                      <X className="w-4 h-4 text-rose-600" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 좌상단: 추가하기 */}
            <button
              onClick={() => setConfirmOpen(true)}
              className={cn(
                "absolute right-6 top-2 z-30 inline-flex items-center gap-1 rounded-full",
                "bg-white/90 border px-3 py-1 text-xs sm:text-sm shadow hover:bg-white pointer-events-auto"
              )}
              title={`어항 추가 (🪙${TANK_PRICE.toLocaleString("ko-KR")})`}
            >
              <PlusCircle className="w-6 h-6" />
              추가하기
            </button>

            {/* 추가하기 아래 세로 버튼 3종 */}
            {cur && (
              <div
                className={cn(
                  "absolute left-6 top-2 z-30 flex flex-col gap-1.5 pointer-events-auto"
                )}
              >
                <div className="inline-flex ">
                  <AquariumDetailButton tankNo={cur.tank_no} />
                </div>
                <div className="inline-flex">
                  <MarineDexModal />
                </div>
                <div className="inline-flex">
                  <ThemeShopButton tankNo={cur.tank_no} />
                </div>
              </div>
            )}

            {/* 하단 인디케이터 */}
            {tanks.length > 1 && (
              <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                <div className="flex items-center gap-1.5">
                  {tanks.map((t, i) => {
                    const active = i === idx;
                    return (
                      <span
                        key={t.tank_no}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full bg-white/70 border pointer-events-auto",
                          active ? "scale-110 bg-amber-400" : "opacity-70"
                        )}
                        onClick={() => setIdx(i)}
                        title={`${t.tank_no}번`}
                        role="button"
                        aria-label={`${t.tank_no}번으로 이동`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          // 탱크 목록 자체가 아직 없을 때의 플레이스홀더
          <div
            className="relative rounded-2xl overflow-hidden mx-auto grid place-items-center ring-1 ring-white/20 bg-white/5 backdrop-blur-[2px]"
            style={frameStyle}
          >
            <div className="px-3 py-1.5 rounded-md bg-white/80 border shadow text-sm">
              어항을 불러오는 중…
            </div>
          </div>
        )}
      </div>

      {/* 구매 확인 다이얼로그 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>아쿠아리움을 한 칸 추가하시겠습니까?</DialogTitle>
            <DialogDescription>
              새 어항을 구매하면 골드가 차감돼요. 가격:{" "}
              <b className="tabular-nums">
                🪙{TANK_PRICE.toLocaleString("ko-KR")}
              </b>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={confirmBuy} disabled={isBuying}>
              {isBuying ? "구매 중..." : "구매"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isBuying}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { AquariumPage };
