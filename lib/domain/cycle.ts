// COM-021 / COM-010 購入サイクル算出。
// 「1個あたり消費日数」ベースでロット差を吸収する。
// next_order_date は「今回購入日」が起点（[[decisions/2026-06-26-next-order-date-uses-purchase-date]]）。
import { addDays, diffInDays } from "@/lib/common/date";
import { safeDivide } from "@/lib/common/number";
import type { ProductStatus, ProductType } from "@/lib/domain/product-state";

// 1個あたり消費日数 = 購入間隔(前回→今回) ÷ 前回 total_units。
export function perUnitCycleDays(intervalDays: number, prevTotalUnits: number): number {
  return safeDivide(intervalDays, prevTotalUnits, "サイクル");
}

// next_order_date = 今回購入日 + round(per_unit_cycle_days × 今回 total_units)。
export function nextOrderDate(
  purchaseDate: Date,
  perUnit: number,
  currentTotalUnits: number,
): Date {
  return addDays(purchaseDate, Math.round(perUnit * currentTotalUnits));
}

export type CycleInput = {
  type: ProductType;
  cycleMode: "auto" | "manual";
  manualPerUnitDays?: number | null; // manual時の固定値
  prev: { purchasedAt: Date; totalUnits: number } | null; // 直近の前回購入（無ければ初回）
  current: { purchasedAt: Date; totalUnits: number };
};

export type CycleResult = {
  status: ProductStatus;
  // auto時に算出した参考値。products.per_unit_cycle_days を更新するのは auto のときのみ。
  perUnitCycleDays: number | null;
  nextOrderDate: Date | null;
};

// 購入時のサイクル/状態を算出する純粋関数。
// - spot は走らせない（status idle、サイクルなし）。
// - recurring & 初回(prev=null) → idle（間隔不明。2回目で確定）。
// - recurring & 2回目以降:
//     auto   → perUnit を実績から算出、next を今回購入日基準で、status tracking。
//     manual → perUnit は手動固定値、next を今回購入日 + manual×今回total、status tracking。
export function computeCycleOnPurchase(input: CycleInput): CycleResult {
  if (input.type === "spot") {
    return { status: "idle", perUnitCycleDays: null, nextOrderDate: null };
  }
  if (input.prev === null) {
    // 初回購入。サイクル未確定。
    return { status: "idle", perUnitCycleDays: null, nextOrderDate: null };
  }

  const interval = diffInDays(input.prev.purchasedAt, input.current.purchasedAt);

  if (input.cycleMode === "manual") {
    const manual = input.manualPerUnitDays;
    if (manual == null) {
      // 手動値未設定なら次回日は出せない（tracking だが next は null）。
      return { status: "tracking", perUnitCycleDays: null, nextOrderDate: null };
    }
    return {
      status: "tracking",
      perUnitCycleDays: null, // manual時は products の per_unit を上書きしない（手動値を保持）
      nextOrderDate: nextOrderDate(input.current.purchasedAt, manual, input.current.totalUnits),
    };
  }

  // auto
  const perUnit = perUnitCycleDays(interval, input.prev.totalUnits);
  return {
    status: "tracking",
    perUnitCycleDays: perUnit,
    nextOrderDate: nextOrderDate(input.current.purchasedAt, perUnit, input.current.totalUnits),
  };
}
