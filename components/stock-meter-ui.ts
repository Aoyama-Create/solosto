// 在庫メーターの表示ヘルパ（トップ買うもの・商品一覧で共有）。
// 算出は lib/domain/stock-meter.ts（純粋・テスト済）。ここは表示文言/色のみ。

import type { UrgencyLevel } from "@/lib/domain/stock-meter";

// メーターバーの色（Mantine カラーキー）。
export const METER_COLOR: Record<UrgencyLevel, string> = {
  overdue: "alert",
  soon: "primary",
  ok: "success",
  manual: "gray",
};

// 残り日数の文言。
export function remainingLabel(daysRemaining: number | null): string {
  if (daysRemaining === null) return "リストに追加済み";
  if (daysRemaining < 0) return `予定を${-daysRemaining}日超過`;
  if (daysRemaining === 0) return "今日まで";
  return `あと${daysRemaining}日`;
}

// 残り日数テキストの色（緊急度）。
export function remainingColor(level: UrgencyLevel): string {
  return level === "overdue" ? "alert" : level === "soon" ? "primary" : "dimmed";
}
