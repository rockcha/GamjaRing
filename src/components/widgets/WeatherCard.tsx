// src/components/WeatherCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type GeoResult = {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
};
type CurrentWeather = { temperature_2m: number; weather_code: number };

const KST_TZ = "Asia/Seoul";

// 코드→이모지 (없으면 기본)
function codeToEmoji(code?: number | null) {
  if (code == null) return "🌤️";
  if ([0].includes(code)) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if ([3].includes(code)) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65].includes(code)) return "🌧️";
  if ([80, 81, 82].includes(code)) return "🌦️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

// KR 우선 + 대안 키워드로 재시도 (천안 등)
async function geocodeSmart(name: string): Promise<GeoResult | null> {
  const trials = [
    { q: name, country: "KR" },
    { q: name.endsWith("시") ? name : `${name}시`, country: "KR" },
    { q: "Cheonan", country: "KR" },
    { q: "Cheonan-si", country: "KR" },
    { q: name, country: undefined },
  ];

  for (const t of trials) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      t.q
    )}&count=1&language=ko&format=json${
      t.country ? `&country=${t.country}` : ""
    }`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const json = await res.json();
    const r = json?.results?.[0];
    if (r) {
      return {
        name: r.name,
        country: r.country,
        latitude: r.latitude,
        longitude: r.longitude,
      };
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

// ▼ 콤보박스용 지역 목록 (한글 라벨 고정)
const REGIONS: string[] = [
  // 광역시/도·특별시/특별자치시·도청소재지 위주 + 주요 도시
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

type Props = { defaultRegion?: string };

export default function WeatherCard({ defaultRegion = "서울" }: Props) {
  const [region, setRegion] = useState<string>(() => {
    if (typeof window === "undefined") return defaultRegion;
    return localStorage.getItem("weather_region") ?? defaultRegion;
  });

  // 표시용 상태 (항상 한글 라벨 사용)
  const [city, setCity] = useState<string>(""); // 화면에 보여줄 도시명 (한글 라벨)
  const [temp, setTemp] = useState<number | null>(null);
  const [code, setCode] = useState<number | null>(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [openCombo, setOpenCombo] = useState(false);
  const [selected, setSelected] = useState<string>(region);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const emoji = useMemo(() => codeToEmoji(code), [code]);

  // 저장 후 로드 (표시는 '선택한 한글 라벨'을 그대로 사용)
  const saveAndLoad = async (labelKo: string) => {
    if (!labelKo) return;
    setLoading(true);
    setErr("");
    try {
      const g = await geocodeSmart(labelKo.trim());
      if (!g) {
        setErr("지역을 찾을 수 없어요 (예: 서울, 천안 등)");
        return;
      }
      const cw = await fetchCurrent(g.latitude, g.longitude);
      if (!cw) {
        setErr("날씨 정보를 불러올 수 없어요");
        return;
      }
      // 저장 및 UI 반영: 한글 라벨 유지, '대한민국' 미표시
      const clean = labelKo.trim();
      setRegion(clean);
      if (typeof window !== "undefined") {
        localStorage.setItem("weather_region", clean);
      }
      setCity(clean); // ← r.name 대신 사용자가 고른 '한글 라벨' 고정
      setTemp(Math.round(cw.temperature_2m));
      setCode(cw.weather_code);
      setOpenDialog(false);
    } catch {
      setErr("네트워크 오류가 발생했어요");
    } finally {
      setLoading(false);
    }
  };

  // 최초 로드(있으면)
  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("weather_region")
        : null;
    if (saved) {
      setSelected(saved);
      // 조용히 로드
      saveAndLoad(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enter로 저장 (콤보박스 열려 있으면 먼저 선택 → 다시 Enter로 저장)
  const handleEnterSave = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      // 콤보박스가 열려 있으면 우선 닫고(선택 확정)
      if (openCombo) {
        setOpenCombo(false);
        return;
      }
      if (selected) saveAndLoad(selected);
    }
  };

  return (
    <>
      {/* ▼ 최소 UI 카드: 이모지 + "날씨카드" (테두리/배경 없음) */}
      <button
        type="button"
        onClick={() => {
          setSelected(region);
          setErr("");
          setOpenDialog(true);
        }}
        className="
    group relative inline-flex items-center gap-2
    px-2 py-1 rounded-md
    transition-all duration-200
    hover:bg-neutral-50  hover:-translate-y-0.5
    active:translate-y-0
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 focus-visible:ring-offset-2
  "
        aria-label="날씨카드 설정"
      >
        <span className="text-xl transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
          {emoji}
        </span>
        <span className="text-sm font-medium text-neutral-700 transition-colors group-hover:text-neutral-900">
          {city && temp != null ? `${city} · ${temp}°` : "날씨카드"}
        </span>
      </button>

      {/* ▼ 지역 선택 모달 (Combobox = Popover + Command) */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent
          className="sm:max-w-md"
          onKeyDown={handleEnterSave} // ⏎ 저장
        >
          <DialogHeader>
            <DialogTitle>지역 선택</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-xs text-neutral-500">
              도시를 검색하거나 선택하세요
            </div>

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
                onWheel={(e) => e.stopPropagation()} // 내부 스크롤에 휠 할당
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
                          onSelect={(v) => {
                            setSelected(v);
                            // 선택 후 유지(바로 저장은 버튼/엔터로)
                          }}
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

            {err && <p className="text-xs text-rose-500">{err}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setOpenDialog(false)}>
              닫기
            </Button>
            <Button
              onClick={() => saveAndLoad(selected)}
              disabled={loading || !selected}
            >
              {loading ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
