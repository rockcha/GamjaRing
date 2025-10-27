// src/components/WeatherCard.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* Tooltip (통일 스타일) */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ===== 타입 ===== */
type GeoResult = {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
};
type CurrentWeather = { temperature_2m: number; weather_code: number };

/* ===== 상수 ===== */
const KST_TZ = "Asia/Seoul";
const CACHE_TTL_MIN = 15;
const LS_REGION_KEY = "weather_region";
const LS_CACHE_KEY = "weather_cache_v1";

const REGIONS: string[] = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "수원",
  "용인",
  "고양",
  "성남",
  "부천",
  "안양",
  "안산",
  "과천",
  "광명",
  "시흥",
  "군포",
  "의왕",
  "의정부",
  "남양주",
  "구리",
  "하남",
  "김포",
  "파주",
  "광주(경기)",
  "이천",
  "여주",
  "평택",
  "화성",
  "오산",
  "안성",
  "양주",
  "동두천",
  "포천",
  "가평",
  "양평",
  "춘천",
  "원주",
  "강릉",
  "속초",
  "동해",
  "삼척",
  "태백",
  "청주",
  "충주",
  "제천",
  "천안",
  "아산",
  "서산",
  "당진",
  "공주",
  "보령",
  "논산",
  "계룡",
  "전주",
  "군산",
  "익산",
  "정읍",
  "남원",
  "김제",
  "완주",
  "목포",
  "여수",
  "순천",
  "나주",
  "광양",
  "담양",
  "곡성",
  "구례",
  "포항",
  "경주",
  "김천",
  "안동",
  "구미",
  "영주",
  "영천",
  "상주",
  "문경",
  "창원",
  "진주",
  "통영",
  "사천",
  "김해",
  "밀양",
  "거제",
  "양산",
  "제주",
  "제주시",
  "서귀포",
];

/* ===== 코드 매핑 ===== */
function codeToEmoji(code?: number | null) {
  if (code == null) return "🌤️";
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65].includes(code)) return "🌧️";
  if ([66, 67].includes(code)) return "🌧️";
  if ([80, 81, 82].includes(code)) return "🌦️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}
function codeToText(code?: number | null) {
  if (code == null) return "알 수 없음";
  const m: Record<string, string> = {
    "0": "맑음",
    "1": "대체로 맑음",
    "2": "부분적 구름",
    "3": "흐림",
    "45": "안개",
    "48": "착빙 안개",
    "51": "이슬비 약함",
    "53": "이슬비",
    "55": "이슬비 강함",
    "61": "비 약함",
    "63": "비",
    "65": "비 강함",
    "66": "어는 비 약함",
    "67": "어는 비 강함",
    "71": "눈 약함",
    "73": "눈",
    "75": "눈 강함",
    "77": "싸락눈",
    "80": "소나기 약함",
    "81": "소나기",
    "82": "소나기 강함",
    "85": "소낙눈 약함",
    "86": "소낙눈 강함",
    "95": "뇌우",
    "96": "뇌우(우박 가능)",
    "99": "강한 뇌우(우박)",
  };
  return m[String(code)] ?? "알 수 없음";
}

/* ===== 지오코딩 보조 ===== */
const GEO_ALIASES: Record<string, string[]> = {
  서울: ["서울", "Seoul", "Seoul-si"],
  천안: ["천안", "천안시", "Cheonan", "Cheonan-si"],
  천안시: ["천안시", "천안", "Cheonan", "Cheonan-si"],
  제주: ["제주", "제주시", "Jeju", "Jeju-si", "Jeju City"],
  제주시: ["제주시", "Jeju-si", "Jeju City", "Jeju"],
  서귀포: ["서귀포", "Seogwipo", "Seogwipo-si"],
  수원: ["수원", "Suwon", "Suwon-si"],
  "광주(경기)": ["광주", "Gwangju-si"],
  광주: ["광주", "Gwangju", "Gwangju-si", "Gwangju Metropolitan City"],
};
function expandKoRegionQueries(nameKo: string): string[] {
  const base = (nameKo ?? "").trim();
  const stripped = base.replace(/\(.+?\)/g, "").trim();
  const withSi = stripped.endsWith("시") ? stripped : `${stripped}시`;
  const aliases = GEO_ALIASES[stripped] ?? GEO_ALIASES[base] ?? [];
  return Array.from(new Set([stripped, withSi, ...aliases].filter(Boolean)));
}

/* ===== API ===== */
async function geocodeSmart(name: string): Promise<GeoResult | null> {
  const queries = expandKoRegionQueries(name);
  for (const q of queries) {
    // KR 우선
    {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        q
      )}&count=1&language=ko&format=json&countryCode=KR`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const r = json?.results?.[0];
        if (r)
          return {
            name: r.name,
            country: r.country,
            latitude: r.latitude,
            longitude: r.longitude,
          };
      }
    }
    // 글로벌 백업
    {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        q
      )}&count=1&language=ko&format=json`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const r = json?.results?.[0];
        if (r)
          return {
            name: r.name,
            country: r.country,
            latitude: r.latitude,
            longitude: r.longitude,
          };
      }
    }
  }
  return null;
}
async function fetchCurrent(
  lat: number,
  lon: number
): Promise<CurrentWeather | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=${encodeURIComponent(
    KST_TZ
  )}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const c = json?.current;
  if (!c) return null;
  return { temperature_2m: c.temperature_2m, weather_code: c.weather_code };
}

/* ===== 시간/캐시 ===== */
function nowKSTDate() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: KST_TZ }));
}
function minutesDiff(a: Date, b: Date) {
  return Math.abs((a.getTime() - b.getTime()) / 60000);
}
type CacheShape = Record<string, { temp: number; code: number; ts: string }>;
function readCache(): CacheShape {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LS_CACHE_KEY) || "{}") as CacheShape;
  } catch {
    return {};
  }
}
function writeCache(cache: CacheShape) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_CACHE_KEY, JSON.stringify(cache));
}

/* ===== 컴포넌트 ===== */
type Props = {
  defaultRegion?: string;
  className?: string;
  buttonEmojiFallback?: string;
  ariaLabel?: string;
};
export default function WeatherCard({
  defaultRegion = "서울",
  className,
  buttonEmojiFallback = "🌤️",
  ariaLabel = "날씨 보기",
}: Props) {
  // 저장된 지역
  const [region, setRegion] = useState<string>(() => {
    if (typeof window === "undefined") return defaultRegion;
    return localStorage.getItem(LS_REGION_KEY) ?? defaultRegion;
  });

  // 표시 상태
  const [city, setCity] = useState<string>("");
  const [temp, setTemp] = useState<number | null>(null);
  const [code, setCode] = useState<number | null>(null);
  const [lastTs, setLastTs] = useState<string | null>(null);

  // UI 상태
  const [open, setOpen] = useState(false);
  const [openCombo, setOpenCombo] = useState(false);
  const [selected, setSelected] = useState<string>(region);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 버튼 이모지 & 라벨
  const emoji = useMemo(
    () => (code != null ? codeToEmoji(code) : buttonEmojiFallback),
    [code, buttonEmojiFallback]
  );

  // 초기 로드/캐시
  useEffect(() => {
    const r =
      typeof window !== "undefined"
        ? localStorage.getItem(LS_REGION_KEY)
        : null;
    const chosen = r ?? defaultRegion;
    setRegion(chosen);
    setSelected(chosen);

    const cache = readCache();
    const c = cache[chosen];
    if (c) {
      setCity(chosen);
      setTemp(c.temp);
      setCode(c.code);
      setLastTs(c.ts);
      if (minutesDiff(nowKSTDate(), new Date(c.ts)) > CACHE_TTL_MIN) {
        void saveAndLoad(chosen, { silent: true });
      }
    } else {
      void saveAndLoad(chosen, { silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveAndLoad(labelKo: string, opts?: { silent?: boolean }) {
    if (!labelKo) return;
    if (!opts?.silent) setLoading(true);
    setErr("");
    try {
      const g = await geocodeSmart(labelKo.trim());
      if (!g) {
        setErr("지역을 찾을 수 없어요 (예: 서울, 천안)");
        return;
      }
      const cw = await fetchCurrent(g.latitude, g.longitude);
      if (!cw) {
        setErr("날씨 정보를 불러올 수 없어요");
        return;
      }

      const clean = labelKo.trim();
      setRegion(clean);
      setCity(clean);
      setTemp(cw.temperature_2m);
      setCode(cw.weather_code);
      const ts = nowKSTDate().toISOString();
      setLastTs(ts);

      if (typeof window !== "undefined") {
        localStorage.setItem(LS_REGION_KEY, clean);
        const cache = readCache();
        cache[clean] = { temp: cw.temperature_2m, code: cw.weather_code, ts };
        writeCache(cache);
      }
      if (!opts?.silent) setOpen(false);
    } catch {
      setErr("네트워크 오류가 발생했어요");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  // Enter 저장
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      if (openCombo) {
        setOpenCombo(false);
        return;
      }
      if (selected) void saveAndLoad(selected);
    }
  };

  const handleOpen = () => {
    setSelected(region);
    setErr("");
    setOpen(true);
  };

  // 라벨
  const label = useMemo(
    () =>
      city && temp != null ? `${city} · ${Math.round(temp)}°` : city || "날씨",
    [city, temp]
  );

  const lastUpdatedText = lastTs
    ? new Date(lastTs).toLocaleString("ko-KR", { timeZone: KST_TZ })
    : "-";

  return (
    <>
      {/* ── Trigger: ghost + 라디얼 호버 + Tooltip (통일) ── */}
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-flex", className)}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "relative h-10 w-10 transition-all",
                  "before:pointer-events-none before:absolute before:inset-0",
                  "before:opacity-0 hover:before:opacity-100 before:transition-opacity",
                  "before:bg-[radial-gradient(120px_80px_at_50%_-20%,rgba(135,206,235,0.35),transparent_60%)]"
                )}
                aria-label={ariaLabel}
                onClick={handleOpen}
              >
                <span className="leading-none text-[22px]" aria-hidden>
                  {emoji}
                </span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* ── Dialog: 우상단 X, 스티키 헤더/푸터 ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "w-[calc(100vw-2rem)] sm:max-w-[520px] rounded-2xl",
            "p-4 sm:p-6",
            "max-h-[85vh] overflow-y-auto"
          )}
          onKeyDown={onKeyDown}
        >
          {/* 닫기(X) */}
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-9 w-9 rounded-full"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>

          {/* 헤더 (sticky) */}
          <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 px-4 pt-4 pb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-t-2xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
                현재 날씨{" "}
                <span className="text-lg" aria-hidden>
                  {emoji}
                </span>
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* 본문 */}
          <div className="space-y-4">
            {/* 상세 정보 카드 */}
            <div className="rounded-lg border p-3 bg-white/60 dark:bg-zinc-900/40">
              <div className="text-sm text-neutral-500">지역</div>
              <div className="text-base font-semibold">{city || region}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-white/70 dark:bg-zinc-900/50 p-2 border">
                  <div className="text-neutral-500">온도</div>
                  <div className="text-lg font-semibold">
                    {temp != null ? `${Math.round(temp)}°C` : "—"}
                  </div>
                </div>
                <div className="rounded-md bg-white/70 dark:bg-zinc-900/50 p-2 border">
                  <div className="text-neutral-500">상태</div>
                  <div className="text-lg font-semibold">
                    {codeToText(code)}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-neutral-500">
                업데이트: {lastUpdatedText}
              </div>
              {err && <div className="mt-2 text-xs text-rose-600">{err}</div>}
            </div>

            {/* 지역 선택 */}
            <div className="space-y-2">
              <div className="text-xs text-neutral-500">지역 변경</div>
              <Popover open={openCombo} onOpenChange={setOpenCombo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombo}
                    className="w-full justify-between"
                  >
                    {selected ? selected : "지역을 선택하세요"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  onWheel={(e) => e.stopPropagation()}
                >
                  <Command>
                    <CommandInput placeholder="예: 서울, 천안, 파주…" />
                    <CommandList className="max-h-64 overflow-y-auto">
                      <CommandEmpty>검색 결과가 없어요</CommandEmpty>
                      <CommandGroup>
                        {REGIONS.map((label) => (
                          <CommandItem
                            key={label}
                            value={label}
                            onSelect={(v) => setSelected(v)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selected === label ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* 푸터 (sticky) */}
          <div className="sticky bottom-0 mt-4 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-b-2xl">
            <DialogFooter className="sm:justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => saveAndLoad(selected)}
                disabled={loading || !selected}
                className="h-10"
              >
                {loading ? "저장 중…" : "저장"}
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" className="h-10">
                  닫기
                </Button>
              </DialogClose>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
