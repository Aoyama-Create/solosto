// COM-101 日付・タイムゾーンユーティリティ。
// サイクル算出（日数差・次回日付）と通知バッチ（UTC→ユーザー timezone の時刻判定）で使う純粋関数。

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// 日付を UTC の 0時 に丸めた時刻（ms）。暦日差を安定して測るため。
function toUtcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// 暦日の差（to - from）。同日=0、翌日=1。
export function diffInDays(from: Date, to: Date): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / MS_PER_DAY);
}

// n 日後（n 負で過去）。元の Date は変更しない。
export function addDays(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

// 指定タイムゾーンでの「時」(0-23)。毎時バッチが notify_time と一致判定するのに使う。
export function getHourInTimeZone(date: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  }).format(date);
  // "24" を 0 に正規化（環境差対策）。
  return Number(hour) % 24;
}

// 指定タイムゾーンでの暦日 'YYYY-MM-DD'。next_order_date<=今日 の判定などに使う。
export function formatDateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
