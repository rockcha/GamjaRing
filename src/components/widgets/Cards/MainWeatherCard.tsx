// src/components/widgets/Cards/MainWeatherCard.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const KST_TZ = "Asia/Seoul";
const LS_REGION_KEY = "weather_region";
const CACHE_TTL_MS = 15 * 60 * 1000;

type WeatherRegion = {
  label: string;
  latitude: number;
  longitude: number;
};

type WeatherSnapshot = {
  region: string;
  temperature: number;
  precipitationProbability: number | null;
  pm10: number | null;
  pm25: number | null;
  updatedAt: string;
};

const REGIONS: WeatherRegion[] = [
  { label: "서울", latitude: 37.5665, longitude: 126.978 },
  { label: "부산", latitude: 35.1796, longitude: 129.0756 },
  { label: "대구", latitude: 35.8714, longitude: 128.6014 },
  { label: "인천", latitude: 37.4563, longitude: 126.7052 },
  { label: "광주", latitude: 35.1595, longitude: 126.8526 },
  { label: "대전", latitude: 36.3504, longitude: 127.3845 },
  { label: "울산", latitude: 35.5384, longitude: 129.3114 },
  { label: "세종", latitude: 36.4801, longitude: 127.289 },
  { label: "수원", latitude: 37.2636, longitude: 127.0286 },
  { label: "파주", latitude: 37.7599, longitude: 126.7802 },
  { label: "천안", latitude: 36.8151, longitude: 127.1139 },
  { label: "청주", latitude: 36.6424, longitude: 127.489 },
  { label: "전주", latitude: 35.8242, longitude: 127.148 },
  { label: "포항", latitude: 36.019, longitude: 129.3435 },
  { label: "창원", latitude: 35.228, longitude: 128.6811 },
  { label: "제주", latitude: 33.4996, longitude: 126.5312 },
];

function dustGrade(pm10?: number | null, pm25?: number | null) {
  if (pm10 == null && pm25 == null) return "확인 중";

  const score = Math.max(
    pm10 == null ? 0 : pm10 <= 30 ? 1 : pm10 <= 80 ? 2 : pm10 <= 150 ? 3 : 4,
    pm25 == null ? 0 : pm25 <= 15 ? 1 : pm25 <= 35 ? 2 : pm25 <= 75 ? 3 : 4,
  );

  if (score <= 1) return "좋음";
  if (score === 2) return "보통";
  if (score === 3) return "나쁨";
  return "매우 나쁨";
}

function readSavedRegion() {
  if (typeof window === "undefined") return REGIONS[0].label;
  return localStorage.getItem(LS_REGION_KEY) ?? REGIONS[0].label;
}

function readCache(region: string): WeatherSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`main_weather:${region}`);
    if (!raw) return null;

    const cached = JSON.parse(raw) as WeatherSnapshot;
    if (Date.now() - new Date(cached.updatedAt).getTime() > CACHE_TTL_MS) {
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

function writeCache(snapshot: WeatherSnapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_REGION_KEY, snapshot.region);
  localStorage.setItem(
    `main_weather:${snapshot.region}`,
    JSON.stringify(snapshot),
  );
}

async function geocodeRegion(region: string): Promise<WeatherRegion | null> {
  const known = REGIONS.find((item) => item.label === region);
  if (known) return known;

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    region,
  )}&count=1&language=ko&format=json&countryCode=KR`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const json = await response.json();
  const result = json?.results?.[0];
  if (!result) return null;

  return {
    label: region,
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

function getNearestHourlyValue(
  times?: string[],
  values?: Array<number | null>,
): number | null {
  if (!times?.length || !values?.length) return null;

  const now = Date.now();
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  times.forEach((time, index) => {
    const distance = Math.abs(new Date(time).getTime() - now);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return values[bestIndex] ?? null;
}

async function fetchWeather(region: string): Promise<WeatherSnapshot> {
  const location = await geocodeRegion(region);
  if (!location) throw new Error("위치를 찾을 수 없어요.");

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m&hourly=precipitation_probability&forecast_days=1&timezone=${encodeURIComponent(
    KST_TZ,
  )}`;
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.latitude}&longitude=${location.longitude}&current=pm10,pm2_5&timezone=${encodeURIComponent(
    KST_TZ,
  )}`;

  const [weatherResponse, airResponse] = await Promise.all([
    fetch(weatherUrl),
    fetch(airUrl),
  ]);

  if (!weatherResponse.ok) throw new Error("날씨를 불러올 수 없어요.");

  const weatherJson = await weatherResponse.json();
  const airJson = airResponse.ok ? await airResponse.json() : null;

  return {
    region: location.label,
    temperature: weatherJson.current.temperature_2m,
    precipitationProbability: getNearestHourlyValue(
      weatherJson?.hourly?.time,
      weatherJson?.hourly?.precipitation_probability,
    ),
    pm10: airJson?.current?.pm10 ?? null,
    pm25: airJson?.current?.pm2_5 ?? null,
    updatedAt: new Date().toISOString(),
  };
}

export default function MainWeatherCard({ className }: { className?: string }) {
  const [region, setRegion] = useState(readSavedRegion);
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextRegion: string, force = false) => {
    setRegion(nextRegion);
    setError(null);

    const cached = !force ? readCache(nextRegion) : null;
    if (cached) {
      setSnapshot(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const next = await fetchWeather(nextRegion);
      writeCache(next);
      setSnapshot(next);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "날씨를 불러올 수 없어요.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(readSavedRegion());
  }, [load]);

  const dust = useMemo(
    () => dustGrade(snapshot?.pm10, snapshot?.pm25),
    [snapshot?.pm10, snapshot?.pm25],
  );

  const updatedText = snapshot?.updatedAt
    ? new Date(snapshot.updatedAt).toLocaleTimeString("ko-KR", {
        timeZone: KST_TZ,
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  return (
    <Card
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm",
        className,
      )}
      role="region"
      aria-label="오늘의 날씨"
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-base ring-1 ring-slate-100">
              ☁️
            </span>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-slate-900">
                오늘의 날씨
              </div>
              <div className="mt-0.5 truncate text-xs text-slate-500">
                {loading ? "불러오는 중" : error ?? `업데이트 ${updatedText}`}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={() => load(region, true)}
            disabled={loading}
            aria-label="날씨 새로고침"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-3 gap-2">
          <WeatherMetric
            emoji="🌡️"
            label="기온"
            value={snapshot ? `${Math.round(snapshot.temperature)}°` : "--"}
          />
          <WeatherMetric emoji="😷" label="미세먼지" value={dust} />
          <WeatherMetric
            emoji="☔"
            label="강수확률"
            value={
              snapshot?.precipitationProbability == null
                ? "--"
                : `${Math.round(snapshot.precipitationProbability)}%`
            }
          />
        </div>

        <div className="mt-auto flex items-center gap-2">
          <select
            value={region}
            onChange={(event) => void load(event.target.value, true)}
            className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none transition focus:ring-2 focus:ring-slate-200"
            aria-label="날씨 위치 선택"
          >
            {REGIONS.map((item) => (
              <option key={item.label} value={item.label}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
}

function WeatherMetric({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-center">
      <span className="text-3xl leading-none" aria-hidden>
        {emoji}
      </span>
      <div className="mt-2 flex min-w-0 items-center gap-1.5">
        <span className="truncate text-xs font-medium text-slate-500">
          {label}
        </span>
      </div>
      <div className="mt-1 truncate text-xl font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}
