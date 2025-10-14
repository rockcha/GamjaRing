import type { Account, Product } from "./api";

export const KST_OFFSET_MIN = 9 * 60;

/** KST now */
export function nowInKST(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + KST_OFFSET_MIN * 60000);
}

export function yyyymmdd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function toKSTDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00+09:00");
}

/** 공통 납입 시간창: 09:00~18:00(KST) */
export function isDepositWindowOpen(d: Date = nowInKST()): boolean {
  const total = d.getHours() * 60 + d.getMinutes();
  const start = 9 * 60;
  const end = 18 * 60;
  return total >= start && total < end;
}

/** 가입일 D0, D1부터 납입 */
export function isTodayDue(account: Account): boolean {
  const base = toKSTDate(account.started_date);
  const due = new Date(base);
  due.setDate(due.getDate() + account.current_day);
  return yyyymmdd(due) === yyyymmdd(nowInKST());
}

/** 진행도 계산 */
export function getProgress(account: Account, product: Product) {
  const total = product.term_days;
  const done = Math.min(account.paid_days, total);
  const pct = Math.round((done / total) * 100);
  return { total, done, pct };
}
