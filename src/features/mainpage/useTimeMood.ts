// src/theme/useTimeMood.ts
import { useEffect, useMemo, useState } from "react";
import { TIME_MOODS, type TimeMood } from "./timeMoods";

const inRange = (h: number, [start, end]: [number, number]) => {
  return start <= end ? h >= start && h < end : h >= start || h < end;
};

function pickLine(mood: TimeMood) {
  const pool = [mood.line, ...(mood.altLines ?? [])];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function useTimeMood(refreshMs = 60_000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);

  const mood = useMemo(() => {
    const hour = now.getHours();
    return TIME_MOODS.find((m) => inRange(hour, m.range)) ?? TIME_MOODS[0];
  }, [now]);

  const line = useMemo(() => pickLine(mood), [mood]);

  return { mood, line, hour: now.getHours(), now };
}
