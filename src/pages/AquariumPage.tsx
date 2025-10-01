// src/pages/AquariumPage.tsx (전체 코드)
"use client";

import { useEffect, useState, useRef } from "react";
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

/* 오른쪽 이름 네비게이터(칩 리스트형) */
import TankChipsNavigator from "@/components/widgets/TankChipsNavigator";

/** 어항 가격 (RPC 파라미터로 전달) */
const TANK_PRICE = 200;

/** 배경 숨김 폴백 지연(ms) — AquariumBox가 onReady를 못 보낼 경우 대비 */
const BG_FALLBACK_HIDE_MS = 1200;

function AquariumPage() {
  const { couple, fetchCoupleData } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  /** 커플의 탱크 목록 */
  const [tanks, setTanks] = useState<
    Array<{ tank_no: number; title: string; theme_id: number | null }>
  >([]);
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
    const rows = (data ?? []) as Array<{
      tank_no: number;
      title: string;
      theme_id: number | null;
    }>;

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
    // 배경 즉시 표시
    setShowBg(true);
    // 기존 타이머 정리
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    // 폴백: AquariumBox가 onReady를 호출하지 않아도 일정 시간 후 자동 숨김
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
  const frameStyle = {
    height: `${AQUARIUM_HEIGHT_VH}vh`,
    width: AQUARIUM_WIDTH_CSS,
  } as const;

  return (
    <div className="min-h-[calc(100svh-64px)] w-full flex flex-col">
      <div className="relative mx-2 sm:mx-6 lg:mx-20 mt-2 sm:mt-4">
        {/* ✅ 메인 프레임 + 오른쪽 네비게이터 2열 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
          {/* === 왼쪽: 기존 프레임 컨테이너 === */}
          <div>
            {/* 상단 툴바: 관리하기 · 도감 · 테마 상점 (프레임 바깥) */}
            <div className="mb-2 sm:mb-3">
              <div className="flex items-center gap-2 rounded-xl border bg-white/70 backdrop-blur px-2.5 py-1.5 shadow-sm">
                {cur && <AquariumDetailButton tankNo={cur.tank_no} />}
                <MarineDexModal />
                {cur && <ThemeShopButton tankNo={cur.tank_no} />}
              </div>
            </div>

            {/* ✅ 프레임 컨테이너: 로딩 PNG + AquariumBox + 모든 오버레이를 같은 기준으로 */}
            {cur ? (
              <div
                className="relative mx-auto rounded-2xl overflow-hidden will-change-transform transform-gpu"
                style={frameStyle}
              >
                {/* ✅ 로딩용 배경 (같은 프레임 기준) */}
                <div
                  aria-hidden
                  className={cn(
                    "absolute inset-0 pointer-events-none transition-opacity duration-500",
                    showBg ? "opacity-100" : "opacity-0"
                  )}
                >
                  <div className="h-full w-full bg-[url('/aquarium/aquarium_background.png')] bg-cover bg-center" />
                </div>

                {/* ✅ 본체: AquariumBox (같은 프레임 기준) */}
                <div className="relative z-10 h-full w-full">
                  <AquariumBox
                    tankNo={cur.tank_no}
                    heightVh={AQUARIUM_HEIGHT_VH}
                    // onReady={handleAquariumReady} // ↙ 필요 시 AquariumBox에 onReady 구현 후 사용
                  />
                </div>

                {/* ✅ 오버레이 UI들 (프레임 기준 절대배치) */}
                {/* 어항 좌상단: 추가하기 */}
                <button
                  onClick={() => setConfirmOpen(true)}
                  className={cn(
                    "absolute left-6 top-2 z-20",
                    "inline-flex items-center gap-1 rounded-full",
                    "bg-white/90 border px-3 py-1 text-xs sm:text-sm shadow hover:bg-white"
                  )}
                  title={`어항 추가 (🪙${TANK_PRICE.toLocaleString("ko-KR")})`}
                >
                  <PlusCircle className="w-6 h-6" />
                  추가하기
                </button>

                {/* 어항 상단 중앙: 현재 테마 + 제목(편집) */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30">
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full",
                        "bg-white/80 border backdrop-blur px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs text-slate-800 shadow"
                      )}
                      title={
                        themeTitle
                          ? `현재 테마: ${themeTitle}`
                          : "현재 테마: 기본"
                      }
                    >
                      <span aria-hidden className="text-[12px] sm:text-[13px]">
                        현재 테마 :
                      </span>
                      <b className="font-semibold">
                        {themeTitle || "기본 테마"}
                      </b>
                    </span>

                    {!editing ? (
                      <button
                        className="group inline-flex items-center gap-2 rounded-full  bg-black/35 text-white text-xs sm:text-sm px-2.5 sm:px-3 py-0.5 sm:py-1 backdrop-blur-sm"
                        onClick={() => setEditing(true)}
                        title="어항 이름 수정"
                      >
                        <span className="font-semibold tracking-wide line-clamp-1 max-w-[40vw] sm:max-w-none">
                          {cur?.title || "이름 없는 어항"}
                        </span>
                        <Pencil className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100" />
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

                {/* 좌/우 화살표 — 프레임 기준 오버레이 */}
                {tanks.length > 1 && (
                  <>
                    <button
                      className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 z-20",
                        "pointer-events-auto rounded-full bg-white/80 hover:bg-white",
                        "border shadow grid place-items-center",
                        "h-11 w-11 sm:h-12 sm:w-12"
                      )}
                      onClick={prev}
                      aria-label="이전 어항"
                      title="이전 어항"
                    >
                      <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                    <button
                      className={cn(
                        "absolute right-0 top-1/2 -translate-y-1/2 z-20",
                        "pointer-events-auto rounded-full bg-white/80 hover:bg-white",
                        "border shadow grid place-items-center",
                        "h-11 w-11 sm:h-12 sm:w-12"
                      )}
                      onClick={next}
                      aria-label="다음 어항"
                      title="다음 어항"
                    >
                      <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                  </>
                )}

                {/* 하단 인디케이터 — 프레임 내부 정렬 */}
                {tanks.length > 1 && (
                  <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
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
                className="relative rounded-2xl overflow-hidden mx-auto grid place-items-center"
                style={frameStyle}
              >
                <div className="px-3 py-1.5 rounded-md bg-white/80 border shadow text-sm">
                  어항을 불러오는 중…
                </div>
              </div>
            )}
          </div>

          {/* === 오른쪽: 이름 칩 네비게이터 === */}
          <div className="hidden lg:block">
            <TankChipsNavigator
              tanks={tanks}
              idx={idx}
              onSelect={(i) => setIdx(i)}
            />
          </div>
        </div>
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
