// 在庫メーター・緊急度（SCR-030 案C）。消費サイクルの残量を可視化し、緊急度で並べる。
// 派生表示なので専用カラムを持たず next_order_date / 最終購入日から都度算出する。
import { diffInDays } from "@/lib/common/date";

export type UrgencyLevel = "overdue" | "soon" | "ok" | "manual";

export type StockMeter = {
  level: UrgencyLevel;
  daysRemaining: number | null; // 負=超過。manual は null
  fillRatio: number | null; // 残量 0..1。manual は null
  cycleWindowDays: number | null; // 前ロットの想定寿命（サイクル表示用）
};

const SOON_THRESHOLD_DAYS = 3;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function computeStockMeter(input: {
  nextOrderDate: Date | null;
  lastPurchasedAt: Date | null;
  today: Date;
}): StockMeter {
  // サイクル未確定（手動投入のみ等）→ メーター無し。
  if (!input.nextOrderDate) {
    return { level: "manual", daysRemaining: null, fillRatio: null, cycleWindowDays: null };
  }

  const daysRemaining = diffInDays(input.today, input.nextOrderDate);
  const cycleWindowDays = input.lastPurchasedAt
    ? diffInDays(input.lastPurchasedAt, input.nextOrderDate)
    : null;

  let fillRatio: number | null = null;
  if (cycleWindowDays != null && cycleWindowDays > 0) {
    fillRatio = clamp01(daysRemaining / cycleWindowDays);
  } else if (cycleWindowDays != null) {
    fillRatio = 0; // 窓が0以下は残量0扱い
  }

  const level: UrgencyLevel =
    daysRemaining < 0 ? "overdue" : daysRemaining <= SOON_THRESHOLD_DAYS ? "soon" : "ok";

  return { level, daysRemaining, fillRatio, cycleWindowDays };
}

const LEVEL_ORDER: Record<UrgencyLevel, number> = { overdue: 0, soon: 1, ok: 2, manual: 3 };

// 緊急度ソート: overdue → soon → ok → manual。同レベルは daysRemaining 昇順（より切迫が先）。
export function compareUrgency(a: StockMeter, b: StockMeter): number {
  if (LEVEL_ORDER[a.level] !== LEVEL_ORDER[b.level]) {
    return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
  }
  const ar = a.daysRemaining ?? Number.POSITIVE_INFINITY;
  const br = b.daysRemaining ?? Number.POSITIVE_INFINITY;
  return ar - br;
}
