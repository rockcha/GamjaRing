// src/features/time-capsule/date-time-picker.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";

type Props = {
  value: Date | null; // 현재 값 (로컬 시간대)
  onChange: (v: Date | null) => void; // 값 변경 콜백
  min?: Date; // 허용 최소 시각 (기본: now)
  disabled?: boolean;
  className?: string;
};

/* ───────── Utils (safe split) ───────── */
function split3(s: string, delim: string): [string, string, string] | null {
  const parts = s.split(delim);
  return parts.length === 3 ? (parts as [string, string, string]) : null;
}
function split2(s: string, delim: string): [string, string] | null {
  const parts = s.split(delim);
  return parts.length === 2 ? (parts as [string, string]) : null;
}
const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

function clampTo5min(d: Date) {
  const n = new Date(d);
  const m = n.getMinutes();
  const rounded = Math.ceil(m / 5) * 5;
  n.setMinutes(rounded % 60, 0, 0);
  if (rounded >= 60) n.setHours(n.getHours() + 1);
  return n;
}
function isBefore(a: Date, b: Date) {
  return a.getTime() < b.getTime();
}

/** YYYY-MM-DD 문자열 유효성 */
function isValidDateStr(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const parts = split3(s, "-");
  if (!parts) return false;
  const [yStr, mStr, dStr] = parts;
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d))
    return false;
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}

/** HH:mm 문자열 유효성 */
function isValidTimeStr(s: string) {
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const parts = split2(s, ":");
  if (!parts) return false;
  const [hhStr, mmStr] = parts;
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return false;
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

/** dateStr + timeStr → Date (로컬) */
function composeDate(dateStr: string, timeStr: string) {
  if (!isValidDateStr(dateStr) || !isValidTimeStr(timeStr)) return null;
  const dParts = split3(dateStr, "-")!;
  const tParts = split2(timeStr, ":")!;
  const y = Number(dParts[0]);
  const m = Number(dParts[1]);
  const d = Number(dParts[2]);
  const hh = Number(tParts[0]);
  const mm = Number(tParts[1]);
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

/** Date → {dateStr, timeStr} */
function splitDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}`;
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { dateStr, timeStr };
}

/** 숫자 타이핑 → YYYY-MM-DD 자동 포맷 */
function normalizeDateTyping(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export default function DateTimePicker({
  value,
  onChange,
  min,
  disabled,
  className,
}: Props) {
  const nowRef = React.useRef(new Date());
  const now = nowRef.current;
  const minDate = min ?? now;

  // 내부 입력 상태 (문자열)
  const initial = value ?? clampTo5min(new Date());
  const { dateStr: initDate, timeStr: initTime } = splitDate(initial);

  const [dateStr, setDateStr] = React.useState(initDate);
  const [timeStr, setTimeStr] = React.useState(initTime);
  const [err, setErr] = React.useState<string>("");

  // 외부 value가 바뀌면 입력 동기화
  React.useEffect(() => {
    if (!value) return;
    const v = new Date(value);
    const { dateStr: ds, timeStr: ts } = splitDate(v);
    setDateStr(ds);
    setTimeStr(ts);
  }, [value]);

  const applyChange = React.useCallback(
    (
      nextDateStr: string,
      nextTimeStr: string,
      opts?: { clamp5?: boolean; enforceMin?: boolean }
    ) => {
      setErr("");

      // 형식이 완성되지 않았으면 입력만 반영
      if (!isValidDateStr(nextDateStr) || !isValidTimeStr(nextTimeStr)) {
        setDateStr(nextDateStr);
        setTimeStr(nextTimeStr);
        return;
      }

      let dt = composeDate(nextDateStr, nextTimeStr)!;
      if (opts?.clamp5) dt = clampTo5min(dt);

      if (opts?.enforceMin && isBefore(dt, minDate)) {
        dt = new Date(minDate);
        const { dateStr: ds, timeStr: ts } = splitDate(dt);
        setDateStr(ds);
        setTimeStr(ts);
        setErr("현재 시각 이후로만 설정할 수 있어요. 자동 보정했습니다.");
      } else {
        setDateStr(nextDateStr);
        setTimeStr(nextTimeStr);
      }

      onChange(dt);
    },
    [minDate, onChange]
  );

  const handleBlur = () => {
    applyChange(dateStr, timeStr, { clamp5: true, enforceMin: true });
  };

  // 표시용 정보
  const composed = composeDate(dateStr, timeStr);
  const validFuture: boolean =
    !!composed && composed.getTime() > minDate.getTime();

  let sealText = "올바른 형식으로 입력해 주세요.";
  if (composed) {
    const diffMs = composed.getTime() - now.getTime();
    if (diffMs <= 0) {
      sealText = "현재 시각 이후로만 설정할 수 있어요.";
    } else {
      const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      sealText = `봉인 시간 : ${days}일 ${hours}시간`;
    }
  }

  // 캘린더에서 비활성화할 날짜 (min의 자정 이전은 선택 불가)
  const disableBefore = startOfDay(minDate);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-2 gap-2">
        {/* 날짜: 숫자 입력 + 캘린더 버튼(둘 다 가능) */}
        <div className="space-y-1">
          <div className="text-xs text-neutral-500 px-1">날짜 (YYYY-MM-DD)</div>
          <div className="relative">
            <Input
              value={dateStr}
              onChange={(e) => setDateStr(normalizeDateTyping(e.target.value))}
              onBlur={() => applyChange(dateStr, timeStr, { enforceMin: true })}
              placeholder="2025-12-31"
              inputMode="numeric"
              disabled={disabled}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-0 top-0 h-9 w-9"
                  disabled={disabled}
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="end">
                <Calendar
                  mode="single"
                  selected={
                    isValidDateStr(dateStr) ? new Date(dateStr) : undefined
                  }
                  onSelect={(d) => {
                    if (!d) return;
                    const y = d.getFullYear();
                    const m = `${d.getMonth() + 1}`.padStart(2, "0");
                    const day = `${d.getDate()}`.padStart(2, "0");
                    const ds = `${y}-${m}-${day}`;
                    applyChange(ds, timeStr, { enforceMin: true });
                  }}
                  disabled={(d) => d < disableBefore}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* 시간: HH:mm (숫자 입력) */}
        <div className="space-y-1">
          <div className="text-xs text-neutral-500 px-1">시간 (HH:mm)</div>
          <Input
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
            onBlur={() => handleBlur()}
            placeholder="14:30"
            inputMode="numeric"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-1">
        {err && <p className="text-xs text-rose-600">{err}</p>}
        <p
          className={cn(
            "text-[11px]",
            validFuture ? "text-neutral-600" : "text-neutral-500"
          )}
        >
          {sealText}
        </p>
      </div>
    </div>
  );
}
