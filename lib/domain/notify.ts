// Phase 6b 通知バッチの純粋ロジック（副作用なし＝Vitest 可能）。
// DB 取得・送信・保存は app/api/cron/route.ts が担う。タイミング判定は lib/common/date.ts を再利用。

import { getHourInTimeZone } from "@/lib/common/date";

// notify_time（'HH:MM:SS' or 'HH:MM'）から時(0-23)を取り出す。
function notifyHour(notifyTime: string): number {
  const h = Number(notifyTime.slice(0, 2));
  return Number.isFinite(h) ? h % 24 : -1;
}

// 「今がこのユーザーの通知時刻か」。毎時 Cron が UTC の now を各ユーザー timezone の時に変換して一致判定。
export function userFiresNow(notifyTime: string | null, timezone: string, now: Date): boolean {
  if (!notifyTime) return false;
  return getHourInTimeZone(now, timezone) === notifyHour(notifyTime);
}

// 発火式（システム定義書 2.8）の入力。today は 'YYYY-MM-DD'（ユーザー TZ の暦日）。
export type FiringProduct = {
  name: string;
  type: "recurring" | "spot";
  isNotifyEnabled: boolean;
  notifySnoozedUntil: string | null; // 'YYYY-MM-DD'
  nextOrderDate: string | null; // 'YYYY-MM-DD'
  categoryId: string | null;
};
export type FiringCategory = {
  id: string;
  name: string;
  trackingScope: "product" | "category";
  isNotifyEnabled: boolean;
  notifySnoozedUntil: string | null;
  nextOrderDate: string | null;
};

// 発火条件: enabled かつ スヌーズ外（snooze null or today>snooze）かつ next_order_date<=today。
function fires(
  enabled: boolean,
  snoozedUntil: string | null,
  nextOrderDate: string | null,
  today: string,
): boolean {
  if (!enabled) return false;
  if (snoozedUntil && !(today > snoozedUntil)) return false; // スヌーズ中
  if (!nextOrderDate) return false;
  return nextOrderDate <= today;
}

// COM-050 通知対象抽出。発火式＋tracking_scope 分岐（COM-016）。
// - category-scope: カテゴリが subject（カテゴリ名）。配下商品は除外。
// - それ以外: 商品が subject（商品名）。recurring のみ。
// 返り値は通知本文に出す名前の配列。
export function selectFiringNames(input: {
  products: FiringProduct[];
  categories: FiringCategory[];
  today: string;
}): string[] {
  const { products, categories, today } = input;
  const scopeById = new Map(categories.map((c) => [c.id, c.trackingScope]));
  const names: string[] = [];

  // category-scope カテゴリ（銘柄横断・カテゴリ属性で判定）。
  for (const c of categories) {
    if (c.trackingScope !== "category") continue;
    if (fires(c.isNotifyEnabled, c.notifySnoozedUntil, c.nextOrderDate, today)) names.push(c.name);
  }

  // 商品（category-scope 配下は除外＝カテゴリ側で代表）。recurring のみ。
  for (const p of products) {
    if (p.type !== "recurring") continue;
    const scope = p.categoryId ? scopeById.get(p.categoryId) : undefined;
    if (scope === "category") continue;
    if (fires(p.isNotifyEnabled, p.notifySnoozedUntil, p.nextOrderDate, today)) names.push(p.name);
  }

  return names;
}

// COM-041 通知生成。タイトルは件数、本文は商品名羅列（多い時は先頭3件＋ほかN件）。
export function buildReminderNotification(names: string[]): { title: string; body: string } {
  const title = `買うべきもの ${names.length}件`;
  const HEAD = 3;
  const body =
    names.length <= HEAD
      ? names.join("・")
      : `${names.slice(0, HEAD).join("・")} ほか${names.length - HEAD}件`;
  return { title, body };
}
